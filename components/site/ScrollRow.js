"use client";

import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";

/** Horizontal scroll-snap strip with previous/next buttons. */
export default function ScrollRow({ children }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <div>
      <div
        ref={ref}
        className="snap-strip -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 md:-mx-8 md:px-8"
      >
        {children}
      </div>
      <div className="mt-6 flex gap-2">
        <button type="button" className="btn btn-icon" aria-label="Scroll left" onClick={() => scroll(-1)}>
          <ArrowLeft size={16} />
        </button>
        <button type="button" className="btn btn-icon" aria-label="Scroll right" onClick={() => scroll(1)}>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
