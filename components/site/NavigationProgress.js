"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

/**
 * A top-of-page progress bar that appears during route navigations.
 * Styled to match the ReadingProgress bar (accent colour, same position).
 *
 * It works by detecting pathname / search-param changes:
 *  1. On click of any internal <a>, the bar starts animating.
 *  2. When the pathname actually changes, the bar completes and fades out.
 */
export default function NavigationProgress() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState("idle"); // idle | loading | complete
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const trickleRef = useRef(null);

  // Clean up all timers
  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trickleRef.current) clearInterval(trickleRef.current);
  }, []);

  // Start the progress bar
  const start = useCallback(() => {
    cleanup();
    setState("loading");
    setProgress(0);

    // Fast initial jump
    timerRef.current = setTimeout(() => setProgress(20), 0);

    // Trickle up slowly
    trickleRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 30 ? 8 : p < 60 ? 4 : p < 80 ? 2 : 0.5;
        return Math.min(p + step, 90);
      });
    }, 300);
  }, [cleanup]);

  // Complete the progress bar
  const complete = useCallback(() => {
    cleanup();
    setProgress(100);
    setState("complete");
    timerRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 400);
  }, [cleanup]);

  // Listen for internal link clicks to start the bar immediately
  useEffect(() => {
    const handleClick = (e) => {
      const anchor = e.target.closest("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore external, hash, download, or new-tab links
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        href.startsWith("http") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href === "#" ||
        (href.startsWith("#") && !href.includes("/"))
      ) {
        return;
      }

      // Skip same-page navigations (same path, only hash changed)
      const url = new URL(href, window.location.origin);
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  // Complete when the route actually changes
  useEffect(() => {
    if (state === "loading") {
      complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  if (reduce) return null;

  return (
    <AnimatePresence>
      {state !== "idle" && (
        <motion.div
          aria-hidden
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-x-0 top-0 z-[60] h-[2.5px]"
        >
          <motion.div
            className="h-full bg-accent origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={{
              duration: state === "complete" ? 0.2 : 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: "left" }}
          />
          {/* Glowing tip */}
          {state === "loading" && (
            <div
              className="absolute right-0 top-0 h-full w-20"
              style={{
                transform: `translateX(${-(1 - progress / 100) * 100}%)`,
                background:
                  "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent))",
                boxShadow: "0 0 8px var(--color-accent), 0 0 4px var(--color-accent)",
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

