"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { BLOCK_SNIPPETS, type BlockSnippet } from "@/components/blog/blocks";
import { PostContent } from "@/components/blog/post-content";
import { PostStatusBadge } from "@/components/blog/status-badge";
import { slugify } from "@/lib/slugify";
import { cn } from "@/lib/utils";

export interface EditorPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  status: "DRAFT" | "PUBLISHED";
  authorName: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

type SaveResponse = {
  post?: { id: string; status: "DRAFT" | "PUBLISHED" };
  error?: string;
  issues?: string[];
};

const fieldClass =
  "w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

// Content textarea metrics (from its classes: py-3 + leading-6) used to place
// the "/" insert menu just below the line the slash was typed on.
const CONTENT_PADDING_TOP = 12;
const CONTENT_LINE_HEIGHT = 24;

interface SlashMenuState {
  /** Index of the "/" character in the content string. */
  position: number;
  /** Pixel offset of the menu from the top of the textarea. */
  top: number;
}

export function BlogPostEditor({ post }: { post?: EditorPost }) {
  const router = useRouter();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // For existing posts the slug never auto-follows the title.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "Fluxen Team");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [savedStatus, setSavedStatus] = useState<"DRAFT" | "PUBLISHED">(
    post?.status ?? "DRAFT",
  );

  const [saving, setSaving] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  const isPublished = savedStatus === "PUBLISHED";
  const canSave = title.trim().length > 0 && slug.trim().length > 0 && !saving;

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  /**
   * Opens the "/" block menu when the caret sits right after a "/" that is
   * alone on its line (i.e. "/" typed on an empty line); closes it as soon
   * as the line stops matching.
   */
  function handleContentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = event.target.value;
    setContent(value);

    const caret = event.target.selectionStart;
    const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
    const lineEnd = value.indexOf("\n", caret);
    const line = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);

    if (line === "/" && caret === lineStart + 1) {
      const el = event.target;
      const row = value.slice(0, lineStart).split("\n").length - 1;
      const rawTop =
        CONTENT_PADDING_TOP + (row + 1) * CONTENT_LINE_HEIGHT - el.scrollTop + 4;
      const top = Math.min(Math.max(rawTop, 8), Math.max(el.clientHeight - 8, 8));
      setSlashMenu({ position: lineStart, top });
      setSlashIndex(0);
    } else if (slashMenu) {
      setSlashMenu(null);
    }
  }

  function handleContentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slashMenu) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSlashIndex((index) => (index + 1) % BLOCK_SNIPPETS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setSlashIndex(
          (index) => (index - 1 + BLOCK_SNIPPETS.length) % BLOCK_SNIPPETS.length,
        );
        break;
      case "Enter":
      case "Tab":
        event.preventDefault();
        insertSnippet(BLOCK_SNIPPETS[slashIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setSlashMenu(null);
        break;
    }
  }

  /** Replaces the typed "/" with the block snippet and restores the caret. */
  function insertSnippet(option: BlockSnippet) {
    if (!slashMenu) return;
    const before = content.slice(0, slashMenu.position);
    const after = content.slice(slashMenu.position + 1);
    setContent(before + option.snippet + after);
    setSlashMenu(null);

    const caret = before.length + option.snippet.length;
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  async function save(nextStatus: "DRAFT" | "PUBLISHED") {
    setSaving(nextStatus);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(post ? `/api/blog/${post.id}` : "/api/blog", {
        method: post ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          excerpt,
          content,
          status: nextStatus,
          authorName,
          seoTitle,
          seoDescription,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResponse;

      if (!res.ok || !data.post) {
        const detail = data.issues?.length ? ` (${data.issues.join("; ")})` : "";
        setError((data.error ?? "Something went wrong while saving.") + detail);
        return;
      }

      setSavedStatus(data.post.status);
      if (!post) {
        router.replace(`/dashboard/blog/${data.post.id}/edit`);
        router.refresh();
        return;
      }
      setNotice(
        nextStatus === "PUBLISHED"
          ? "Published — live on /blog."
          : isPublished
            ? "Unpublished — back to draft."
            : "Draft saved.",
      );
      router.refresh();
    } catch {
      setError("Network error — your changes were not saved.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> All posts
        </Link>
        <div className="flex items-center gap-3">
          <PostStatusBadge status={savedStatus} />
          {post && isPublished && (
            <Link
              href={`/blog/${post.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
            >
              View live <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-card bg-card p-6 shadow-card">
        <div className="space-y-4">
          <div>
            <label htmlFor="post-title" className="mb-1.5 block text-sm font-medium text-ink">
              Title
            </label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Why website baselines beat diffing yesterday's scan"
              className={fieldClass}
            />
          </div>

          <div>
            <label htmlFor="post-slug" className="mb-1.5 block text-sm font-medium text-ink">
              Slug
            </label>
            <input
              id="post-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="why-website-baselines-matter"
              className={cn(fieldClass, "font-mono text-sm")}
            />
            <p className="mt-1.5 text-[13px] text-ink-faint">
              /blog/{slug || "…"} — lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div>
            <label htmlFor="post-excerpt" className="mb-1.5 block text-sm font-medium text-ink">
              Excerpt <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <textarea
              id="post-excerpt"
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences shown on the blog index and in search results."
              className={fieldClass}
            />
          </div>

          <details className="group rounded-tile border border-line px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
              SEO &amp; author
              <span className="text-ink-faint transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="post-seo-title"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  SEO title <span className="font-normal text-ink-faint">(defaults to title)</span>
                </label>
                <input
                  id="post-seo-title"
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="post-seo-description"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  SEO description{" "}
                  <span className="font-normal text-ink-faint">(defaults to excerpt)</span>
                </label>
                <textarea
                  id="post-seo-description"
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="post-author"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Author name
                </label>
                <input
                  id="post-author"
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </details>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-card bg-card p-6 shadow-card">
          <label htmlFor="post-content" className="block text-sm font-medium text-ink">
            Content <span className="font-normal text-ink-faint">(Markdown)</span>
          </label>
          <p className="mb-1.5 mt-0.5 text-[13px] text-ink-faint">
            Type &quot;/&quot; on an empty line for blocks: CTA, FAQ, table of contents.
          </p>
          <div className="relative">
            <textarea
              id="post-content"
              ref={contentRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleContentKeyDown}
              onBlur={() => setSlashMenu(null)}
              placeholder={"## Heading\n\nWrite in Markdown. Lists, links, tables, and code blocks are supported."}
              className={cn(fieldClass, "min-h-120 resize-y font-mono text-sm leading-6")}
              aria-controls={slashMenu ? "content-block-menu" : undefined}
            />
            {slashMenu && (
              <div
                id="content-block-menu"
                role="listbox"
                aria-label="Insert block"
                style={{ top: slashMenu.top }}
                className="absolute left-4 z-10 w-76 max-w-[calc(100%-2rem)] overflow-hidden rounded-tile border border-line bg-card py-1 shadow-float"
              >
                {BLOCK_SNIPPETS.map((option, index) => (
                  <button
                    key={option.command}
                    type="button"
                    role="option"
                    aria-selected={index === slashIndex}
                    onMouseDown={(e) => {
                      // Insert before the textarea blur closes the menu.
                      e.preventDefault();
                      insertSnippet(option);
                    }}
                    onMouseEnter={() => setSlashIndex(index)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left",
                      index === slashIndex ? "bg-primary-soft/60" : undefined,
                    )}
                  >
                    <span className="text-sm font-medium text-ink">
                      <span className="font-mono text-primary">/{option.command}</span>
                      {" — "}
                      {option.label}
                    </span>
                    <span className="text-[12px] text-ink-faint">{option.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="rounded-card bg-card p-6 shadow-card">
          <p className="mb-1.5 text-sm font-medium text-ink">Preview</p>
          <div className="max-h-160 min-h-120 overflow-y-auto rounded-field border border-line px-4 py-3">
            {content.trim() ? (
              <PostContent content={content} />
            ) : (
              <p className="text-sm text-ink-faint">Start writing to see the preview.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {isPublished ? (
          <>
            <button
              type="button"
              onClick={() => save("PUBLISHED")}
              disabled={!canSave}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving === "PUBLISHED" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Update
            </button>
            <button
              type="button"
              onClick={() => save("DRAFT")}
              disabled={!canSave}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-6 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-60"
            >
              {saving === "DRAFT" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Unpublish
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => save("PUBLISHED")}
              disabled={!canSave}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving === "PUBLISHED" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Publish
            </button>
            <button
              type="button"
              onClick={() => save("DRAFT")}
              disabled={!canSave}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-6 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-60"
            >
              {saving === "DRAFT" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Save draft
            </button>
          </>
        )}
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="text-sm text-green-700" role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
