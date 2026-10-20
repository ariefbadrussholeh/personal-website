import { BUCKET, must, objectNameFromUrl, supabase } from "./supabase";

/**
 * Data layer on top of Supabase (Postgres). Every function is async.
 * The schema lives in supabase/schema.sql.
 */

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

/**
 * Each collection declares which columns the admin API may write,
 * which of them are text[] lists, and which are boolean flags.
 * Optional switches: slugged (default true), timestamps (updated_at column,
 * default true), creatable (admin may create empty rows, default true),
 * order (list of [column, ascending]) and listMax (max length per list item).
 */
export const KINDS = {
  posts: {
    table: "posts",
    label: "Tulisan",
    writable: ["title", "excerpt", "content", "cover", "tags", "published", "slug"],
    lists: ["tags"],
    flags: ["published"],
  },
  projects: {
    table: "projects",
    label: "Project",
    writable: [
      "title", "summary", "content", "cover", "tech", "live_url", "repo_url",
      "year", "role", "featured", "published", "slug",
    ],
    lists: ["tech"],
    flags: ["featured", "published"],
  },
  albums: {
    table: "albums",
    label: "Album",
    writable: ["title", "description", "cover", "published", "slug"],
    lists: [],
    flags: ["published"],
  },
  experiences: {
    table: "experiences",
    label: "Pengalaman",
    writable: ["company", "role", "location", "url", "icon", "start_date", "end_date", "is_current", "highlights", "tech"],
    lists: ["highlights", "tech"],
    listMax: { highlights: 300, tech: 40 },
    flags: ["is_current"],
    slugged: false,
    order: [["start_date", false], ["id", false]],
  },
  comments: {
    table: "comments",
    label: "Komentar",
    writable: ["approved"],
    lists: [],
    flags: ["approved"],
    slugged: false,
    timestamps: false,
    creatable: false,
    order: [["created_at", false], ["id", false]],
  },
  messages: {
    table: "messages",
    label: "Pesan",
    writable: ["read"],
    lists: [],
    flags: ["read"],
    slugged: false,
    timestamps: false,
    creatable: false,
    order: [["created_at", false], ["id", false]],
  },
};

const MAX_TEXT = 200_000; // markdown body
const MAX_SHORT = 500;

export function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(table, base, excludeId = 0) {
  const root = slugify(base) || "untitled";
  let slug = root;
  let n = 2;
  for (;;) {
    const rows = must(
      await supabase().from(table).select("id").eq("slug", slug).neq("id", excludeId).limit(1)
    );
    if (!rows.length) return slug;
    slug = `${root}-${n++}`;
  }
}

const now = () => new Date().toISOString();

export function readingMinutes(markdown = "") {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 210));
}

/* ----- reads -------------------------------------------------------- */

export async function listEntries(kind, opts = {}) {
  const cfg = KINDS[kind];
  let q = supabase().from(cfg.table).select("*");
  if (opts.onlyPublished) q = q.eq("published", true);
  if (opts.featured) q = q.eq("featured", true);
  if (opts.tag && cfg.lists.includes("tags")) q = q.contains("tags", [opts.tag]);

  // Public pages sort by publish date, the admin by last edit.
  if (cfg.order) {
    for (const [col, asc] of cfg.order) q = q.order(col, { ascending: asc });
  } else {
    q = opts.onlyPublished
      ? q.order("published_at", { ascending: false }).order("id", { ascending: false })
      : q.order("updated_at", { ascending: false }).order("id", { ascending: false });
  }
  if (opts.limit) q = q.limit(Number(opts.limit) | 0);

  const rows = must(await q);

  if (kind === "albums" && rows.length) {
    const photos = must(
      await supabase()
        .from("photos")
        .select("id, album_id, url, position")
        .in("album_id", rows.map((a) => a.id))
        .order("position", { ascending: true })
        .order("id", { ascending: true })
    );
    for (const a of rows) {
      const mine = photos.filter((p) => p.album_id === a.id);
      a.photo_count = mine.length;
      if (!a.cover) a.cover = mine[0]?.url || "";
    }
  }
  return rows;
}

export async function getEntry(kind, id) {
  const row = must(
    await supabase().from(KINDS[kind].table).select("*").eq("id", id).limit(1)
  )[0];
  if (!row) return null;
  if (kind === "albums") row.photos = await getPhotos(row.id);
  return row;
}

export async function getEntryBySlug(kind, slug, { onlyPublished = true } = {}) {
  let q = supabase().from(KINDS[kind].table).select("*").eq("slug", slug);
  if (onlyPublished) q = q.eq("published", true);
  const row = must(await q.limit(1))[0];
  if (!row) return null;
  if (kind === "albums") {
    row.photos = await getPhotos(row.id);
    if (!row.cover) row.cover = row.photos[0]?.url || "";
  }
  return row;
}

