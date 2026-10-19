"use client";

import { useRef, useState } from "react";
import { CircleNotch, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { uploadImage } from "@/lib/client";

/** Click-or-drop single image upload with preview. */
export default function ImageField({ value, onChange, label, aspect = "16 / 9", compact = false }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);

  async function handle(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {label && <span className="label">{label}</span>}
      <div
        style={{ aspectRatio: aspect }}
        className={`relative overflow-hidden rounded-[10px] border ${
          over ? "border-accent bg-surface-2" : "border-line-strong bg-surface"
        } transition-colors`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files?.[0]);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted transition-colors hover:text-ink"
          >
            <ImageSquare size={compact ? 22 : 30} />
            <span className={compact ? "text-xs" : "text-sm"}>Klik atau seret gambar ke sini</span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <CircleNotch size={24} className="animate-spin text-accent" />
          </div>
        )}

        {value && !busy && (
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button type="button" className="btn btn-sm bg-bg/80 backdrop-blur" onClick={() => input.current?.click()}>
              <UploadSimple size={14} /> Ganti
            </button>
            <button
              type="button"
              className="btn btn-sm btn-icon bg-bg/80 backdrop-blur"
              aria-label="Hapus gambar"
              onClick={() => onChange("")}
            >
              <Trash size={14} />
            </button>
          </div>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
