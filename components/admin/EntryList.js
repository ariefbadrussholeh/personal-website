"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, PencilSimple, Star, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { formatDate, isVideoUrl } from "@/lib/format";
import ConfirmDialog from "./ConfirmDialog";

export default function EntryList({ kind, items, editBase, publicBase, emptyText }) {
  const router = useRouter();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/${kind}/${target.id}`, { method: "DELETE" });
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
        <p className="text-lg font-medium">Belum ada isi.</p>
        <p className="mt-2 text-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
        {items.map((it) => (
          <li key={it.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
            <div className="h-12 w-16 shrink-0 overflow-hidden rounded-[6px] border border-line bg-surface-2">
              {it.cover && (
                isVideoUrl(it.cover) ? (
                  <video src={it.cover} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.cover} alt="" className="h-full w-full object-cover" />
                )
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link href={`${editBase}/${it.id}`} className="flex items-center gap-2 font-medium tracking-tight hover:text-accent">
                <span className="truncate">{it.title || "Tanpa judul"}</span>
                {it.featured && <Star size={14} weight="fill" className="shrink-0 text-accent" aria-label="Unggulan" />}
              </Link>
              <p className="mt-0.5 text-sm text-faint">
                {it.date ? `${formatDate(it.date)} · ` : ""}Diubah {formatDate(it.updated_at)}
                {typeof it.photo_count === "number" ? `, ${it.photo_count} item` : ""}
              </p>
            </div>
            <span className={`chip ${it.published ? "!border-ok/40 !text-ok" : ""}`}>
              {it.published ? "Terbit" : "Draft"}
            </span>
            <div className="flex gap-1.5">
              <Link href={`${publicBase}/${it.slug}`} target="_blank" className="btn btn-sm btn-icon" aria-label="Lihat di situs">
                <ArrowUpRight size={14} />
              </Link>
              <Link href={`${editBase}/${it.id}`} className="btn btn-sm btn-icon" aria-label="Edit">
                <PencilSimple size={14} />
              </Link>
              <button type="button" className="btn btn-sm btn-icon" aria-label="Hapus" onClick={() => setTarget(it)}>
                <Trash size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={!!target}
        busy={busy}
        title={`Hapus "${target?.title || "Tanpa judul"}"?`}
        message="Tindakan ini tidak bisa dibatalkan."
        onConfirm={remove}
        onCancel={() => setTarget(null)}
      />
    </>
  );
}
