import Link from "next/link";
import { listEntries } from "@/lib/db";
import { experienceRange } from "@/lib/format";
import { getBrandIcon } from "@/lib/icons";
import TechIcon from "@/components/site/TechIcon";
import NewButton from "@/components/admin/NewButton";

export const metadata = { title: "Pengalaman" };

export default async function Page() {
  const items = await listEntries("experiences");
  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">Pengalaman</h1>
        <NewButton kind="experiences" editBase="/admin/experience" label="Pengalaman baru" />
      </div>
      {items.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-lg font-medium">Belum ada pengalaman.</p>
          <p className="mt-2 text-muted">Klik Pengalaman baru untuk menambahkan pekerjaan pertamamu.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
          {items.map((it) => {
            const brand = it.icon ? getBrandIcon(it.icon) : null;
            return (
              <li key={it.id}>
                <Link href={`/admin/experience/${it.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                  {it.icon && (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-line bg-surface-2 p-1 text-ink">
                      {brand ? (
                        <TechIcon icon={brand} size={20} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.icon} alt="" className="h-full w-full object-contain" />
                      )}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium tracking-tight">{it.role || "Tanpa jabatan"}</span>
                    <span className="block truncate text-sm text-muted">{it.company || "Tanpa perusahaan"}</span>
                  </span>
                  <span className="hidden text-sm text-faint sm:block">{experienceRange(it)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
