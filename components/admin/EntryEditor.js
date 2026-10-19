"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, GearSix, Trash, X } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { useAutosave } from "./useAutosave";
import RichEditor from "./RichEditor";
import ImageField from "./ImageField";
import TagInput from "./TagInput";
import SaveStatus from "./SaveStatus";
import ConfirmDialog from "./ConfirmDialog";

const CONFIG = {
  posts: {
    label: "Tulisan",
    back: "/admin/blog",
    publicBase: "/blog",
    shortField: "excerpt",
    shortPlaceholder: "Ringkasan satu atau dua kalimat. Tampil di daftar tulisan dan hasil pencarian.",
    listKey: "tags",
    listLabel: "Tag",
    listPlaceholder: "react, tips, nextjs",
  },
  projects: {
    label: "Project",
    back: "/admin/projects",
    publicBase: "/projects",
    shortField: "summary",
    shortPlaceholder: "Apa yang dikerjakan project ini, dalam satu atau dua kalimat.",
    listKey: "tech",
    listLabel: "Teknologi",
    listPlaceholder: "Next.js, PostgreSQL, Tailwind",
  },
};

function Field({ id, label, help, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {help && <p className="help">{help}</p>}
    </div>
  );
}

/** Notion-style editor for blog posts and projects. Everything autosaves. */
export default function EntryEditor({ kind, initial }) {
  const cfg = CONFIG[kind];
  const router = useRouter();
  const [doc, setDoc] = useState(initial);
  const [panel, setPanel] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const shortRef = useRef(null);

  const { status, error, queue, flush } = useAutosave({
    kind,
    id: initial.id,
    onSaved: (saved) =>
      // The server owns slug and timestamps; everything else stays as typed.
      setDoc((d) => ({ ...d, slug: saved.slug, published_at: saved.published_at, slug_auto: saved.slug_auto })),
  });

  function set(field, value, opts) {
    setDoc((d) => ({ ...d, [field]: value }));
    queue({ [field]: value }, opts);
  }

  async function togglePublish() {
    if (!doc.published && !doc.title.trim()) {
      setNotice("Beri judul dulu sebelum dipublikasikan.");
      return;
    }
    setNotice("");
    const next = !doc.published;
    setDoc((d) => ({ ...d, published: next }));
    queue({ published: next }, { immediate: true });
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/${kind}/${doc.id}`, { method: "DELETE" });
      router.push(cfg.back);
      router.refresh();
    } catch (e) {
      setNotice(e.message);
      setDeleting(false);
      setConfirm(false);
    }
  }

  const previewHref = `${cfg.publicBase}/${doc.slug}`;

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-md md:px-6">
        <Link href={cfg.back} onClick={flush} className="btn btn-sm border-transparent text-muted hover:text-ink">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">{cfg.label}</span>
        </Link>

        <span className={`chip ${doc.published ? "!border-ok/40 !text-ok" : ""}`}>
          {doc.published ? "Terbit" : "Draft"}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <SaveStatus status={status} error={error} />
          <a href={previewHref} target="_blank" rel="noopener noreferrer" className="btn btn-sm" onClick={flush}>
            <Eye size={16} /> <span className="hidden sm:inline">Lihat</span>
          </a>
          <button
            type="button"
            className="btn btn-sm btn-icon lg:hidden"
            aria-label="Buka pengaturan"
            aria-expanded={panel}
            onClick={() => setPanel((v) => !v)}
          >
            <GearSix size={16} />
          </button>
          <button
            type="button"
            className={`btn btn-sm ${doc.published ? "" : "btn-primary"}`}
            onClick={togglePublish}
          >
            {doc.published ? "Batalkan terbit" : "Publikasikan"}
          </button>
        </div>
      </header>

      {notice && (
        <p role="alert" className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-center text-sm text-danger">
          {notice}
        </p>
      )}

      <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-4 pb-24 pt-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Writing surface */}
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-8">
            <ImageField
              value={doc.cover}
              onChange={(url) => set("cover", url)}
              aspect="21 / 9"
              compact
              label="Gambar sampul"
            />
          </div>

          <label htmlFor="title" className="sr-only">Judul</label>
          <textarea
            id="title"
            value={doc.title}
            rows={1}
            placeholder="Judul"
            onChange={(e) => {
              set("title", e.target.value.replace(/\n/g, " "));
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                shortRef.current?.focus();
              }
            }}
            className="w-full resize-none overflow-hidden bg-transparent text-4xl font-semibold leading-[1.15] tracking-tighter text-ink outline-none placeholder:text-faint md:text-5xl"
          />

          <label htmlFor="short" className="sr-only">Ringkasan</label>
          <textarea
            id="short"
            ref={shortRef}
            value={doc[cfg.shortField]}
            rows={2}
            maxLength={300}
            placeholder={cfg.shortPlaceholder}
            onChange={(e) => set(cfg.shortField, e.target.value)}
            className="mt-4 w-full resize-none bg-transparent text-lg leading-relaxed text-muted outline-none placeholder:text-faint"
          />

          <div className="mt-6 border-t border-line pt-6">
            <RichEditor
              initialMarkdown={initial.content}
              onChange={(getMd) => queue({ content: getMd })}
            />
          </div>
        </div>

        {/* Settings side panel */}
        <aside
          className={`${
            panel ? "fixed inset-x-0 bottom-0 top-14 z-30 overflow-y-auto bg-bg p-5" : "hidden"
          } lg:sticky lg:top-24 lg:block lg:self-start lg:p-0`}
          aria-label="Pengaturan"
        >
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h2 className="font-medium">Pengaturan</h2>
            <button type="button" className="btn btn-sm btn-icon" aria-label="Tutup" onClick={() => setPanel(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="space-y-6 rounded-[10px] border border-line bg-surface p-5">
            <Field
              id="slug"
              label="Alamat (slug)"
              help={`${cfg.publicBase}/${doc.slug}${
                doc.slug_auto && !doc.published ? " (otomatis dari judul)" : ""
              }`}
            >
              <input
                id="slug"
                className="field font-mono text-sm"
                value={doc.slug}
                onChange={(e) => setDoc((d) => ({ ...d, slug: e.target.value }))}
                onBlur={(e) => queue({ slug: e.target.value }, { immediate: true })}
              />
            </Field>

            <Field id="list" label={cfg.listLabel} help="Tekan Enter atau koma untuk menambah.">
              <TagInput
                id="list"
                value={doc[cfg.listKey]}
                onChange={(v) => set(cfg.listKey, v)}
                placeholder={cfg.listPlaceholder}
              />
            </Field>

            {kind === "projects" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="year" label="Tahun">
                    <input
                      id="year"
                      className="field"
                      value={doc.year}
                      placeholder="2026"
                      onChange={(e) => set("year", e.target.value)}
                    />
                  </Field>
                  <Field id="role" label="Peran">
                    <input
                      id="role"
                      className="field"
                      value={doc.role}
                      placeholder="Solo developer"
                      onChange={(e) => set("role", e.target.value)}
                    />
                  </Field>
                </div>
                <Field id="live" label="Link situs">
                  <input
                    id="live"
                    type="url"
                    className="field"
                    value={doc.live_url}
                    placeholder="https://"
                    onChange={(e) => set("live_url", e.target.value)}
                  />
                </Field>
                <Field id="repo" label="Link repositori">
                  <input
                    id="repo"
                    type="url"
                    className="field"
                    value={doc.repo_url}
                    placeholder="https://github.com/"
                    onChange={(e) => set("repo_url", e.target.value)}
                  />
                </Field>
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={doc.featured}
                    onChange={(e) => set("featured", e.target.checked, { immediate: true })}
                    className="mt-1 h-4 w-4 accent-[#4a82ff]"
                  />
                  <span>
                    <span className="block text-sm text-ink">Tampilkan di beranda</span>
                    <span className="help !mt-0 block">Maksimal 4 project unggulan.</span>
                  </span>
                </label>
              </>
            )}
          </div>

          <button type="button" className="btn btn-danger btn-sm mt-4" onClick={() => setConfirm(true)}>
            <Trash size={14} /> Hapus {cfg.label.toLowerCase()}
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm}
        busy={deleting}
        title={`Hapus ${cfg.label.toLowerCase()} ini?`}
        message="Tindakan ini tidak bisa dibatalkan."
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
