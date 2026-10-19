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
async function call(method, path, body, { form, raw } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { cookie } : {}) },
    body: form || (body ? JSON.stringify(body) : undefined),
    redirect: "manual",
  });
  const set = res.headers.get("set-cookie");
  if (set) cookie = set.split(";")[0];
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

// --- logout
r = await call("POST", "/api/auth/logout");
r = await call("GET", "/api/posts");
ok(r.status === 401, "logout closes the API");

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
