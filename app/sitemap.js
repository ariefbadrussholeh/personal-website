import { listEntries } from "@/lib/db";

// Content changes at runtime, so never bake this at build time.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const pages = ["", "/blog", "/projects", "/album", "/about"].map((p) => ({ url: `${base}${p}` }));
  const dyn = async (kind, prefix) =>
    (await listEntries(kind, { onlyPublished: true })).map((e) => ({
      url: `${base}${prefix}/${e.slug}`,
      lastModified: e.updated_at,
    }));
  const [posts, projects, albums] = await Promise.all([
    dyn("posts", "/blog"),
    dyn("projects", "/projects"),
    dyn("albums", "/album"),
  ]);
  return [...pages, ...posts, ...projects, ...albums];
}
