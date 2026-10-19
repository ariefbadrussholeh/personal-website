"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";

/** Masonry gallery with a keyboard-friendly lightbox. */
export default function Gallery({ photos }) {
  const [index, setIndex] = useState(null);
  const open = index !== null;
  const count = photos.length;

  const go = useCallback((dir) => setIndex((i) => (i === null ? i : (i + dir + count) % count)), [count]);
  const close = useCallback(() => setIndex(null), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, go, close]);

  if (!count) {
    return (
      <div className="rounded-[10px] border border-dashed border-line-strong px-6 py-16 text-center">
        <p className="text-lg font-medium">This album is empty.</p>
        <p className="mt-2 text-muted">Photos will appear here once they are added.</p>
      </div>
    );
  }

  const current = open ? photos[index] : null;

  return (
    <>
      <ul className="columns-2 gap-3 md:columns-3 md:gap-4">
        {photos.map((p, i) => (
          <li key={p.id} className="mb-3 break-inside-avoid md:mb-4">
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-label={p.caption ? `Open photo: ${p.caption}` : `Open photo ${i + 1}`}
              className="group block w-full overflow-hidden rounded-[10px] border border-line bg-surface-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption || ""}
                loading="lazy"
                style={p.width && p.height ? { aspectRatio: `${p.width} / ${p.height}` } : undefined}
                className="block h-auto w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fade-in fixed inset-0 z-50 flex flex-col bg-black/92 backdrop-blur-sm"
          onClick={close}
        >
          <div className="flex items-center justify-between px-5 py-4 text-sm text-muted">
            <span className="font-mono">
              {index + 1} / {count}
            </span>
            <button type="button" className="btn btn-icon" aria-label="Close viewer" onClick={close}>
              <X size={18} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-20">
            <button
              type="button"
              aria-label="Previous photo"
              className="btn btn-icon absolute left-3 top-1/2 -translate-y-1/2 bg-bg/70 md:left-6"
              onClick={(e) => {
                e.stopPropagation();
                go(-1);
              }}
            >
              <ArrowLeft size={18} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.id}
              src={current.url}
              alt={current.caption || ""}
              onClick={(e) => e.stopPropagation()}
              className="rise-in max-h-full max-w-full rounded-[10px] object-contain"
            />
            <button
              type="button"
              aria-label="Next photo"
              className="btn btn-icon absolute right-3 top-1/2 -translate-y-1/2 bg-bg/70 md:right-6"
              onClick={(e) => {
                e.stopPropagation();
                go(1);
              }}
            >
              <ArrowRight size={18} />
            </button>
          </div>

          <p className="min-h-[3.5rem] px-6 py-4 text-center text-sm text-muted" onClick={(e) => e.stopPropagation()}>
            {current.caption}
          </p>
        </div>
      )}
    </>
  );
}
