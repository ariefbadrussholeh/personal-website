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
  q = opts.onlyPublished
    ? q.order("published_at", { ascending: false }).order("id", { ascending: false })
    : q.order("updated_at", { ascending: false }).order("id", { ascending: false });
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
  const { table } = KINDS[kind];
  const slug = await uniqueSlug(table, `untitled-${Date.now().toString(36)}`);
  const row = must(await supabase().from(table).insert({ slug }).select("*").single());
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
      value = [...new Set(arr.map((v) => String(v).trim().slice(0, 40)).filter(Boolean))].slice(0, 20);
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
  if ("slug" in sets) {
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
  sets.updated_at = now();

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
/* Site settings                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = {
  name: "Your Name",
  role: "Software Engineer",
  headline: "I build web software that stays fast and easy to maintain.",
  tagline: "Notes on what I learn, projects I ship, and photos from places I go.",
  avatar: "",
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
