import GithubSlugger from "github-slugger";

/** Extract h2/h3 headings from markdown for the table of contents. */
export function extractHeadings(markdown = "") {
  const slugger = new GithubSlugger();
  const out = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const text = m[2]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .trim();
    out.push({ depth: m[1].length, text, id: slugger.slug(text) });
  }
  return out;
}
