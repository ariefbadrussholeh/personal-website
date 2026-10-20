const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : fmt.format(d);
}

export function entryDate(entry) {
  return formatDate(entry.published_at || entry.created_at);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2024-03" becomes "Mar 2024". */
export function formatMonth(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(ym || "");
  return m ? `${MONTHS[Number(m[2]) - 1] || ""} ${m[1]}`.trim() : "";
}

/** Date range for one job, for example "Feb 2024 - Present". */
export function experienceRange(item) {
  const start = formatMonth(item.start_date);
  const end = item.is_current ? "Present" : formatMonth(item.end_date);
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" - ");
}

/** Length of a job as text, for example "2 yrs 8 mos". */
export function experienceDuration(item) {
  const s = /^(\d{4})-(\d{2})$/.exec(item.start_date || "");
  if (!s) return "";
  const e = item.is_current ? null : /^(\d{4})-(\d{2})$/.exec(item.end_date || "");
  if (!item.is_current && !e) return "";
  const now = new Date();
  const endYear = e ? Number(e[1]) : now.getFullYear();
  const endMonth = e ? Number(e[2]) : now.getMonth() + 1;
  const months = (endYear - Number(s[1])) * 12 + (endMonth - Number(s[2])) + 1; // inclusive
  if (months < 1) return "";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} ${y === 1 ? "yr" : "yrs"}` : "", m ? `${m} ${m === 1 ? "mo" : "mos"}` : ""].filter(Boolean).join(" ");
}
