"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EnvelopeSimple, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import ConfirmDialog from "./ConfirmDialog";

const when = (iso) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

export default function MessageList({ initial }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [open, setOpen] = useState(null);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setRead(m, read) {
    setItems((l) => l.map((x) => (x.id === m.id ? { ...x, read } : x)));
    try {
      await api(`/api/messages/${m.id}`, { method: "PATCH", body: { read } });
      router.refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  function toggle(m) {
    const next = open === m.id ? null : m.id;
    setOpen(next);
    if (next && !m.read) setRead(m, true);
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/messages/${target.id}`, { method: "DELETE" });
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
        <p className="text-lg font-medium">Belum ada pesan.</p>
        <p className="mt-2 text-muted">Pesan dari halaman kontak akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <>
      {error && <p role="alert" className="mb-4 text-sm text-danger">{error}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              aria-expanded={open === m.id}
              onClick={() => toggle(m)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
            >
              <span className={`min-w-0 flex-1 truncate ${m.read ? "text-muted" : "font-medium text-ink"}`}>
                {m.name} <span className="text-faint">{m.subject ? `: ${m.subject}` : ""}</span>
              </span>
              {!m.read && <span className="chip !border-accent/40 text-accent">Baru</span>}
              <span className="hidden text-sm text-faint sm:block">{when(m.created_at)}</span>
            </button>
            {open === m.id && (
              <div className="border-t border-line bg-surface-2/40 px-5 py-5">
                <p className="text-sm text-muted">
                  {m.email} <span className="sm:hidden">, {when(m.created_at)}</span>
                </p>
                <p className="mt-4 whitespace-pre-wrap break-words leading-relaxed">{m.message}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <a
                    className="btn btn-primary btn-sm"
                    href={`mailto:${m.email}?subject=${encodeURIComponent("Re: " + (m.subject || "Pesanmu"))}`}
                  >
                    <EnvelopeSimple size={16} /> Balas lewat email
                  </a>
                  <button type="button" className="btn btn-sm" onClick={() => setRead(m, false)}>Tandai belum dibaca</button>
                  <button type="button" className="btn btn-sm" onClick={() => setTarget(m)}>
                    <Trash size={16} /> Hapus
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={!!target}
        title="Hapus pesan ini?"
        message={target ? `Pesan dari ${target.name} akan dihapus permanen.` : ""}
        onConfirm={remove}
        onCancel={() => setTarget(null)}
        busy={busy}
      />
    </>
  );
}
