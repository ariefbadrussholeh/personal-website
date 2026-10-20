"use client";

import { useEffect } from "react";

/**
 * One delegated listener that feeds the cursor position into CSS variables
 * (--mx, --my) of every [data-spotlight] element under the pointer.
 * The visuals live in globals.css, so React never re-renders on mouse move.
 */
export default function PointerEffects() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    let frame = 0;
    let last = null;

    const apply = () => {
      frame = 0;
      if (!last) return;
      let el = last.target instanceof Element ? last.target.closest("[data-spotlight]") : null;
      while (el) {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${last.clientX - r.left}px`);
        el.style.setProperty("--my", `${last.clientY - r.top}px`);
        el = el.parentElement?.closest("[data-spotlight]") || null;
      }
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
