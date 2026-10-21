"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CircleNotch, Eye, ImagesSquare, Star, Trash, UploadSimple, WarningCircle, Scissors, VideoCamera,
} from "@phosphor-icons/react";
import { api, uploadMedia } from "@/lib/client";
import { isVideoUrl } from "@/lib/format";
import { useAutosave } from "./useAutosave";
import SaveStatus from "./SaveStatus";
import ConfirmDialog from "./ConfirmDialog";
import VideoTrimmerModal from "./VideoTrimmerModal";

const CONCURRENCY = 3;

export default function AlbumEditor({ initial }) {
  const router = useRouter();
  const [doc, setDoc] = useState({ ...initial, photos: undefined });
  const [photos, setPhotos] = useState(initial.photos);
  const [uploads, setUploads] = useState([]); // { id, name, state: 'uploading' | 'error', error }
  const [over, setOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const [trimmingFile, setTrimmingFile] = useState(null);
  const input = useRef(null);
  const trimInput = useRef(null);

  const { status, error, queue, flush } = useAutosave({
    kind: "albums",
    id: initial.id,
    onSaved: (saved) => setDoc((d) => ({ ...d, slug: saved.slug, published_at: saved.published_at, slug_auto: saved.slug_auto })),
  });

  function set(field, value, opts) {
    setDoc((d) => ({ ...d, [field]: value }));
    queue({ [field]: value }, opts);
  }

  /* ----- uploading ------------------------------------------------- */

  async function uploadFiles(fileList) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    const items = files.map((file, i) => ({ id: `${Date.now()}-${i}`, file }));
    setUploads((u) => [...u, ...items.map((i) => ({ id: i.id, name: i.file.name, state: "uploading" }))]);

    const queueList = [...items];
    const worker = async () => {
      while (queueList.length) {
        const item = queueList.shift();
        try {
          const meta = await uploadMedia(item.file);
          const added = await api(`/api/album-photos/${doc.id}`, { method: "POST", body: { photos: [meta] } });
          setPhotos(added);
          setUploads((u) => u.filter((x) => x.id !== item.id));
        } catch (e) {
          setUploads((u) => u.map((x) => (x.id === item.id ? { ...x, state: "error", error: e.message } : x)));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  }

  async function handleTrimmedUpload(trimmedFile, { width, height } = {}) {
    setTrimmingFile(null);
    const item = { id: `${Date.now()}`, file: trimmedFile };
    setUploads((u) => [...u, { id: item.id, name: item.file.name, state: "uploading" }]);
    try {
      const meta = await uploadMedia(item.file, { width, height });
      const added = await api(`/api/album-photos/${doc.id}`, { method: "POST", body: { photos: [meta] } });
      setPhotos(added);
      setUploads((u) => u.filter((x) => x.id !== item.id));
    } catch (e) {
      setUploads((u) => u.map((x) => (x.id === item.id ? { ...x, state: "error", error: e.message } : x)));
    }
  }

  /* ----- photo actions --------------------------------------------- */

  async function saveCaption(photo, caption) {
    if (caption === photo.caption) return;
    setPhotos((list) => list.map((p) => (p.id === photo.id ? { ...p, caption } : p)));
    try {
      await api(`/api/photos/${photo.id}`, { method: "PATCH", body: { caption } });
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function removePhoto(photo) {
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
    if (doc.cover === photo.url) setDoc((d) => ({ ...d, cover: "" }));
    try {
      await api(`/api/photos/${photo.id}`, { method: "DELETE" });
    } catch (e) {
      setNotice(e.message);
      setPhotos(await api(`/api/albums/${doc.id}`).then((a) => a.photos));
    }
  }

  async function drop(toIndex) {
    if (dragIndex === null || dragIndex === toIndex) return setDragIndex(null);
    const next = [...photos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(toIndex, 0, moved);
    setPhotos(next);
    setDragIndex(null);
    try {
      await api(`/api/album-photos/${doc.id}`, { method: "PATCH", body: { order: next.map((p) => p.id) } });
    } catch (e) {
      setNotice(e.message);
    }
  }

  async function togglePublish() {
    if (!doc.published && !doc.title.trim()) return setNotice("Beri judul dulu sebelum dipublikasikan.");
    setNotice("");
    const next = !doc.published;
    setDoc((d) => ({ ...d, published: next }));
    queue({ published: next }, { immediate: true });
  }

  async function remove() {
    setDeleting(true);
    try {
      await api(`/api/albums/${doc.id}`, { method: "DELETE" });
      router.push("/admin/album");
      router.refresh();
    } catch (e) {
      setNotice(e.message);
      setDeleting(false);
      setConfirm(false);
    }
  }

  const effectiveCover = doc.cover || photos[0]?.url || "";

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-bg/90 px-4 backdrop-blur-md md:px-6">
        <Link href="/admin/album" onClick={flush} className="btn btn-sm border-transparent text-muted hover:text-ink">
          <ArrowLeft size={16} /> <span className="hidden sm:inline">Album</span>
        </Link>
        <span className={`chip ${doc.published ? "!border-ok/40 !text-ok" : ""}`}>{doc.published ? "Terbit" : "Draft"}</span>
        <div className="ml-auto flex items-center gap-2">
          <SaveStatus status={status} error={error} />
          <a href={`/album/${doc.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm" onClick={flush}>
            <Eye size={16} /> <span className="hidden sm:inline">Lihat</span>
          </a>
          <button type="button" className={`btn btn-sm ${doc.published ? "" : "btn-primary"}`} onClick={togglePublish}>
            {doc.published ? "Batalkan terbit" : "Publikasikan"}
          </button>
        </div>
      </header>

      {notice && (
        <p role="alert" className="border-b border-danger/30 bg-danger/10 px-6 py-2 text-center text-sm text-danger">{notice}</p>
      )}

      <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-10 md:px-8">
        <label htmlFor="title" className="sr-only">Judul album</label>
        <input
          id="title"
          value={doc.title}
          placeholder="Judul album"
          onChange={(e) => set("title", e.target.value)}
          className="w-full bg-transparent text-4xl font-semibold leading-[1.15] tracking-tighter text-ink outline-none placeholder:text-faint md:text-5xl"
        />
        <label htmlFor="desc" className="sr-only">Deskripsi</label>
        <textarea
          id="desc"
          rows={2}
          maxLength={300}
          value={doc.description}
          placeholder="Ceritakan sedikit tentang album ini."
          onChange={(e) => set("description", e.target.value)}
          className="mt-4 w-full max-w-2xl resize-none bg-transparent text-lg leading-relaxed text-muted outline-none placeholder:text-faint"
        />

        <div className="mt-4 flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-2">
            <label htmlFor="album-date" className="text-xs font-medium text-muted">Tanggal:</label>
            <input
              id="album-date"
              type="date"
              value={doc.date || ""}
              onChange={(e) => set("date", e.target.value)}
              className="field !h-8 !w-auto !py-1 text-sm font-mono"
            />
          </div>
          <p className="font-mono text-xs text-faint">/album/{doc.slug}</p>
        </div>

        {/* Drop zone */}
        <div
          className={`mt-10 flex flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed px-6 py-10 text-center transition-colors ${
            over ? "border-accent bg-accent/5" : "border-line-strong bg-surface"
          }`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) {
              e.preventDefault();
              setOver(true);
            }
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            if (!e.dataTransfer.files?.length) return;
            e.preventDefault();
            setOver(false);
            uploadFiles(e.dataTransfer.files);
          }}
        >
          <ImagesSquare size={32} className="text-muted" />
          <p className="text-ink">Seret foto atau video ke sini, atau pilih dari perangkat</p>
          <p className="text-sm text-faint">Foto (JPG, PNG, WebP, GIF) atau Video pendek (MP4, WebM, MOV). Maksimal 40 MB.</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <button type="button" className="btn btn-primary" onClick={() => input.current?.click()}>
              <UploadSimple size={16} /> Pilih foto / video
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => trimInput.current?.click()}
            >
              <Scissors size={15} /> Trim Video
            </button>
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={trimInput}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setTrimmingFile(e.target.files[0]);
              }
              e.target.value = "";
            }}
          />
        </div>

        {uploads.length > 0 && (
          <ul className="mt-4 space-y-2" aria-label="Status unggahan">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-center gap-3 rounded-[10px] border border-line bg-surface px-4 py-2.5 text-sm">
                {u.state === "uploading" ? (
                  <CircleNotch size={16} className="animate-spin text-accent" />
                ) : (
                  <WarningCircle size={16} className="text-danger" />
                )}
                <span className="truncate text-muted">{u.name}</span>
                {u.state === "error" && (
                  <>
                    <span className="ml-auto text-danger">{u.error}</span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setUploads((l) => l.filter((x) => x.id !== u.id))}
                    >
                      Tutup
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Photos & Videos */}
        {photos.length > 0 && (
          <>
            <div className="mb-4 mt-10 flex items-baseline justify-between">
              <h2 className="text-lg font-medium tracking-tight">{photos.length} item media</h2>
              <p className="text-sm text-faint">Seret item untuk mengubah urutan. Bintang menandai sampul album.</p>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p, i) => {
                const isVideo = isVideoUrl(p.url);
                return (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={() => setDragIndex(i)}
                    onDragOver={(e) => dragIndex !== null && e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      drop(i);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                    className={`group rounded-[10px] border bg-surface p-2 transition-opacity ${
                      dragIndex === i ? "opacity-40" : ""
                    } ${effectiveCover === p.url ? "border-accent/60" : "border-line"}`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded-[6px] bg-surface-2">
                      {isVideo ? (
                        <video
                          src={p.url}
                          muted
                          playsInline
                          preload="metadata"
                          className="h-full w-full cursor-grab object-cover"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt={p.caption || ""} draggable={false} className="h-full w-full cursor-grab object-cover" />
                      )}

                      {isVideo && (
                        <div className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur">
                          <VideoCamera size={12} weight="fill" /> Video
                        </div>
                      )}

                      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <button
                          type="button"
                          aria-label="Jadikan sampul"
                          aria-pressed={effectiveCover === p.url}
                          className={`btn btn-sm btn-icon bg-bg/85 backdrop-blur ${effectiveCover === p.url ? "!text-accent" : ""}`}
                          onClick={() => set("cover", p.url, { immediate: true })}
                        >
                          <Star size={14} weight={effectiveCover === p.url ? "fill" : "regular"} />
                        </button>
                        <button
                          type="button"
                          aria-label="Hapus media"
                          className="btn btn-sm btn-icon bg-bg/85 backdrop-blur"
                          onClick={() => removePhoto(p)}
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                    <input
                      aria-label={`Keterangan media ${i + 1}`}
                      defaultValue={p.caption}
                      placeholder="Keterangan"
                      maxLength={200}
                      onBlur={(e) => saveCaption(p, e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className="mt-2 w-full bg-transparent px-1 text-sm text-muted outline-none placeholder:text-faint focus:text-ink"
                    />
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <div className="mt-16 border-t border-line pt-6">
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>
            <Trash size={14} /> Hapus album
          </button>
        </div>
      </div>

      <VideoTrimmerModal
        open={Boolean(trimmingFile)}
        file={trimmingFile}
        onClose={() => setTrimmingFile(null)}
        onComplete={handleTrimmedUpload}
      />

      <ConfirmDialog
        open={confirm}
        busy={deleting}
        title="Hapus album ini?"
        message="Semua foto di dalamnya ikut terhapus. Tindakan ini tidak bisa dibatalkan."
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
