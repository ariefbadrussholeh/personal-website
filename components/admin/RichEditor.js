"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Suggestion from "@tiptap/suggestion";
import { common, createLowlight } from "lowlight";
import {
  ArrowUUpLeft,
  ArrowUUpRight,
  CodeBlock as CodeBlockIcon,
  Code,
  ImageSquare,
  LinkSimple,
  ListBullets,
  ListNumbers,
  Minus,
  Quotes,
  TextB,
  TextHThree,
  TextHTwo,
  TextItalic,
  TextStrikethrough,
  CircleNotch,
} from "@phosphor-icons/react";
import { uploadImage } from "@/lib/client";

/* ------------------------------------------------------------------ */
/* Syntax highlighting inside the editor                               */
/* ------------------------------------------------------------------ */

const lowlight = createLowlight(common);
// A registered "plaintext" keeps untagged blocks from being auto-detected.
lowlight.register("plaintext", () => ({ name: "plaintext", contains: [] }));

const LANGUAGES = [
  ["plaintext", "Teks biasa"],
  ["javascript", "JavaScript"],
  ["typescript", "TypeScript"],
  ["jsx", "JSX"],
  ["json", "JSON"],
  ["bash", "Bash"],
  ["python", "Python"],
  ["go", "Go"],
  ["rust", "Rust"],
  ["sql", "SQL"],
  ["xml", "HTML"],
  ["css", "CSS"],
  ["yaml", "YAML"],
  ["markdown", "Markdown"],
  ["java", "Java"],
  ["php", "PHP"],
];

/* ------------------------------------------------------------------ */
/* Slash menu                                                          */
/* ------------------------------------------------------------------ */

const SLASH_ITEMS = [
  { title: "Judul besar", hint: "Heading 2", Icon: TextHTwo, run: (c) => c.toggleHeading({ level: 2 }) },
  { title: "Judul kecil", hint: "Heading 3", Icon: TextHThree, run: (c) => c.toggleHeading({ level: 3 }) },
  { title: "Daftar poin", hint: "Bullet list", Icon: ListBullets, run: (c) => c.toggleBulletList() },
  { title: "Daftar angka", hint: "Numbered list", Icon: ListNumbers, run: (c) => c.toggleOrderedList() },
  { title: "Kutipan", hint: "Quote", Icon: Quotes, run: (c) => c.toggleBlockquote() },
  { title: "Blok kode", hint: "Code block", Icon: CodeBlockIcon, run: (c) => c.toggleCodeBlock() },
  { title: "Garis pemisah", hint: "Divider", Icon: Minus, run: (c) => c.setHorizontalRule() },
  { title: "Gambar", hint: "Upload image", Icon: ImageSquare, special: "image" },
];

function createSlashStore() {
  let state = { open: false, items: [], index: 0, rect: null, command: null };
  const listeners = new Set();
  return {
    get: () => state,
    set(next) {
      state = { ...state, ...next };
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function buildSlashExtension(store) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          char: "/",
          allowSpaces: false,
          startOfLine: false,
          items: ({ query }) => {
            const q = query.toLowerCase();
            return SLASH_ITEMS.filter(
              (i) => i.title.toLowerCase().includes(q) || i.hint.toLowerCase().includes(q)
            );
          },
          command: ({ editor, range, props }) => props.exec(editor, range),
          render: () => {
            const update = (p) =>
              store.set({
                open: p.items.length > 0,
                items: p.items,
                rect: p.clientRect?.() || null,
                command: (item) => p.command(item),
              });
            return {
              onStart: (p) => {
                store.set({ index: 0 });
                update(p);
              },
              onUpdate: (p) => {
                store.set({ index: 0 });
                update(p);
              },
              onKeyDown: ({ event }) => {
                const s = store.get();
                if (!s.open) return false;
                if (event.key === "ArrowDown") {
                  store.set({ index: (s.index + 1) % s.items.length });
                  return true;
                }
                if (event.key === "ArrowUp") {
                  store.set({ index: (s.index - 1 + s.items.length) % s.items.length });
                  return true;
                }
                if (event.key === "Enter" || event.key === "Tab") {
                  s.command(s.items[s.index]);
                  return true;
                }
                if (event.key === "Escape") {
                  store.set({ open: false });
                  return true;
                }
                return false;
              },
              onExit: () => store.set({ open: false }),
            };
          },
        }),
      ];
    },
  });
}

