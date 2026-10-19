"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Plus } from "@phosphor-icons/react";
import { api } from "@/lib/client";

/** Creates an empty draft, then opens it in the editor. */
export default function NewButton({ kind, editBase, label = "Baru", className = "btn btn-primary" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create() {
    setBusy(true);
    setError("");
    try {
      const entry = await api(`/api/${kind}`, { method: "POST" });
      router.push(`${editBase}/${entry.id}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" className={className} onClick={create} disabled={busy}>
        {busy ? <CircleNotch size={16} className="animate-spin" /> : <Plus size={16} />} {label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
