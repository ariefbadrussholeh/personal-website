"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion, AnimatePresence } from "motion/react";

/**
 * A top-of-page progress bar that appears during route navigations.
 * Styled to match the accent colour with a glowing leading edge.
 *
 * Active across both the public site and admin dashboard.
 * Triggers on:
 *  1. Clicking internal <a> links (e.g. Next.js <Link>).
 *  2. Programmatic router.push / history.pushState calls.
 *  3. Browser back/forward navigation (popstate).
 * Completes when:
 *  - The route pathname / searchParams change, or after a safety timeout.
 */
export default function NavigationProgress() {
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [state, setState] = useState("idle"); // idle | loading | complete
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const trickleRef = useRef(null);
  const safetyRef = useRef(null);

  // Clean up all active timers
  const cleanup = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (trickleRef.current) clearInterval(trickleRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
  }, []);

  // Complete and fade out the progress bar
  const complete = useCallback(() => {
    cleanup();
    setProgress(100);
    setState("complete");
    timerRef.current = setTimeout(() => {
      setState("idle");
      setProgress(0);
    }, 400);
  }, [cleanup]);

  // Start animating the progress bar
  const start = useCallback(() => {
    cleanup();
    setState("loading");
    setProgress(0);

    // Initial rapid jump to show responsiveness
    timerRef.current = setTimeout(() => setProgress(24), 10);

    // Trickle upward gradually
    trickleRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 35 ? 7 : p < 65 ? 3.5 : p < 82 ? 1.5 : 0.4;
        return Math.min(p + step, 90);
      });
    }, 250);

    // Safety timeout: auto-complete if navigation takes too long or aborts
    safetyRef.current = setTimeout(() => {
      complete();
    }, 8000);
  }, [cleanup, complete]);

  // 1. Listen for clicks on internal <a> links
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
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href === "#" ||
        (href.startsWith("#") && !href.includes("/"))
      ) {
        return;
      }

      // Skip if staying on the exact same path and query
      try {
        const url = new URL(href, window.location.origin);
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return;
        }
      } catch {
        // invalid URL, ignore
        return;
      }

      start();
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start]);

  // 2. Intercept history.pushState / history.replaceState and popstate
  useEffect(() => {
    const origPush = window.history.pushState;
    const origReplace = window.history.replaceState;

    window.history.pushState = function (...args) {
      start();
      return origPush.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      // only trigger on actual path change
      if (args[2] && String(args[2]) !== window.location.pathname + window.location.search) {
        start();
      }
      return origReplace.apply(this, args);
    };

    const handlePopState = () => start();
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [start]);

  // 3. Complete when pathname or searchParams change
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
          className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[2.5px]"
        >
          <motion.div
            className="h-full bg-accent origin-left"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress / 100 }}
            transition={{
              duration: state === "complete" ? 0.2 : 0.35,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{ transformOrigin: "left" }}
          />
          {/* Glowing leading edge */}
          {state === "loading" && (
            <div
              className="absolute right-0 top-0 h-full w-24"
              style={{
                transform: `translateX(${-(1 - progress / 100) * 100}%)`,
                background:
                  "linear-gradient(to right, transparent, color-mix(in srgb, var(--color-accent) 70%, transparent))",
                boxShadow: "0 0 10px var(--color-accent), 0 0 4px var(--color-accent)",
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
