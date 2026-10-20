"use client";

import { useState } from "react";
import { CheckCircle, CircleNotch, PaperPlaneTilt } from "@phosphor-icons/react";

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState("idle"); // idle | sending | sent
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  const bind = (key) => ({
    id: `ct-${key}`,
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `ct-${key}-err` : undefined,
    className: "field",
  });
  const err = (key) =>
    errors[key] ? (
      <p id={`ct-${key}-err`} className="mt-1.5 text-sm text-danger">{errors[key]}</p>
    ) : null;

  async function submit(e) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields || {});
        setFormError(data.fields ? "" : data.error || "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setFormError("Could not reach the server. Please try again.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="rise-in rounded-[10px] border border-line bg-surface p-8 md:p-10">
        <CheckCircle size={32} className="text-accent" />
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">Message sent</h2>
        <p className="mt-2 max-w-sm leading-relaxed text-muted">
          Thanks for reaching out. I read every message and reply within a few days.
        </p>
        <button
          type="button"
          className="btn mt-6"
          onClick={() => {
            setForm({ name: "", email: "", message: "" });
            setState("idle");
          }}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-[10px] border border-line bg-surface p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="ct-name" className="label">Name</label>
          <input {...bind("name")} maxLength={100} autoComplete="name" />
          {err("name")}
        </div>
        <div>
          <label htmlFor="ct-email" className="label">Email</label>
          <input {...bind("email")} type="email" maxLength={200} autoComplete="email" />
          {err("email")}
        </div>
      </div>

      <div>
        <label htmlFor="ct-message" className="label">Message</label>
        <textarea {...bind("message")} rows={7} maxLength={3000} className="field min-h-40 resize-y" />
        <div className="flex items-start justify-between gap-4">
          <div>{err("message")}</div>
          <p className="mt-1.5 shrink-0 font-mono text-xs text-faint">{form.message.length} / 3000</p>
        </div>
      </div>

      {/* Honeypot: hidden from people, tempting for bots */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="ct-website">Website</label>
        <input id="ct-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? <CircleNotch size={16} className="animate-spin" /> : <PaperPlaneTilt size={16} />}
          {state === "sending" ? "Sending" : "Send message"}
        </button>
        {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
      </div>
    </form>
  );
}
