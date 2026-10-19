"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export default function CodeBlock({ lang, children }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(ref.current?.innerText ?? "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="group relative not-prose my-6">
      {lang && (
        <span className="absolute left-4 top-2.5 font-mono text-[11px] text-faint">{lang}</span>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy code"}
        className="btn btn-sm btn-icon absolute right-2 top-2 bg-surface opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
      <pre
        ref={ref}
        className={`overflow-x-auto rounded-[10px] border border-line bg-surface px-4 pb-4 font-mono text-[13.5px] leading-[1.7] text-[#d7dce4] ${
          lang ? "pt-9!" : "pt-4!"
        }`}
      >
        {children}
      </pre>
    </div>
  );
}
