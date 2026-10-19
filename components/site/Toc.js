export default function Toc({ headings }) {
  if (!headings || headings.length < 2) return null;
  return (
    <nav aria-label="On this page" className="sticky top-24 text-sm">
      <p className="mb-3 font-medium text-ink">On this page</p>
      <ul className="space-y-2 border-l border-line">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: h.depth === 3 ? "1.75rem" : "1rem" }}>
            <a href={`#${h.id}`} className="block leading-snug text-muted transition-colors hover:text-accent">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
