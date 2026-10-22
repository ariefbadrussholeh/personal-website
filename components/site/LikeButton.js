"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

/** Optimistic like button. Spammable, adds likes without removing. */
export default function LikeButton({ target, initialCount, initialLiked, subject = "this" }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ count: initialCount || 0, liked: Boolean(initialLiked) });
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleLike() {
    if (busy) return;
    const before = state;
    setState({ count: before.count + 1, liked: true });
    setTick((t) => t + 1);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, count: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your like.");
      setState({ count: data.count, liked: true });
    } catch (e) {
      setState(before);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleLike}
        aria-pressed={state.liked}
        aria-label={`Like ${subject}`}
        className={`btn gap-2 transition-transform active:scale-95 ${state.liked ? "!border-accent/60 !text-accent" : ""}`}
      >
        <motion.span
          key={tick}
          initial={false}
          animate={reduce ? undefined : { scale: [1, 1.35, 1] }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex"
        >
          <Heart size={18} weight={state.liked ? "fill" : "regular"} />
        </motion.span>
        <span aria-live="polite" className="font-mono tabular-nums">{state.count}</span>
      </button>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
    </span>
  );
}
