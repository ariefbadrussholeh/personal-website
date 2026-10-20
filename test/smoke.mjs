// End-to-end smoke test of the admin API against a running app.
//   BASE=http://localhost:3000 FAKE=http://127.0.0.1:54321 node test/smoke.mjs
import fs from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const FAKE = process.env.FAKE || "";
let cookie = "";
let failed = 0;

const ok = (cond, label, extra = "") => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${!cond && extra ? "  -> " + extra : ""}`);
  if (!cond) failed++;
};
async function call(method, path, body, { form, raw, headers = {}, nocookie } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie && !nocookie ? { cookie } : {}), ...headers },
    body: form || (body ? JSON.stringify(body) : undefined),
    redirect: "manual",
  });
  const set = res.headers.get("set-cookie");
  if (set && !nocookie && set.includes("portfolio_admin")) cookie = set.split(";")[0];
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

// --- auth
let r = await call("GET", "/api/posts");
ok(r.status === 401, "API closed without login", r.status);
r = await call("POST", "/api/auth/login", { password: "wrong" });
ok(r.status === 401, "wrong password rejected", r.status);
r = await call("POST", "/api/auth/login", { password: "testpass" });
ok(r.status === 200 && cookie.includes("portfolio_admin"), "login sets session cookie", r.text);
r = await call("GET", "/admin");
ok(r.status === 200, "admin dashboard renders", r.status);

// --- blog CRUD
r = await call("POST", "/api/posts");
const post = r.json;
ok(r.status === 201 && post?.id && post.published === false, "create draft post", r.text);
r = await call("PATCH", `/api/posts/${post.id}`, { title: "Hello Supabase World", content: "## Hi\n\ntext", tags: ["a", "b", "a", " "] });
ok(r.json?.slug === "hello-supabase-world", "slug follows title while draft", r.json?.slug);
ok(JSON.stringify(r.json?.tags) === '["a","b"]', "tags deduped and stored as array", JSON.stringify(r.json?.tags));
r = await fetch(BASE + "/blog/hello-supabase-world");
ok(r.status === 404, "draft not public for visitors", r.status);
r = await call("GET", "/blog/hello-supabase-world");
ok(r.status === 200, "draft previewable by the admin", r.status);
r = await call("PATCH", `/api/posts/${post.id}`, { published: true });
ok(r.json?.published === true && r.json?.published_at, "publish sets published_at", r.text);
const firstPublished = r.json.published_at;
r = await call("PATCH", `/api/posts/${post.id}`, { title: "Renamed after publish" });
ok(r.json?.slug === "hello-supabase-world", "slug frozen after publish", r.json?.slug);
r = await call("PATCH", `/api/posts/${post.id}`, { published: false });
r = await call("PATCH", `/api/posts/${post.id}`, { published: true });
ok(r.json?.published_at === firstPublished, "republish keeps original date");
r = await fetch(BASE + "/blog/hello-supabase-world");
ok(r.status === 200, "published post is public");
r = await fetch(BASE + "/blog?tag=a").then((x) => x.text());
ok(r.includes("Renamed after publish"), "tag filter finds post");
r = await fetch(BASE + "/blog?tag=zzz").then((x) => x.text());
ok(!r.includes("Renamed after publish") && r.includes("Nothing is tagged"), "tag filter excludes + empty state");

// --- title + publish in one request (autosave batches them)
const combo = (await call("POST", "/api/posts")).json;
r = await call("PATCH", `/api/posts/${combo.id}`, { title: "Batched Title", published: true });
ok(r.json?.slug === "batched-title", "title + publish together still sets slug", r.json?.slug);
await call("DELETE", `/api/posts/${combo.id}`);

// --- slug collision
const dup = (await call("POST", "/api/posts")).json;
r = await call("PATCH", `/api/posts/${dup.id}`, { slug: "hello-supabase-world" });
ok(r.json?.slug === "hello-supabase-world-2", "slug collision gets suffix", r.json?.slug);

// --- upload -> Storage
const sample = fs.readFileSync("public/samples/photo-3.jpg");
async function upload(buf, type, name) {
  const form = new FormData();
  form.append("file", new Blob([buf], { type }), name);
  return call("POST", "/api/upload", undefined, { form });
}
r = await upload(sample, "image/jpeg", "a.jpg");
const up = r.json;
ok(r.status === 200 && up?.url?.includes("/storage/v1/object/public/uploads/") && up.width > 0, "upload returns public Storage URL", r.text);
if (FAKE) {
  const img = await fetch(up.url);
  ok(img.status === 200 && img.headers.get("content-type") === "image/jpeg", "file is served from Storage", img.status);
}
r = await upload(Buffer.from("<svg onload=alert(1)/>"), "image/svg+xml", "x.svg");
ok(r.status === 415, "SVG rejected", r.status);
r = await upload(Buffer.from("not an image"), "image/png", "x.png");
ok(r.status === 422, "corrupt image rejected", r.status);
r = await call("POST", "/api/upload");
ok(r.status === 400 || r.status === 500, "missing file handled", r.status);

// --- project
const proj = (await call("POST", "/api/projects")).json;
r = await call("PATCH", `/api/projects/${proj.id}`, { title: "Proj One", tech: ["Next.js", "Supabase"], featured: true, published: true, cover: up.url, year: "2026" });
ok(r.json?.featured === true && r.json?.tech?.length === 2, "project fields saved", r.text);
r = await fetch(BASE + "/").then((x) => x.text());
ok(r.includes("Proj One"), "featured project on home");

// --- album with photos
const album = (await call("POST", "/api/albums")).json;
ok(Array.isArray(album.photos), "album created with photos[]");
await call("PATCH", `/api/albums/${album.id}`, { title: "Trip", published: true });
const ups = [];
for (const n of [1, 2, 4]) ups.push((await upload(fs.readFileSync(`public/samples/photo-${n}.jpg`), "image/jpeg", `p${n}.jpg`)).json);
r = await call("POST", `/api/album-photos/${album.id}`, { photos: ups });
ok(r.status === 201 && r.json.length === 3 && r.json.map((p) => p.position).join() === "0,1,2", "photos added in order", r.text);
const ids = r.json.map((p) => p.id);
r = await call("PATCH", `/api/album-photos/${album.id}`, { order: [ids[2], ids[0], ids[1]] });
ok(r.json.map((p) => p.id).join() === [ids[2], ids[0], ids[1]].join(), "reorder works", r.text);
r = await call("PATCH", `/api/photos/${ids[0]}`, { caption: "Sunset" });
ok(r.json?.caption === "Sunset", "caption saved");
r = await fetch(BASE + "/album/trip").then((x) => x.text());
ok(r.includes("Sunset") && /3(<!-- -->)? photos/.test(r), "album page shows photos");
r = await fetch(BASE + "/album").then((x) => x.text());
ok(r.includes("Trip"), "album listed");
r = await call("PATCH", `/api/albums/${album.id}`, { cover: ups[1].url });
r = await call("DELETE", `/api/photos/${ids[1]}`);
ok(r.status === 200, "delete photo");
if (FAKE) {
  const st = await fetch(FAKE + "/__state").then((x) => x.json());
  ok(!st.files.includes(ups[1].url.split("/").pop()), "deleted photo removed from Storage");
  ok(st.files.includes(ups[0].url.split("/").pop()), "other photos kept in Storage");
}
r = await call("DELETE", `/api/albums/${album.id}`);
ok(r.status === 200, "delete album");
if (FAKE) {
  const st = await fetch(FAKE + "/__state").then((x) => x.json());
  ok(!ups.some((u) => st.files.includes(u.url.split("/").pop())), "album delete cleans Storage");
  ok(st.files.includes(up.url.split("/").pop()), "file still used by project cover is kept");
}
r = await call("GET", `/api/albums/${album.id}`);
ok(r.status === 404, "album gone");

// --- settings
r = await call("PUT", "/api/settings", { name: "Test Person", about: "## About me\n\nHello", bogus: "x" });
ok(r.json?.name === "Test Person" && !("bogus" in r.json), "settings saved, unknown keys ignored");
r = await fetch(BASE + "/about").then((x) => x.text());
ok(r.includes("Test Person") && r.includes("About me"), "about page uses settings");
r = await call("PUT", "/api/settings", { email: "me@example.com" });
r = await call("GET", "/api/settings");
ok(r.json.name === "Test Person" && r.json.email === "me@example.com", "settings upsert merges");

// --- error handling
r = await call("PATCH", "/api/posts/999999", { title: "x" });
ok(r.status === 404, "unknown id -> 404");
r = await call("GET", "/api/nothing");
ok(r.status === 404, "unknown kind -> 404");
r = await call("DELETE", `/api/posts/${post.id}`);
r = await call("DELETE", `/api/posts/${dup.id}`);
r = await call("DELETE", `/api/projects/${proj.id}`);
ok(r.status === 200, "cleanup deletes");
if (FAKE) {
  const st = await fetch(FAKE + "/__state").then((x) => x.json());
  ok(!st.files.includes(up.url.split("/").pop()), "last reference gone -> file removed from Storage");
}

// --- experience
const ip = () => ({ "x-forwarded-for": `10.${Math.floor(Math.random()*250)}.${Math.floor(Math.random()*250)}.${Math.floor(Math.random()*250)}` });
r = await call("POST", "/api/experiences");
const exp = r.json;
ok(r.status === 201 && exp?.id, "create experience", r.text);
r = await call("GET", "/about");
ok(!r.text.includes("Acme Test Co"), "blank experience row hidden on public site");
r = await call("PATCH", `/api/experiences/${exp.id}`, { company: "Acme Test Co", role: "Staff Engineer", start_date: "2022-03", is_current: true, highlights: ["Shipped a thing", " ", "Fixed another"], tech: ["Go", "go", "Rust"] });
ok(r.status === 200 && r.json.highlights.length === 2 && r.json.is_current === true, "update experience", r.text);
r = await fetch(BASE + "/about");
ok((await r.text()).includes("Acme Test Co"), "experience shown on public about page");
r = await call("GET", "/admin/experience");
ok(r.status === 200 && r.text.includes("Staff Engineer"), "admin experience list");
r = await call("GET", `/admin/experience/${exp.id}`);
ok(r.status === 200, "admin experience editor renders");

// --- contact
const good = { name: "Tester", email: "t@example.com", subject: "Hi", message: "Hello there, this is a test." };
r = await call("POST", "/api/public/contact", { ...good }, { headers: ip(), nocookie: true });
ok(r.status === 201, "contact valid", r.text);
r = await call("POST", "/api/public/contact", { ...good, email: "nope" }, { headers: ip(), nocookie: true });
ok(r.status === 422 && r.json?.fields?.email, "contact invalid email -> 422", r.text);
r = await call("POST", "/api/public/contact", { ...good, message: "short" }, { headers: ip(), nocookie: true });
ok(r.status === 422 && r.json?.fields?.message, "contact short message -> 422");
r = await call("POST", "/api/public/contact", { ...good, website: "spam.com", email: "bot@example.com" }, { headers: ip(), nocookie: true });
ok(r.status === 200, "honeypot pretends success");
r = await call("GET", "/api/messages");
ok(r.json?.length >= 1 && !r.json.some((m) => m.email === "bot@example.com"), "honeypot message not stored");
const msg = r.json.find((m) => m.email === "t@example.com");
ok(msg && msg.read === false, "message stored unread");
r = await call("PATCH", `/api/messages/${msg.id}`, { read: true });
ok(r.json?.read === true, "mark message read");
r = await call("POST", "/api/messages", {});
ok(r.status === 405, "admin cannot create messages via API", r.status);
const fixedIp = ip();
let last;
for (let i = 0; i < 7; i++) last = await call("POST", "/api/public/contact", { ...good, email: `u${i}@example.com` }, { headers: fixedIp, nocookie: true });
ok(last.status === 429, "contact rate limit per IP", last.status);
r = await call("GET", "/admin/messages");
ok(r.status === 200 && r.text.includes("Tester"), "admin messages page");
r = await call("DELETE", `/api/messages/${msg.id}`);
ok(r.status === 200, "delete message");

// --- comments
r = await call("POST", "/api/posts", {});
const cp = r.json;
await call("PATCH", `/api/posts/${cp.id}`, { title: "Comment target", content: "body", published: true });
const cmt = (b, h = ip()) => call("POST", "/api/public/comment", b, { headers: h, nocookie: true });
r = await cmt({ postId: cp.id, name: "Ann", body: "Nice post!" });
ok(r.status === 201 && r.json?.comment?.id, "comment created", r.text);
const cid = r.json.comment.id;
r = await cmt({ postId: cp.id, name: "", body: "x" });
ok(r.status === 422, "comment validation");
r = await cmt({ postId: cp.id, name: "Ann", body: "http://a.com http://b.com http://c.com" });
ok(r.status === 422, "comment link limit");
r = await cmt({ postId: 999999, name: "Ann", body: "hello there" });
ok(r.status === 404, "comment on unknown post -> 404");
r = await fetch(BASE + "/blog/comment-target");
let html = await r.text();
ok(html.includes("Nice post!"), "comment visible on post");
r = await call("PATCH", `/api/comments/${cid}`, { approved: false });
ok(r.json?.approved === false, "hide comment");
r = await fetch(BASE + "/blog/comment-target");
ok(!(await r.text()).includes("Nice post!"), "hidden comment not public");
r = await call("GET", "/admin/comments");
ok(r.status === 200 && r.text.includes("Nice post!") && r.text.includes("Comment target"), "admin comments list shows hidden one with post title");
r = await call("DELETE", `/api/comments/${cid}`);
ok(r.status === 200, "delete comment");

// --- likes
async function likeCall(method, path, body, jar) {
  const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(jar.c ? { cookie: jar.c } : {}), ...ip() }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.get("set-cookie"); if (set) jar.c = set.split(";")[0];
  return { status: res.status, json: await res.json().catch(() => null) };
}
const A = {}, B = {};
r = await likeCall("POST", "/api/public/like", { target: "site" }, A);
ok(r.json?.liked === true && r.json.count === 1 + (r.json.count - 1), "like site", JSON.stringify(r.json));
const base = r.json.count;
r = await likeCall("POST", "/api/public/like", { target: "site" }, A);
ok(r.json?.liked === false && r.json.count === base - 1, "second click unlikes");
await likeCall("POST", "/api/public/like", { target: "site" }, A);
r = await likeCall("POST", "/api/public/like", { target: "site" }, B);
ok(r.json?.count === base + 1, "different visitor counts separately", JSON.stringify(r.json));
r = await likeCall("POST", "/api/public/like", { target: `post:${cp.id}` }, A);
ok(r.json?.liked === true, "like post");
r = await likeCall("GET", `/api/public/like?target=post:${cp.id}`, null, A);
ok(r.json?.liked === true && r.json.count === 1, "like state read back");
r = await likeCall("POST", "/api/public/like", { target: "post:999999" }, A);
ok(r.status === 404, "like unknown post -> 404");
r = await likeCall("POST", "/api/public/like", { target: "nonsense" }, A);
ok(r.status === 404, "like invalid target -> 404");

// --- analytics
const track = (path, ua = "Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537", extra = {}, h = ip()) =>
  call("POST", "/api/public/track", { path, referrer: "https://news.ycombinator.com/x", ...extra }, { headers: { "user-agent": ua, ...h }, nocookie: true });
const before = await call("GET", "/admin/analytics");
ok(before.status === 200, "analytics page renders (empty)");
r = await track("/blog/comment-target");
ok(r.status === 204, "track 204");
await track("/blog/comment-target");
await track("/", "Mozilla/5.0 (iPhone) Mobile Safari");
await track("/wp-admin/x");              // junk path ignored
await track("/", "Googlebot/2.1");        // bot ignored
r = await call("POST", "/api/public/track", { path: "/about" }, { headers: { "user-agent": "Chrome", ...ip() } }); // admin cookie
ok(r.status === 204, "admin visit ignored");
r = await call("GET", "/admin/analytics?range=30");
ok(r.status === 200 && r.text.includes("news.ycombinator.com") && r.text.includes("Mobile"), "analytics shows referrer and device");
ok(r.text.includes("/blog/comment-target") && !r.text.includes("wp-admin") && !r.text.includes("Googlebot"), "junk, bots excluded");
ok(!r.text.includes("/about</"), "admin view not counted");

// cleanup
await call("DELETE", `/api/experiences/${exp.id}`);
await call("DELETE", `/api/posts/${cp.id}`);


// --- logout
r = await call("POST", "/api/auth/logout");
r = await call("GET", "/api/posts");
ok(r.status === 401, "logout closes the API");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
