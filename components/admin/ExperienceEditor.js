"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { useAutosave } from "./useAutosave";
import SaveStatus from "./SaveStatus";
import TagInput from "./TagInput";
import ConfirmDialog from "./ConfirmDialog";
import ImageField from "./ImageField";
import { getBrandIcon } from "@/lib/icons";
import TechIcon from "@/components/site/TechIcon";

export default function ExperienceEditor({ initial }) {
  const router = useRouter();
  const [f, setF] = useState({
    company: initial.company || "",
    role: initial.role || "",
    location: initial.location || "",
    url: initial.url || "",
    icon: initial.icon || "",
    start_date: initial.start_date || "",
    end_date: initial.end_date || "",
    is_current: !!initial.is_current,
    tech: initial.tech || [],
  });
  // Keep the raw text so Enter and trailing spaces behave while typing.
  const [highlights, setHighlights] = useState((initial.highlights || []).join("\n"));
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const { status, error, queue, flush } = useAutosave({ kind: "experiences", id: initial.id });

  function set(key, value, opts) {
    setF((s) => ({ ...s, [key]: value }));
    queue({ [key]: value }, opts);
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/experiences/${initial.id}`, { method: "DELETE" });
      router.push("/admin/experience");
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link
          href="/admin/experience"
          onClick={() => flush()}
          className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft size={16} /> Pengalaman
        </Link>
        <SaveStatus status={status} error={error} />
      </div>

      <div className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="role">Jabatan</label>
            <input id="role" className="field" value={f.role} placeholder="Software Engineer" onChange={(e) => set("role", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="company">Perusahaan</label>
            <input id="company" className="field" value={f.company} placeholder="Nama perusahaan" onChange={(e) => set("company", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="location">Lokasi</label>
            <input id="location" className="field" value={f.location} placeholder="Jakarta, remote" onChange={(e) => set("location", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="url">Situs perusahaan</label>
            <input id="url" className="field" value={f.url} placeholder="https://" onChange={(e) => set("url", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="start">Mulai</label>
            <input id="start" type="month" className="field" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="end">Selesai</label>
            <input
              id="end"
              type="month"
              className="field disabled:opacity-50"
              disabled={f.is_current}
              value={f.is_current ? "" : f.end_date}
              onChange={(e) => set("end_date", e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#4a82ff]"
            checked={f.is_current}
            onChange={(e) => set("is_current", e.target.checked, { immediate: true })}
          />
          Masih bekerja di sini
        </label>

        <div>
          <label className="label">Ikon / Logo Perusahaan (opsional)</label>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="w-24 shrink-0">
              <ImageField
                value={f.icon && (f.icon.startsWith("http") || f.icon.startsWith("/") || f.icon.startsWith("data:")) ? f.icon : ""}
                onChange={(url) => set("icon", url)}
                aspect="1 / 1"
                compact
              />
            </div>
            <div className="flex-1 space-y-2">
              <input
                id="icon"
                className="field font-mono text-sm"
                value={f.icon}
                placeholder="URL gambar atau slug SimpleIcons (contoh: google, meta, vercel)"
                onChange={(e) => set("icon", e.target.value)}
              />
              <p className="help">
                Unggah logo di sebelah kiri, atau ketik nama slug brand (dari simpleicons.org). Kosongkan jika tidak memakai ikon.
              </p>
              {f.icon && getBrandIcon(f.icon) && (
                <div className="flex items-center gap-2 pt-1 text-sm text-ink">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-line bg-surface-2 p-1">
                    <TechIcon icon={getBrandIcon(f.icon)} size={18} />
                  </div>
                  <span className="text-xs text-muted">Preview ikon brand: {getBrandIcon(f.icon).title}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="highlights">Hal yang dikerjakan</label>
          <textarea
            id="highlights"
            rows={6}
            className="field"
            value={highlights}
            placeholder={"Satu poin per baris.\nContoh: Memangkas waktu build dari 12 menit jadi 3 menit."}
            onChange={(e) => {
              setHighlights(e.target.value);
              queue({ highlights: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) });
            }}
          />
        </div>

        <div>
          <label className="label" htmlFor="tech">Teknologi</label>
          <TagInput id="tech" value={f.tech} onChange={(v) => set("tech", v)} placeholder="Ketik lalu Enter" />
        </div>
      </div>

      <div className="mt-12 border-t border-line pt-6">
        <button type="button" className="btn btn-sm" onClick={() => setConfirm(true)}>
          <Trash size={16} /> Hapus pengalaman
        </button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Hapus pengalaman ini?"
        message="Entri ini akan dihapus permanen dari timeline."
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
        busy={busy}
      />
    </div>
  );
}
