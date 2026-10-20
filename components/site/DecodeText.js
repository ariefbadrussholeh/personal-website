"use client";

import { useEffect, useRef } from "react";

const GLYPHS = "abcdefghijklmnopqrstuvwxyz0123456789<>/_{}[]";

/** Resolves from random characters into the real text once on load. Use with a monospace font. */
export default function DecodeText({ text, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const steps = 20;
    let frame = 0;
    let timer;
    const tick = () => {
      frame += 1;
      const solved = Math.floor((frame / steps) * text.length);
      el.textContent = text
        .split("")
        .map((c, i) => (c === " " || i < solved ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("");
      if (frame < steps) timer = setTimeout(tick, 38);
      else el.textContent = text;
    };
    timer = setTimeout(tick, 300);
    return () => {
      clearTimeout(timer);
      el.textContent = text;
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