function SlashMenu({ store }) {
  const s = useSyncExternalStore(store.subscribe, store.get, store.get);
  if (!s.open || !s.rect) return null;

  const below = s.rect.bottom + 300 < window.innerHeight;
  const style = {
    left: Math.max(12, Math.min(s.rect.left, window.innerWidth - 300)),
    ...(below ? { top: s.rect.bottom + 8 } : { bottom: window.innerHeight - s.rect.top + 8 }),
  };

  return (
    <div
      role="listbox"
      aria-label="Perintah blok"
      style={style}
      className="rise-in fixed z-50 max-h-72 w-72 overflow-y-auto rounded-[10px] border border-line-strong bg-surface p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
    >
      {s.items.map((item, i) => (
        <button
          key={item.title}
          type="button"
          role="option"
          aria-selected={i === s.index}
          onMouseDown={(e) => {
            e.preventDefault();
            s.command(item);
          }}
          onMouseEnter={() => store.set({ index: i })}
          className={`flex w-full items-center gap-3 rounded-[8px] px-2.5 py-2 text-left ${
            i === s.index ? "bg-surface-2 text-ink" : "text-muted"
          }`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-line bg-bg">
            <item.Icon size={16} />
          </span>
          <span>
            <span className="block text-sm text-ink">{item.title}</span>
            <span className="block text-xs text-faint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

function ToolButton({ label, active, onClick, children, disabled }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors disabled:opacity-30 ${
        active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface-2 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

const Divider = () => <span className="mx-1 h-5 w-px shrink-0 bg-line-strong" aria-hidden />;

function Toolbar({ editor, onPickImage, uploading }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      language: e.getAttributes("codeBlock").language || "plaintext",
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function openLink() {
    setHref(editor.getAttributes("link").href || "");
    setLinkOpen(true);
  }
  function applyLink(e) {
    e.preventDefault();
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:|\/|#)/.test(url) ? url : `https://${url}` }).run();
    setLinkOpen(false);
  }

  const c = () => editor.chain().focus();

  return (
    <div className="sticky top-14 z-30 -mx-1 mb-6 rounded-[10px] border border-line bg-bg/90 px-1.5 py-1.5 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-0.5">
        <ToolButton label="Judul besar" active={st.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
          <TextHTwo size={18} />
        </ToolButton>
        <ToolButton label="Judul kecil" active={st.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          <TextHThree size={18} />
        </ToolButton>
        <Divider />
        <ToolButton label="Tebal (Ctrl+B)" active={st.bold} onClick={() => c().toggleBold().run()}>
          <TextB size={18} />
        </ToolButton>
        <ToolButton label="Miring (Ctrl+I)" active={st.italic} onClick={() => c().toggleItalic().run()}>
          <TextItalic size={18} />
        </ToolButton>
        <ToolButton label="Coret" active={st.strike} onClick={() => c().toggleStrike().run()}>
          <TextStrikethrough size={18} />
        </ToolButton>
        <ToolButton label="Kode inline" active={st.code} onClick={() => c().toggleCode().run()}>
          <Code size={18} />
        </ToolButton>
        <ToolButton label="Tautan" active={st.link} onClick={openLink}>
          <LinkSimple size={18} />
        </ToolButton>
        <Divider />
        <ToolButton label="Daftar poin" active={st.bullet} onClick={() => c().toggleBulletList().run()}>
          <ListBullets size={18} />
        </ToolButton>
        <ToolButton label="Daftar angka" active={st.ordered} onClick={() => c().toggleOrderedList().run()}>
          <ListNumbers size={18} />
        </ToolButton>
        <ToolButton label="Kutipan" active={st.quote} onClick={() => c().toggleBlockquote().run()}>
          <Quotes size={18} />
        </ToolButton>
        <ToolButton label="Blok kode" active={st.codeBlock} onClick={() => c().toggleCodeBlock().run()}>
          <CodeBlockIcon size={18} />
        </ToolButton>
        <ToolButton label="Sisipkan gambar" onClick={onPickImage}>
          {uploading ? <CircleNotch size={18} className="animate-spin" /> : <ImageSquare size={18} />}
        </ToolButton>
        <ToolButton label="Garis pemisah" onClick={() => c().setHorizontalRule().run()}>
          <Minus size={18} />
        </ToolButton>

        {st.codeBlock && (
          <label className="ml-1 flex items-center gap-2 text-xs text-muted">
            <span className="sr-only">Bahasa pemrograman</span>
            <select
              value={st.language}
              onChange={(e) => c().updateAttributes("codeBlock", { language: e.target.value }).run()}
              className="h-8 rounded-[8px] border border-line-strong bg-surface px-2 text-xs text-ink"
            >
              {LANGUAGES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
        )}

        <span className="ml-auto flex items-center gap-0.5">
          <ToolButton label="Urungkan (Ctrl+Z)" disabled={!st.canUndo} onClick={() => c().undo().run()}>
            <ArrowUUpLeft size={18} />
          </ToolButton>
          <ToolButton label="Ulangi (Ctrl+Shift+Z)" disabled={!st.canRedo} onClick={() => c().redo().run()}>
            <ArrowUUpRight size={18} />
          </ToolButton>
        </span>
      </div>

      {linkOpen && (
        <form onSubmit={applyLink} className="fade-in mt-1.5 flex gap-2 border-t border-line px-1 pt-2">
          <input
            autoFocus
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://contoh.com (kosongkan untuk menghapus tautan)"
            aria-label="Alamat tautan"
            className="field !py-1.5 text-sm"
          />
          <button type="submit" className="btn btn-sm btn-primary">Terapkan</button>
          <button type="button" className="btn btn-sm" onClick={() => setLinkOpen(false)}>Tutup</button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

/**
 * WYSIWYG editor that reads and writes Markdown.
 * onChange receives a function that returns the current Markdown, so the
 * (comparatively expensive) serialisation only happens when saving.
 */
export default function RichEditor({ initialMarkdown = "", onChange, placeholder = "Mulai menulis, atau ketik / untuk memilih blok..." }) {
  const fileInput = useRef(null);
  const insertRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState("");
  const [store] = useState(createSlashStore);
  const [slash] = useState(() => buildSlashExtension(store));

  // Defined before the editor so its props can call the latest version.
  const handleFiles = useCallback(async (files, pos) => {
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    setError("");
    for (const file of images) {
      setUploading((n) => n + 1);
      try {
        const { url } = await uploadImage(file);
        const editor = insertRef.current;
        if (editor) {
          const chain = editor.chain().focus();
          if (typeof pos === "number") chain.insertContentAt(pos, { type: "image", attrs: { src: url, alt: "" } });
          else chain.setImage({ src: url, alt: "" });
          chain.run();
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
    return true;
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    content: initialMarkdown,
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "plaintext" }),
      Image.configure({ allowBase64: false }),
      Markdown,
      Placeholder.configure({ placeholder }),
      slash,
    ],
    editorProps: {
      attributes: { class: "outline-none", "aria-label": "Isi tulisan" },
      handlePaste(_view, event) {
        const files = event.clipboardData?.files;
        if (files?.length && [...files].some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          handleFiles(files);
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (files?.length && [...files].some((f) => f.type.startsWith("image/"))) {
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          handleFiles(files, pos);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange?.(() => editor.getMarkdown()),
  });

  useEffect(() => {
    insertRef.current = editor;
  }, [editor]);

  // Slash "Image" entry opens the file picker.
  const pickImage = useCallback(() => fileInput.current?.click(), []);
  useEffect(() => {
    store.set({
      pick: pickImage,
    });
  }, [store, pickImage]);

  // Wire the slash items to execute against this editor.
  useEffect(() => {
    if (!editor) return;
    for (const item of SLASH_ITEMS) {
      item.exec = (ed, range) => {
        const chain = ed.chain().focus().deleteRange(range);
        if (item.special === "image") {
          chain.run();
          pickImage();
        } else item.run(chain).run();
      };
    }
  }, [editor, pickImage]);

  if (!editor) {
    return <div className="min-h-[55vh] rounded-[10px] border border-line bg-surface/50" aria-busy="true" />;
  }

  return (
    <div>
      <Toolbar editor={editor} onPickImage={pickImage} uploading={uploading > 0} />

      <BubbleMenu
        editor={editor}
        shouldShow={({ editor: e, state }) =>
          !state.selection.empty && !e.isActive("codeBlock") && !e.isActive("image")
        }
      >
        <div className="rise-in flex items-center gap-0.5 rounded-[10px] border border-line-strong bg-surface p-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
          <ToolButton label="Tebal" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
            <TextB size={16} />
          </ToolButton>
          <ToolButton label="Miring" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <TextItalic size={16} />
          </ToolButton>
          <ToolButton label="Kode inline" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
            <Code size={16} />
          </ToolButton>
          <ToolButton
            label="Judul besar"
            active={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <TextHTwo size={16} />
          </ToolButton>
        </div>
      </BubbleMenu>

      <EditorContent editor={editor} className="prose prose-invert prose-site max-w-none" />
      <SlashMenu store={store} />

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {error && (
        <p role="alert" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[10px] border border-danger/40 bg-surface px-4 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
