import * as simple from "simple-icons";

// Brand marks come from the Simple Icons package, inlined as SVG paths.
const bySlug = new Map(
  Object.values(simple)
    .filter((i) => i && typeof i === "object" && i.slug && i.path)
    .map((i) => [i.slug, i])
);

export function getBrandIcon(slug) {
  return bySlug.get(String(slug).trim().toLowerCase()) || null;
}

export function parseStack(text = "") {
  return String(text)
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((slug) => getBrandIcon(slug))
    .filter(Boolean);
}
