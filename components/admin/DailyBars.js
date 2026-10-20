"use client";

import { useState } from "react";

const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const fmtDay = (key) => SHORT.format(new Date(`${key}T00:00:00Z`));

/** Round a maximum up to a clean tick value: 1, 2, 5 times a power of ten. */
function niceMax(n) {
  if (n <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(n));
  const f = n / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
}
const compact = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));

/**
 * One series, so one colour and no legend (the heading names it).
 * Marks follow the spec: <= 24px wide, 4px rounded tip, square at the baseline,
 * hairline grid. Each bar is its own hover and keyboard target.
 */
export default function DailyBars({ series }) {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(0, ...series.map((d) => d.views)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (max / 4) * i);
  const every = Math.ceil(series.length / 7);
  const current = active !== null ? series[active] : null;

  return (
    <div>
      <div className="relative flex gap-3">
        {/* y axis */}
        <div className="flex h-56 w-8 shrink-0 flex-col-reverse justify-between text-right font-mono text-xs text-faint tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="-my-2 leading-4">{compact(t)}</span>
          ))}
        </div>

        <div className="relative h-56 flex-1" onPointerLeave={() => setActive(null)}>
          {/* hairline grid */}
          {ticks.map((t, i) => (
            <div
              key={t}
              aria-hidden
              className="absolute inset-x-0 h-px bg-line"
              style={{ bottom: `${(i / 4) * 100}%` }}
            />
          ))}

          <div className="relative flex h-full items-end gap-[2px]">
            {series.map((d, i) => {
              const h = d.views ? Math.max(3, (d.views / max) * 100) : 0;
              return (
                <div
                  key={d.day}
                  tabIndex={0}
                  role="img"
                  aria-label={`${fmtDay(d.day)}: ${d.views} tampilan, ${d.visitors} pengunjung`}
                  className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-offset-2"
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] transition-colors ${
                      active === i ? "bg-[#7aa2ff]" : "bg-accent"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                </div>
              );
            })}
          </div>

          {current && (
            <div
              role="status"
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-[10px] border border-line-strong bg-surface px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
              style={{
                left: `${Math.min(88, Math.max(12, ((active + 0.5) / series.length) * 100))}%`,
                bottom: `calc(${Math.min(100, (current.views / max) * 100)}% + 10px)`,
              }}
            >
              <p className="text-xs text-muted">{fmtDay(current.day)}</p>
              <p className="mt-1 flex items-center gap-2 whitespace-nowrap text-sm">
                <span className="h-0.5 w-3 rounded bg-accent" aria-hidden />
                <span className="font-semibold text-ink tabular-nums">{current.views}</span>
                <span className="text-muted">tampilan</span>
              </p>
              <p className="mt-0.5 whitespace-nowrap pl-5 text-xs text-muted">
                <span className="tabular-nums text-ink">{current.visitors}</span> pengunjung
              </p>
            </div>
          )}
        </div>
      </div>

      {/* x axis: a few labels, never one per bar */}
      <div className="ml-11 mt-2 flex gap-[2px] font-mono text-xs text-faint">
        {series.map((d, i) => (
          <span key={d.day} className="relative min-w-0 flex-1">
            {i % every === 0 && <span className="absolute left-0 whitespace-nowrap">{fmtDay(d.day)}</span>}
          </span>
        ))}
      </div>
      <div className="h-5" aria-hidden />

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted transition-colors hover:text-ink">Lihat sebagai tabel</summary>
        <div className="mt-3 max-h-72 overflow-auto rounded-[10px] border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Tanggal</th>
                <th className="px-4 py-2 text-right font-medium">Tampilan</th>
                <th className="px-4 py-2 text-right font-medium">Pengunjung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line tabular-nums">
              {[...series].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="px-4 py-2">{fmtDay(d.day)}</td>
                  <td className="px-4 py-2 text-right">{d.views}</td>
                  <td className="px-4 py-2 text-right">{d.visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
