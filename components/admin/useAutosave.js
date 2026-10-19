"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";

/**
 * Debounced autosave. Call `queue({ field: value })` on every change.
 * Values may be functions, evaluated lazily at save time (handy for the editor body).
 */
export function useAutosave({ kind, id, onSaved, delay = 900 }) {
  const [status, setStatus] = useState("saved"); // saved | dirty | saving | error
  const [error, setError] = useState("");
  const pending = useRef({});
  const timer = useRef(null);
  const inflight = useRef(false);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (inflight.current) return;
    const entries = Object.entries(pending.current);
    if (!entries.length) return;
    pending.current = {};
    inflight.current = true;
    setStatus("saving");

    const patch = Object.fromEntries(entries.map(([k, v]) => [k, typeof v === "function" ? v() : v]));
    try {
      const saved = await api(`/api/${kind}/${id}`, { method: "PATCH", body: patch });
      onSavedRef.current?.(saved);
      setError("");
      inflight.current = false;
      if (Object.keys(pending.current).length) {
        setStatus("dirty");
        timer.current = setTimeout(flush, 300);
      } else {
        setStatus("saved");
      }
    } catch (e) {
      pending.current = { ...patch, ...pending.current };
      inflight.current = false;
      setError(e.message);
      setStatus("error");
      timer.current = setTimeout(flush, 4000); // retry
    }
  }, [kind, id]);

  const queue = useCallback(
    (changes, { immediate = false } = {}) => {
      Object.assign(pending.current, changes);
      setStatus((s) => (s === "saving" ? s : "dirty"));
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, immediate ? 0 : delay);
    },
    [flush, delay]
  );

  // Warn before leaving with unsaved work.
  useEffect(() => {
    const onBefore = (e) => {
      if (Object.keys(pending.current).length || inflight.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBefore);
    return () => {
      window.removeEventListener("beforeunload", onBefore);
      clearTimeout(timer.current);
    };
  }, []);

  return { status, error, queue, flush };
}
