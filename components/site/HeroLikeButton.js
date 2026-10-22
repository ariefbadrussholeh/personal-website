"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Heart } from "@phosphor-icons/react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

/**
 * Simple, spammable heart like button for the hero section.
 * - Single heart icon, no combo badge, no emoji rain.
 * - Subtle scale pop on click + one small heart floats up.
 * - Debounced batch sync to backend.
 */
export default function HeroLikeButton({ initialCount = 0, initialLiked = false }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [floaters, setFloaters] = useState([]);
  const [bump, setBump] = useState(false);

  const pendingRef = useRef(0);
  const syncTimerRef = useRef(null);

  // Debounced flush to backend
  const flushSync = useCallback(async () => {
    const amount = pendingRef.current;
    if (amount <= 0) return;
    pendingRef.current = 0;

    try {
      const res = await fetch("/api/public/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "site", count: amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.count === "number") {
        setCount(data.count);
        setLiked(true);
      }
    } catch {
      // Best effort — optimistic count already visible
    }
  }, []);

  const handleClick = (e) => {
    e.preventDefault();

    // Optimistic increment
    setCount((c) => c + 1);
    setLiked(true);
    pendingRef.current += 1;

    // Tiny bump animation trigger
    setBump(true);
    setTimeout(() => setBump(false), 200);

    // Spawn one small floating heart
    if (!reduce) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      const xOffset = (Math.random() - 0.5) * 20; // -10 to +10 px
      setFloaters((prev) => [...prev.slice(-8), { id, x: xOffset }]);
    }

    // Debounced sync (650ms after last click)
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(flushSync, 650);
  };

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      flushSync();
    };
  }, [flushSync]);

  const removeFloater = (id) =>
    setFloaters((prev) => prev.filter((f) => f.id !== id));

  return (
    <div className="relative inline-flex items-center">
      {/* Subtle floating hearts */}
      <AnimatePresence>
        {floaters.map((f) => (
          <motion.span
            key={f.id}
            initial={{ opacity: 0.9, scale: 0.7, x: f.x * 0.3, y: 0 }}
            animate={{ opacity: 0, scale: 1, x: f.x, y: -38 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.2, 0, 0.4, 1] }}
            onAnimationComplete={() => removeFloater(f.id)}
            className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 select-none text-[11px] text-accent"
            style={{ zIndex: 20 }}
            aria-hidden
          >
            ♥
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Heart button */}
      <motion.button
        type="button"
        onClick={handleClick}
        animate={reduce ? {} : { scale: bump ? 1.22 : 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 20 }}
        aria-label="Sukai website ini (bisa diklik berkali-kali)"
        className={`btn group relative gap-2 select-none ${
          liked
            ? "!border-accent/50 !bg-accent/10 !text-accent"
            : "hover:border-accent/30 hover:text-accent"
        }`}
      >
        <motion.span
          animate={reduce ? {} : { scale: bump ? 1.3 : 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
          className={`flex ${liked ? "text-accent" : "text-muted group-hover:text-accent"}`}
        >
          <Heart size={18} weight={liked ? "fill" : "regular"} />
        </motion.span>
        <span className="font-mono text-sm tabular-nums">{count}</span>
      </motion.button>
    </div>
  );
}
