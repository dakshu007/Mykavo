"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Check,
  ClipboardCopy,
  Download,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Plus,
  Quote,
  RefreshCw,
  Save,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { htmlToMarkdown, jsonLdScripts, buildJsonLd } from "@mykavo/keyword-agent/pure";
import { JobProgress, useAgentJob, type JobState } from "./use-agent-job";

export interface EditablePost {
  id: string;
  keyword: string;
  title: string;
  slug: string;
  metaDescription: string;
  bodyHtml: string;
  faq: { question: string; answer: string }[];
  jsonLd: Record<string, unknown>[];
  reviewNotes: string[];
  status: string;
  version: number;
}

const field =
  "mt-1 block w-full rounded-xl border border-line bg-card px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const button =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink hover:bg-ink/5 disabled:opacity-50";

function ToolButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg ${active ? "bg-primary-soft text-accent" : "text-ink-secondary hover:bg-ink/5 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div role="toolbar" aria-label="Formatting" className="sticky top-20 z-10 flex flex-wrap gap-0.5 border-b border-line bg-card/95 p-1.5 backdrop-blur">
      <ToolButton label="Heading" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 className="size-4" />
      </ToolButton>
      <ToolButton label="Subheading" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 className="size-4" />
      </ToolButton>
      <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="size-4" />
      </ToolButton>
      <ToolButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote className="size-4" />
      </ToolButton>
      <ToolButton
        label="Link to one of your pages"
        active={editor.isActive("link")}
        onClick={() => {
          const current = editor.getAttributes("link").href as string | undefined;
          const href = window.prompt("Link to a page on your site (full address). Leave empty to remove the link.", current ?? "https://");
          if (href === null) return;
          if (!href.trim() || href.trim() === "https://") editor.chain().focus().unsetLink().run();
          else editor.chain().focus().setLink({ href: href.trim() }).run();
        }}
      >
        <Link2 className="size-4" />
      </ToolButton>
      <span className="mx-1 w-px self-stretch bg-line" aria-hidden />
      <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 className="size-4" />
      </ToolButton>
      <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 className="size-4" />
      </ToolButton>
    </div>
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function faqHtml(faq: { question: string; answer: string }[]): string {
  if (faq.length === 0) return "";
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `\n<h2>Frequently asked questions</h2>\n${faq.map((f) => `<h3>${esc(f.question)}</h3>\n<p>${esc(f.answer)}</p>`).join("\n")}`;
}

export function PostEditor({
  websiteId,
  post,
  rewritesLeft,
  rewriting,
}: {
  websiteId: string;
  post: EditablePost;
  rewritesLeft: number;
  rewriting: JobState | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [slug, setSlug] = useState(post.slug);
  const [meta, setMeta] = useState(post.metaDescription);
  const [faq, setFaq] = useState(post.faq);
  const [status, setStatus] = useState(post.status);
  const [version, setVersion] = useState(post.version);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [rewriteStarting, setRewriteStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: false, HTMLAttributes: { rel: null, target: null } },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
    ],
    content: post.bodyHtml,
    editorProps: {
      attributes: {
        class: "blog-prose min-h-[420px] px-5 py-4 focus:outline-none",
        "aria-label": "Post body",
      },
    },
    onUpdate: () => setDirty(true),
  });

  const rewrite = useAgentJob(rewriting, (done) => {
    if (done.status === "failed") setMessage({ tone: "error", text: done.error ?? "The rewrite didn't finish." });
    router.refresh();
    if (done.status === "done") window.location.reload();
  });

  const bodyHtml = () => editor?.getHTML() ?? post.bodyHtml;
  const schema = jsonLdScripts(
    buildJsonLd({
      title,
      metaDescription: meta,
      language: (post.jsonLd[0]?.inLanguage as string | undefined) ?? "en",
      siteName: ((post.jsonLd[0]?.publisher as { name?: string } | undefined)?.name) ?? "",
      siteUrl: ((post.jsonLd[0]?.publisher as { url?: string } | undefined)?.url) ?? "",
      faq,
    }),
  );

  async function save(nextStatus = status) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/keywords/posts/${post.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version, title, slug, metaDescription: meta, bodyHtml: bodyHtml(), faq, status: nextStatus }),
      });
      const data = (await res.json()) as { version?: number; bodyHtml?: string; error?: string };
      if (!res.ok || !data.version) {
        setMessage({ tone: "error", text: data.error ?? "Could not save." });
        return false;
      }
      setVersion(data.version);
      setStatus(nextStatus);
      // The server's sanitised version wins (links outside your site are removed).
      if (data.bodyHtml !== undefined && editor && data.bodyHtml !== editor.getHTML()) {
        editor.commands.setContent(data.bodyHtml, { emitUpdate: false });
      }
      setDirty(false);
      setMessage({ tone: "ok", text: "Saved." });
      return true;
    } catch {
      setMessage({ tone: "error", text: "Could not reach MyKavo. Your changes are still here; try again." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setMessage({ tone: "ok", text: `${label} copied.` });
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 2000);
    } catch {
      setMessage({ tone: "error", text: "Your browser blocked copying. Use the download instead." });
    }
  }

  const fullHtml = () => `<h1>${title.replace(/</g, "&lt;")}</h1>\n${bodyHtml()}${faqHtml(faq)}`;
  const fullMarkdown = () => `# ${title}\n\n${htmlToMarkdown(bodyHtml() + faqHtml(faq))}`;

  if (rewrite.running && rewrite.job) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Rewriting &ldquo;{post.keyword}&rdquo;</h1>
        <div className="mt-4 max-w-xl">
          <JobProgress job={rewrite.job} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-4">
        <div className="rounded-2xl border border-line bg-card p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">01 / Details</p>
          <label className="mt-3 block text-[13px] font-medium text-ink">
            Title <span className="font-normal text-ink-faint">({title.length}/65)</span>
            <input className={`${field} text-[17px] font-semibold`} value={title} maxLength={120} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-[13px] font-medium text-ink">
              Slug
              <input className={`${field} font-mono text-[13px]`} value={slug} maxLength={80} onChange={(e) => { setSlug(e.target.value); setDirty(true); }} />
            </label>
            <label className="block text-[13px] font-medium text-ink">
              Status
              <select className={field} value={status} onChange={(e) => { setStatus(e.target.value); setDirty(true); }}>
                <option value="draft">Draft</option>
                <option value="exported">Exported</option>
                <option value="published">Published</option>
              </select>
            </label>
          </div>
          <label className="mt-3 block text-[13px] font-medium text-ink">
            Meta description{" "}
            <span className={`font-normal ${meta.length > 160 ? "text-warning-strong" : "text-ink-faint"}`}>({meta.length}/160)</span>
            <textarea className={`${field} min-h-[64px]`} value={meta} maxLength={200} onChange={(e) => { setMeta(e.target.value); setDirty(true); }} />
          </label>
        </div>

        {/* overflow-clip, not hidden: hidden would make this card the sticky
            container and push the toolbar down instead of pinning it. */}
        <div className="overflow-clip rounded-2xl border border-line bg-card">
          <p className="border-b border-line px-5 pb-2.5 pt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">02 / Post</p>
          {editor ? <Toolbar editor={editor} /> : null}
          {editor ? <EditorContent editor={editor} /> : <div className="min-h-[420px] px-5 py-4 text-ink-faint">Loading editor…</div>}
        </div>

        <div className="rounded-2xl border border-line bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">03 / FAQ</p>
              <h2 className="mt-1 text-[15px] font-semibold text-ink">Frequently asked questions</h2>
            </div>
            <button
              type="button"
              className={button}
              disabled={faq.length >= 10}
              onClick={() => { setFaq((f) => [...f, { question: "", answer: "" }]); setDirty(true); }}
            >
              <Plus className="size-3.5" aria-hidden /> Add
            </button>
          </div>
          <ol className="mt-3 space-y-3">
            {faq.map((f, i) => (
              <li key={i} className="rounded-xl border border-line p-3">
                <label className="block text-[12px] font-medium text-ink-secondary">
                  Question {i + 1}
                  <input className={field} value={f.question} maxLength={200} onChange={(e) => { setFaq((all) => all.map((x, j) => (j === i ? { ...x, question: e.target.value } : x))); setDirty(true); }} />
                </label>
                <label className="mt-2 block text-[12px] font-medium text-ink-secondary">
                  Answer
                  <textarea className={`${field} min-h-[60px]`} value={f.answer} maxLength={1000} onChange={(e) => { setFaq((all) => all.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x))); setDirty(true); }} />
                </label>
                <button type="button" className="mt-2 text-[12px] font-medium text-critical-strong hover:underline" onClick={() => { setFaq((all) => all.filter((_, j) => j !== i)); setDirty(true); }}>
                  Remove question
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[4px_4px_0_var(--color-primary)]">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[14px] font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
            {saving ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {message && (
            <p role={message.tone === "error" ? "alert" : "status"} className={`mt-2 text-[13px] ${message.tone === "error" ? "text-critical-strong" : "text-success-strong"}`}>
              {message.text}
            </p>
          )}
          <p className="mt-3 text-[12px] leading-5 text-ink-faint">
            Links can only point to pages on your own site; others are removed when you save.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-[14px] font-semibold text-ink">Use it on your site</h2>
          <div className="mt-3 grid gap-2">
            <button type="button" className={button} onClick={() => void copy(fullHtml(), "HTML")}>
              {copied === "HTML" ? <Check className="size-3.5 text-success-strong" aria-hidden /> : <ClipboardCopy className="size-3.5" aria-hidden />}
              {copied === "HTML" ? "Copied" : "Copy as HTML"}
            </button>
            <button type="button" className={button} onClick={() => void copy(fullMarkdown(), "Markdown")}>
              {copied === "Markdown" ? <Check className="size-3.5 text-success-strong" aria-hidden /> : <ClipboardCopy className="size-3.5" aria-hidden />}
              {copied === "Markdown" ? "Copied" : "Copy as Markdown"}
            </button>
            <button type="button" className={button} onClick={() => download(`${slug || "post"}.html`, fullHtml(), "text/html")}>
              <Download className="size-3.5" aria-hidden /> Download .html
            </button>
            <button type="button" className={button} onClick={() => download(`${slug || "post"}.md`, fullMarkdown(), "text/markdown")}>
              <Download className="size-3.5" aria-hidden /> Download .md
            </button>
            <button type="button" className={button} onClick={() => void copy(schema, "Schema")}>
              {copied === "Schema" ? <Check className="size-3.5 text-success-strong" aria-hidden /> : <ClipboardCopy className="size-3.5" aria-hidden />}
              {copied === "Schema" ? "Copied" : "Copy schema (JSON-LD)"}
            </button>
          </div>
        </div>

        {post.reviewNotes.length > 0 && (
          <div className="rounded-2xl border border-line bg-card p-4">
            <h2 className="text-[14px] font-semibold text-ink">Check before publishing</h2>
            <ul className="mt-2 space-y-2">
              {post.reviewNotes.map((note, i) => (
                <li key={i}>
                  <label className="flex items-start gap-2 text-[13px] leading-5 text-ink-secondary">
                    <input
                      type="checkbox"
                      className="mt-1 accent-[var(--color-accent)]"
                      checked={checked.has(i)}
                      onChange={() =>
                        setChecked((s) => {
                          const next = new Set(s);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                    />
                    <span className={checked.has(i) ? "line-through opacity-70" : ""}>{note}</span>
                  </label>
                </li>
              ))}
            </ul>
            {checked.size === post.reviewNotes.length && (
              <p className="mt-2 flex items-center gap-1 text-[12px] text-success-strong">
                <Check className="size-3.5" aria-hidden /> All checked
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-line bg-card p-4">
          <h2 className="text-[14px] font-semibold text-ink">Not quite right?</h2>
          <p className="mt-1 text-[12px] leading-5 text-ink-faint">
            {rewritesLeft > 0 ? "Each post includes one free rewrite. It replaces this draft." : "This post has used its free rewrite."}
          </p>
          <button
            type="button"
            className={`${button} mt-2 w-full justify-center`}
            disabled={rewritesLeft === 0 || rewriteStarting}
            aria-busy={rewriteStarting}
            onClick={async () => {
              if (!window.confirm("Rewrite this post? The new draft replaces this one, including your edits.")) return;
              setRewriteStarting(true);
              const err = await rewrite.start(websiteId, { kind: "write", keyword: post.keyword, notes: "", postId: post.id });
              setRewriteStarting(false);
              if (err) setMessage({ tone: "error", text: err });
            }}
          >
            {rewriteStarting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
            {rewriteStarting ? "Starting…" : `Rewrite (${rewritesLeft} free)`}
          </button>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-critical-strong hover:underline disabled:opacity-60"
            disabled={deleting}
            aria-busy={deleting}
            onClick={async () => {
              if (!window.confirm("Delete this post? This can't be undone, and it still counts toward this month's posts.")) return;
              setDeleting(true);
              try {
                const res = await fetch(`/api/keywords/posts/${post.id}`, { method: "DELETE" });
                if (res.ok) {
                  // Keep the spinner until the list page has loaded.
                  router.push(`/dashboard/keywords/${websiteId}`);
                  return;
                }
                setMessage({ tone: "error", text: "Could not delete the post." });
              } catch {
                setMessage({ tone: "error", text: "Could not reach MyKavo. Try again." });
              }
              setDeleting(false);
            }}
          >
            {deleting ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
            {deleting ? "Deleting…" : "Delete post"}
          </button>
        </div>
      </aside>
    </div>
  );
}
