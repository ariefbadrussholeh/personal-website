/** Horizontal bars for a ranked list. One colour (the categories have no natural order). */
export default function RankList({ rows, empty = "Belum ada data." }) {
  if (!rows.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  const total = rows.reduce((n, r) => n + r.count, 0);
  return (
    <ul className="space-y-4">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 truncate text-ink" title={r.label}>{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink">
              {r.count} <span className="text-faint">({Math.round((r.count / total) * 100)}%)</span>
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-r-[4px]">
            <div className="h-full rounded-r-[4px] bg-accent" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
