import Link from "next/link";
import { listEntries, getSettings } from "@/lib/db";
import { formatDate } from "@/lib/format";
import NewButton from "@/components/admin/NewButton";

export const metadata = { title: "Ringkasan" };

const SECTIONS = [
  { kind: "posts", label: "Tulisan", edit: "/admin/blog", list: "/admin/blog" },
  { kind: "projects", label: "Project", edit: "/admin/projects", list: "/admin/projects" },
  { kind: "albums", label: "Album", edit: "/admin/album", list: "/admin/album" },
];

export default async function Dashboard() {
  const settings = await getSettings();
  const data = await Promise.all(
    SECTIONS.map(async (s) => ({ ...s, items: await listEntries(s.kind) }))
  );
  const recent = data
    .flatMap((s) => s.items.map((it) => ({ ...it, section: s })))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 6);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tighter">Halo, {settings.name.split(" ")[0]}</h1>
      <p className="mt-2 text-muted">Pilih apa yang mau ditulis hari ini.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {data.map((s) => {
          const published = s.items.filter((i) => i.published).length;
          return (
            <div key={s.kind} className="rounded-[10px] border border-line bg-surface p-5">
              <Link href={s.list} className="text-sm text-muted transition-colors hover:text-ink">{s.label}</Link>
              <p className="mt-2 font-mono text-3xl tracking-tight">{s.items.length}</p>
              <p className="mt-1 text-sm text-faint">{published} terbit, {s.items.length - published} draft</p>
              <div className="mt-5">
                <NewButton kind={s.kind} editBase={s.edit} label={`${s.label} baru`} className="btn btn-sm" />
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-4 mt-12 text-lg font-medium tracking-tight">Terakhir diedit</h2>
      {recent.length === 0 ? (
        <p className="text-muted">Belum ada isi. Mulai dengan membuat tulisan, project, atau album.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
          {recent.map((it) => (
            <li key={`${it.section.kind}-${it.id}`}>
              <Link
                href={`${it.section.edit}/${it.id}`}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1 truncate font-medium">{it.title || "Tanpa judul"}</span>
                <span className="chip">{it.section.label}</span>
                <span className="hidden w-24 text-right text-sm text-faint sm:block">{formatDate(it.updated_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
