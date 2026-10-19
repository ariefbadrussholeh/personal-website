"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

/** Type a tag, press Enter or comma to add it. Backspace removes the last one. */
export default function TagInput({ id, value, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  function addMany(list) {
    const next = [...value];
    for (const raw of list) {
      const t = raw.trim();
      if (t && !next.includes(t)) next.push(t);
    }
    if (next.length !== value.length) onChange(next);
  }

  function commit() {
    addMany([draft]);
    setDraft("");
  }

  return (
    <div className="field flex min-h-[2.75rem] flex-wrap items-center gap-1.5 !py-1.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(74,130,255,0.22)]">
      {value.map((t) => (
        <span key={t} className="chip gap-1 !h-6 pr-1">
          {t}
          <button
            type="button"
            aria-label={`Hapus ${t}`}
            className="rounded-[4px] p-0.5 text-faint hover:text-ink"
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        placeholder={value.length ? "" : placeholder}
        className="min-w-[6rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-faint"
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) {
            const parts = v.split(",");
            const rest = parts.pop();
            addMany(parts);
            setDraft(rest);
          } else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
