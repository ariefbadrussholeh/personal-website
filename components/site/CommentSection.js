"use client";

import { useEffect, useState } from "react";
import { CircleNotch } from "@phosphor-icons/react";
import { formatDate } from "@/lib/format";

const NAME_KEY = "comment-name";

export default function CommentSection({ postId, initialComments }) {
  const [comments, setComments] = useState(initialComments);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) || "");
    } catch {}
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const res = await fetch("/api/public/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, name, body, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrors(data.fields || {});
        setFormError(data.fields ? "" : data.error || "Something went wrong. Please try again.");
        return;
      }
      if (data.comment) setComments((list) => [...list, data.comment]);
      setBody("");
      try {
        localStorage.setItem(NAME_KEY, name);
      } catch {}
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="comments-title" className="max-w-3xl">
      <h2 id="comments-title" className="text-2xl font-semibold tracking-tight">
        Comments <span className="font-mono text-lg text-faint">{comments.length}</span>
      </h2>

      {comments.length === 0 ? (
        <p className="mt-6 rounded-[10px] border border-dashed border-line-strong px-5 py-8 text-center text-muted">
          No comments yet. Be the first to say something.
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {comments.map((c) => (
            <li key={c.id} className="rise-in flex gap-4">
              <span
                aria-hidden
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface-2 font-medium uppercase text-accent"
              >
                {c.name.trim().charAt(0) || "?"}
              </span>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="font-medium text-ink">{c.name}</span>
                  <span className="ml-3 font-mono text-faint">{formatDate(c.created_at)}</span>
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words leading-relaxed text-muted">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} noValidate className="mt-10 space-y-5 rounded-[10px] border border-line bg-surface p-5 md:p-6">
        <h3 className="font-medium tracking-tight">Leave a comment</h3>

        <div>
          <label htmlFor="c-name" className="label">Name</label>
          <input
            id="c-name"
            className="field"
            value={name}
            maxLength={60}
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "c-name-err" : undefined}
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name && <p id="c-name-err" className="mt-1.5 text-sm text-danger">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="c-body" className="label">Comment</label>
          <textarea
            id="c-body"
            className="field min-h-28 resize-y"
            value={body}
            maxLength={1500}
            aria-invalid={!!errors.body}
            aria-describedby={errors.body ? "c-body-err" : undefined}
            onChange={(e) => setBody(e.target.value)}
          />
          {errors.body && <p id="c-body-err" className="mt-1.5 text-sm text-danger">{errors.body}</p>}
        </div>

        {/* Honeypot: hidden from people, tempting for bots */}
        <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="c-website">Website</label>
          <input id="c-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy && <CircleNotch size={16} className="animate-spin" />} {busy ? "Posting" : "Post comment"}
          </button>
          {formError && <p role="alert" className="text-sm text-danger">{formError}</p>}
        </div>
      </form>
    </section>
  );
}
