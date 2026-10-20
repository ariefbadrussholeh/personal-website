"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";

/** A thin accent line under the nav that fills as you read. */
export default function ReadingProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, restDelta: 0.001 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-16 z-40 h-0.5 origin-left bg-accent"
    />
  );
}
