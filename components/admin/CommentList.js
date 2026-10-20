"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import ConfirmDialog from "./ConfirmDialog";

const when = (iso) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default function CommentList({ initial }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setApproved(c, approved) {
    setItems((l) => l.map((x) => (x.id === c.id ? { ...x, approved } : x)));
    try {
      await api(`/api/comments/${c.id}`, { method: "PATCH", body: { approved } });
    } catch (e) {
      setError(e.message);
      setItems((l) => l.map((x) => (x.id === c.id ? { ...x, approved: c.approved } : x)));
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/comments/${target.id}`, { method: "DELETE" });
      setItems((l) => l.filter((x) => x.id !== target.id));
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
        <p className="text-lg font-medium">Belum ada komentar.</p>
        <p className="mt-2 text-muted">Komentar dari pembaca blog akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
        {items.map((c) => (
          <li key={c.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="text-faint">{when(c.created_at)}</span>
              {!c.approved && <span className="chip">Disembunyikan</span>}
              <span className="text-faint">pada</span>
              {c.post_slug ? (
                <Link href={`/blog/${c.post_slug}`} target="_blank" className="min-w-0 truncate text-muted hover:text-accent">
                  {c.post_title}
                </Link>
              ) : (
                <span className="text-muted">{c.post_title}</span>
              )}
            </div>
            <p className={`mt-2 whitespace-pre-wrap break-words leading-relaxed ${c.approved ? "" : "text-muted"}`}>{c.body}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" className="btn btn-sm" onClick={() => setApproved(c, !c.approved)}>
                {c.approved ? "Sembunyikan" : "Tampilkan"}
              </button>
              <button type="button" className="btn btn-sm" onClick={() => setTarget(c)}>Hapus</button>
            </div>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!target}
        title="Hapus komentar ini?"
        message={target ? `Komentar dari ${target.name} akan dihapus permanen.` : ""}
        onConfirm={remove}
        onCancel={() => setTarget(null)}
        busy={busy}
      />
    </>
  );
}
