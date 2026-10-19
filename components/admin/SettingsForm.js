"use client";

import { useRef, useState } from "react";
import { CheckCircle } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import ImageField from "./ImageField";
import RichEditor from "./RichEditor";

function Field({ id, label, help, children }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {help && <p className="help">{help}</p>}
    </div>
  );
}

export default function SettingsForm({ initial }) {
  const [s, setS] = useState(initial);
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const [error, setError] = useState("");
  const aboutRef = useRef(initial.about);

  const bind = (key) => ({
    id: key,
    className: "field",
    value: s[key],
    onChange: (e) => setS((v) => ({ ...v, [key]: e.target.value })),
  });

  async function save(e) {
    e.preventDefault();
    setState("saving");
    setError("");
    try {
      const body = { ...s, about: typeof aboutRef.current === "function" ? aboutRef.current() : aboutRef.current };
      setS(await api("/api/settings", { method: "PUT", body }));
      setState("saved");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }

  return (
    <form onSubmit={save} className="space-y-10">
      <section className="grid gap-6 md:grid-cols-[14rem_1fr]">
        <ImageField label="Foto profil" value={s.avatar} onChange={(url) => setS((v) => ({ ...v, avatar: url }))} aspect="4 / 5" compact />
        <div className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="name" label="Nama"><input {...bind("name")} /></Field>
            <Field id="role" label="Profesi"><input {...bind("role")} /></Field>
          </div>
          <Field id="headline" label="Judul utama di beranda" help="Satu atau dua kalimat pendek.">
            <textarea {...bind("headline")} rows={2} maxLength={140} />
          </Field>
          <Field id="tagline" label="Kalimat pendukung" help="Maksimal sekitar 20 kata supaya muat di layar pertama.">
            <textarea {...bind("tagline")} rows={2} maxLength={200} />
          </Field>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Field id="email" label="Email"><input {...bind("email")} type="email" placeholder="nama@email.com" /></Field>
        <Field id="github" label="GitHub"><input {...bind("github")} type="url" placeholder="https://github.com/username" /></Field>
        <Field id="linkedin" label="LinkedIn"><input {...bind("linkedin")} type="url" placeholder="https://linkedin.com/in/username" /></Field>
        <Field id="twitter" label="X (Twitter)"><input {...bind("twitter")} type="url" placeholder="https://x.com/username" /></Field>
      </section>

      <Field
        id="stack"
        label="Teknologi yang dipakai"
        help="Tulis nama ikon dari simpleicons.org, dipisah koma atau spasi. Contoh: nextdotjs, react, postgresql."
      >
        <textarea {...bind("stack")} rows={2} className="field font-mono text-sm" />
      </Field>

      <section>
        <span className="label">Halaman About</span>
        <div className="rounded-[10px] border border-line bg-surface px-5 pb-6 pt-5">
          <RichEditor
            initialMarkdown={initial.about}
            onChange={(getMd) => (aboutRef.current = getMd)}
            placeholder="Ceritakan tentang dirimu..."
          />
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center gap-4 border-t border-line bg-bg/90 px-4 py-4 backdrop-blur-md md:-mx-8 md:px-8">
        <button type="submit" className="btn btn-primary" disabled={state === "saving"}>
          {state === "saving" ? "Menyimpan..." : "Simpan perubahan"}
        </button>
        {state === "saved" && (
          <span className="inline-flex items-center gap-1.5 text-sm text-ok" role="status">
            <CheckCircle size={16} /> Tersimpan
          </span>
        )}
        {state === "error" && <span role="alert" className="text-sm text-danger">{error}</span>}
      </div>
    </form>
  );
}