export async function listTags() {
  const rows = must(await supabase().from("posts").select("tags").eq("published", true));
  const counts = new Map();
  for (const r of rows) for (const t of r.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/* ----- writes ------------------------------------------------------- */

export async function createEntry(kind) {
  const cfg = KINDS[kind];
  const { table } = cfg;
  const fields = cfg.slugged === false ? {} : { slug: await uniqueSlug(table, `untitled-${Date.now().toString(36)}`) };
  const row = must(await supabase().from(table).insert(fields).select("*").single());
  if (kind === "albums") row.photos = [];
  return row;
}

export async function updateEntry(kind, id, patch) {
  const cfg = KINDS[kind];
  const current = must(await supabase().from(cfg.table).select("*").eq("id", id).limit(1))[0];
  if (!current) return null;

  const sets = {};
  for (const key of cfg.writable) {
    if (!(key in patch)) continue;
    let value = patch[key];

    if (cfg.lists.includes(key)) {
      const arr = Array.isArray(value) ? value : [];
      const max = cfg.listMax?.[key] ?? 40;
      value = [...new Set(arr.map((v) => String(v).trim().slice(0, max)).filter(Boolean))].slice(0, 20);
    } else if (cfg.flags.includes(key)) {
      value = !!value;
    } else {
      const cap = key === "content" ? MAX_TEXT : MAX_SHORT;
      value = String(value ?? "").slice(0, cap);
    }
    sets[key] = value;
  }

  // Slug handling: follows the title until it is edited by hand or was already
  // published. Judging by the stored state (not the incoming patch) means a
  // single request that sets the title and publishes still gets a proper slug.
  if (cfg.slugged === false) {
    // no slug on this collection
  } else if ("slug" in sets) {
    const wanted = slugify(sets.slug);
    if (wanted && wanted !== current.slug) {
      sets.slug = await uniqueSlug(cfg.table, wanted, id);
      sets.slug_auto = false;
    } else {
      delete sets.slug;
    }
  } else if ("title" in sets && current.slug_auto && !current.published && sets.title.trim()) {
    sets.slug = await uniqueSlug(cfg.table, sets.title, id);
  }

  if (sets.published === true && !current.published_at) sets.published_at = now();
  if (cfg.timestamps !== false) sets.updated_at = now();

  must(await supabase().from(cfg.table).update(sets).eq("id", id));
  return getEntry(kind, id);
}

export async function deleteEntry(kind, id) {
  const { table } = KINDS[kind];
  const existing = await getEntry(kind, id);
  if (!existing) return false;

  must(await supabase().from(table).delete().eq("id", id)); // photos cascade in the database
  if (kind === "albums") {
    for (const p of existing.photos) await removeUploadFile(p.url);
    await removeUploadFile(existing.cover);
  } else {
    await removeUploadFile(existing.cover);
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Album photos                                                        */
/* ------------------------------------------------------------------ */

export async function getPhotos(albumId) {
  return must(
    await supabase()
      .from("photos")
      .select("*")
      .eq("album_id", albumId)
      .order("position", { ascending: true })
      .order("id", { ascending: true })
  );
}

export async function addPhotos(albumId, photos) {
  const last = must(
    await supabase()
      .from("photos")
      .select("position")
      .eq("album_id", albumId)
      .order("position", { ascending: false })
      .limit(1)
  )[0];
  const start = last ? last.position + 1 : 0;

  const rows = photos.map((p, i) => ({
    album_id: albumId,
    url: String(p.url).slice(0, 1000),
    caption: String(p.caption || "").slice(0, MAX_SHORT),
    width: Number(p.width) | 0,
    height: Number(p.height) | 0,
    position: start + i,
  }));
  must(await supabase().from("photos").insert(rows));
  must(await supabase().from("albums").update({ updated_at: now() }).eq("id", albumId));
  return getPhotos(albumId);
}

export async function updatePhoto(id, patch) {
  if ("caption" in patch) {
    must(
      await supabase()
        .from("photos")
        .update({ caption: String(patch.caption ?? "").slice(0, MAX_SHORT) })
        .eq("id", id)
    );
  }
  return must(await supabase().from("photos").select("*").eq("id", id).limit(1))[0] || null;
}

export async function deletePhoto(id) {
  const photo = must(await supabase().from("photos").select("*").eq("id", id).limit(1))[0];
  if (!photo) return false;
  must(await supabase().from("photos").delete().eq("id", id));
  // If this photo was the explicit cover, clear it.
  must(await supabase().from("albums").update({ cover: "" }).eq("id", photo.album_id).eq("cover", photo.url));
  await removeUploadFile(photo.url);
  return true;
}

export async function reorderPhotos(albumId, order) {
  await Promise.all(
    order.map(async (pid, i) =>
      must(
        await supabase()
          .from("photos")
          .update({ position: i })
          .eq("id", Number(pid))
          .eq("album_id", albumId)
      )
    )
  );
  return getPhotos(albumId);
}

/** Removes a file from Storage unless another record still points at it. */
export async function removeUploadFile(url) {
  const name = objectNameFromUrl(url);
  if (!name) return; // external images are not ours to delete

  const sb = supabase();
  const probes = [
    sb.from("photos").select("id").eq("url", url).limit(1),
    sb.from("posts").select("id").eq("cover", url).limit(1),
    sb.from("projects").select("id").eq("cover", url).limit(1),
    sb.from("albums").select("id").eq("cover", url).limit(1),
    sb.from("posts").select("id").ilike("content", `%${url}%`).limit(1),
    sb.from("projects").select("id").ilike("content", `%${url}%`).limit(1),
  ];
  for (const probe of probes) if (must(await probe).length) return;
  await sb.storage.from(BUCKET).remove([name]); // best effort, never blocks the caller
}

/* ------------------------------------------------------------------ */
/* Experience and contact messages                                     */
/* ------------------------------------------------------------------ */

/** Work history for the public site. Half-filled placeholder rows are hidden. */
export async function listPublicExperiences() {
  const rows = await listEntries("experiences");
  return rows.filter((r) => r.company.trim() || r.role.trim());
}

export async function createMessage({ name, email, subject = "", message }) {
  return must(
    await supabase()
      .from("messages")
      .insert({
        name: String(name).slice(0, 100),
        email: String(email).slice(0, 200),
        subject: String(subject).slice(0, 150),
        message: String(message).slice(0, 3000),
      })
      .select("*")
      .single()
  );
}

/** How many messages this address sent since the given time (spam guard). */
export async function countRecentMessages(email, sinceIso) {
  const rows = must(
    await supabase().from("messages").select("id").eq("email", email).gte("created_at", sinceIso)
  );
  return rows.length;
}

export async function countUnreadMessages() {
  return must(await supabase().from("messages").select("id").eq("read", false)).length;
}

/* ------------------------------------------------------------------ */
/* Counting helper                                                     */
/* ------------------------------------------------------------------ */

/** Exact row count with an optional filter, without downloading the rows. */
async function countWhere(table, build = (q) => q) {
  const { count, error } = await build(
    supabase().from(table).select("id", { count: "exact", head: true })
  );
  if (error) throw new Error(error.message || "Kesalahan database");
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/* Comments                                                            */
/* ------------------------------------------------------------------ */

export async function listComments(postId, { includeHidden = false } = {}) {
  let q = supabase()
    .from("comments")
    .select("id, post_id, name, body, approved, created_at")
    .eq("post_id", postId);
  if (!includeHidden) q = q.eq("approved", true);
  return must(await q.order("created_at", { ascending: true }).order("id", { ascending: true }));
}

export async function createComment({ postId, name, body, visitor }) {
  const row = must(
    await supabase()
      .from("comments")
      .insert({
        post_id: postId,
        name: String(name).slice(0, 60),
        body: String(body).slice(0, 1500),
        visitor: String(visitor || "").slice(0, 100),
      })
      .select("id, post_id, name, body, approved, created_at")
      .single()
  );
  return row;
}

export async function countRecentComments(visitor, sinceIso) {
  return countWhere("comments", (q) => q.eq("visitor", visitor).gte("created_at", sinceIso));
}

/** Every comment (newest first) with the title of its post, for the admin. */
export async function listCommentsForAdmin(limit = 200) {
  const rows = must(
    await supabase()
      .from("comments")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit)
  );
  if (!rows.length) return rows;
  const posts = must(
    await supabase().from("posts").select("id, title, slug").in("id", [...new Set(rows.map((r) => r.post_id))])
  );
  const byId = new Map(posts.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, post_title: byId.get(r.post_id)?.title || "(tulisan dihapus)", post_slug: byId.get(r.post_id)?.slug || "" }));
}

export async function countCommentsForPost(postId) {
  return countWhere("comments", (q) => q.eq("post_id", postId).eq("approved", true));
}

/* ------------------------------------------------------------------ */
/* Likes                                                               */
/* ------------------------------------------------------------------ */

/** Valid targets are "site" and "post:<id>" of a published post. */
export async function isValidLikeTarget(target) {
  if (target === "site") return true;
  const m = /^post:(\d+)$/.exec(String(target));
  if (!m) return false;
  const rows = must(
    await supabase().from("posts").select("id").eq("id", Number(m[1])).eq("published", true).limit(1)
  );
  return rows.length > 0;
}

export async function getLikeState(target, visitor) {
  const count = await countWhere("likes", (q) => q.eq("target", target));
  const liked = visitor
    ? (await countWhere("likes", (q) => q.eq("target", target).eq("visitor", visitor))) > 0
    : false;
  return { count, liked };
}

/** Likes if not liked yet, otherwise removes the like. Returns the new state. */
export async function toggleLike(target, visitor) {
  const sb = supabase();
  const had = await countWhere("likes", (q) => q.eq("target", target).eq("visitor", visitor));
  if (had) {
    must(await sb.from("likes").delete().eq("target", target).eq("visitor", visitor));
  } else {
    const { error } = await sb.from("likes").insert({ target, visitor });
    if (error && error.code !== "23505") throw new Error(error.message); // 23505 = already liked in a race
  }
  return getLikeState(target, visitor);
}

export async function totalLikes() {
  return countWhere("likes");
}

/* ------------------------------------------------------------------ */
/* Analytics                                                           */
/* ------------------------------------------------------------------ */

export async function recordView(view) {
  must(
    await supabase().from("page_views").insert({
      path: String(view.path).slice(0, 200),
      referrer: String(view.referrer || "").slice(0, 120),
      device: String(view.device || "").slice(0, 20),
      browser: String(view.browser || "").slice(0, 30),
      country: String(view.country || "").slice(0, 8),
      visitor: String(view.visitor || "").slice(0, 64),
    })
  );
}

const PAGE = 1000; // Supabase returns at most 1000 rows per request
const MAX_ROWS = 30_000;

function dayKey(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function tally(map, key, n = 1) {
  map.set(key, (map.get(key) || 0) + n);
}

function top(map, limit) {
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

/** Aggregated numbers for the admin analytics page. Days are grouped in ANALYTICS_TZ. */
export async function getAnalytics(days = 7) {
  const timeZone = process.env.ANALYTICS_TZ || "Asia/Jakarta";
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const rows = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const page = must(
      await supabase()
        .from("page_views")
        .select("path, referrer, device, browser, country, visitor, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1)
    );
    rows.push(...page);
    if (page.length < PAGE) break;
  }

  const perDay = new Map();
  const dayVisitors = new Map();
  const pages = new Map();
  const referrers = new Map();
  const devices = new Map();
  const browsers = new Map();
  const countries = new Map();
  const visitors = new Set();

  for (const r of rows) {
    const day = dayKey(new Date(r.created_at), timeZone);
    tally(perDay, day);
    if (!dayVisitors.has(day)) dayVisitors.set(day, new Set());
    dayVisitors.get(day).add(r.visitor);
    visitors.add(`${day}:${r.visitor}`);
    tally(pages, r.path);
    tally(referrers, r.referrer || "Langsung");
    tally(devices, r.device || "Lainnya");
    tally(browsers, r.browser || "Lainnya");
    if (r.country) tally(countries, r.country);
  }

  // A continuous series, so quiet days show as zero instead of disappearing.
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(Date.now() - i * 86_400_000), timeZone);
    series.push({ day: key, views: perDay.get(key) || 0, visitors: dayVisitors.get(key)?.size || 0 });
  }

  return {
    days,
    truncated: rows.length >= MAX_ROWS,
    views: rows.length,
    visitors: visitors.size, // unique per day: the same person on two days counts twice
    series,
    pages: top(pages, 8),
    referrers: top(referrers, 6),
    devices: top(devices, 4),
    browsers: top(browsers, 5),
    countries: top(countries, 5),
    likes: await totalLikes(),
    comments: await countWhere("comments"),
    messages: await countWhere("messages"),
  };
}

/* ------------------------------------------------------------------ */
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  name: "Your Name",
  role: "Software Engineer",
  headline: "I build web software that stays fast and easy to maintain.",
  tagline: "Notes on what I learn, projects I ship, and photos from places I go.",
  avatar: "",
  icon: "",
  email: "",
  github: "",
  linkedin: "",
  twitter: "",
  stack: "nextdotjs, react, javascript, typescript, nodedotjs, tailwindcss, postgresql, supabase, docker, git, linux",
  about: `I am a software engineer who likes small, well-made tools. Most of my work is on the web, from database to interface.

## What I do

I design and build web applications end to end. I care about performance, readable code, and interfaces that stay out of the way.

## Where to find me

Edit this page from the admin panel, under Pengaturan. You can use headings, lists, code and images.`,
};

export async function getSettings() {
  const rows = must(await supabase().from("settings").select("key, value"));
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(patch) {
  const rows = Object.keys(DEFAULT_SETTINGS)
    .filter((key) => key in patch)
    .map((key) => ({
      key,
      value: String(patch[key] ?? "").slice(0, key === "about" ? MAX_TEXT : MAX_SHORT),
    }));
  if (rows.length) must(await supabase().from("settings").upsert(rows, { onConflict: "key" }));
  return getSettings();
}
