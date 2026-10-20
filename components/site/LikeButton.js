"use client";

import { useState } from "react";
import { Heart } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";

/** Optimistic like toggle. One like per visitor, tap again to remove it. */
export default function LikeButton({ target, initialCount, initialLiked, subject = "this" }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ count: initialCount, liked: initialLiked });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    if (busy) return;
    const before = state;
    setState({ count: before.count + (before.liked ? -1 : 1), liked: !before.liked });
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/public/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save your like.");
      setState({ count: data.count, liked: data.liked });
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
        onClick={toggle}
        aria-pressed={state.liked}
        aria-label={`${state.liked ? "Remove like from" : "Like"} ${subject}`}
        className={`btn gap-2 ${state.liked ? "!border-accent/60 !text-accent" : ""}`}
      >
        <motion.span
          key={state.liked ? "on" : "off"}
          initial={false}
          animate={reduce ? undefined : { scale: state.liked ? [1, 1.4, 1] : 1 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
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
