"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2, X } from "lucide-react";
import { ContentEditor } from "@/components/blog/content-editor";
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
  primaryKeyword: string | null;
  secondaryKeyword: string | null;
  tags: string[];
  /** ISO string (serialized server-side) or null when never published. */
  publishedAt: string | null;
}

const MAX_TAGS = 12;

/** UTC calendar day of an ISO timestamp, as the value for <input type="date">. */
function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

type SaveResponse = {
  post?: { id: string; status: "DRAFT" | "PUBLISHED"; publishedAt?: string | null };
  error?: string;
  issues?: string[];
};

const fieldClass =
  "w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

export function BlogPostEditor({ post }: { post?: EditorPost }) {
  const router = useRouter();

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  // For existing posts the slug never auto-follows the title.
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [authorName, setAuthorName] = useState(post?.authorName ?? "MyKavo Team");
  const [seoTitle, setSeoTitle] = useState(post?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [primaryKeyword, setPrimaryKeyword] = useState(post?.primaryKeyword ?? "");
  const [secondaryKeyword, setSecondaryKeyword] = useState(post?.secondaryKeyword ?? "");
  const [tags, setTags] = useState<string[]>(post?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  // Canonical stored timestamp; the date input edits only its calendar day.
  const [publishedAtIso, setPublishedAtIso] = useState(post?.publishedAt ?? null);
  const [publishedDate, setPublishedDate] = useState(isoToDateInput(post?.publishedAt ?? null));
  const [savedStatus, setSavedStatus] = useState<"DRAFT" | "PUBLISHED">(
    post?.status ?? "DRAFT",
  );

  const [saving, setSaving] = useState<"DRAFT" | "PUBLISHED" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isPublished = savedStatus === "PUBLISHED";
  const canSave = title.trim().length > 0 && slug.trim().length > 0 && !saving;

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  /** Add the draft tag(s) - comma-separated input adds several at once. */
  function addTags(raw: string) {
    const incoming = raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (incoming.length === 0) return;
    setTags((current) => {
      const next = [...current];
      const seen = new Set(current.map((t) => t.toLowerCase()));
      for (const tag of incoming) {
        const key = tag.toLowerCase();
        if (seen.has(key) || next.length >= MAX_TAGS) continue;
        seen.add(key);
        next.push(tag.slice(0, 40));
      }
      return next;
    });
    setTagDraft("");
  }

  function removeTag(tag: string) {
    setTags((current) => current.filter((t) => t !== tag));
  }

  /**
   * The value PATCH/POST receives. Untouched date sends the original ISO
   * (preserving the stored time of day); a changed date sends the plain
   * date, which the server parses as midnight UTC. Empty means automatic
   * (stamped on first publish).
   */
  function publishedAtPayload(): string | null {
    if (!publishedDate) return null;
    if (publishedAtIso && isoToDateInput(publishedAtIso) === publishedDate) return publishedAtIso;
    return publishedDate;
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
          primaryKeyword,
          secondaryKeyword,
          tags,
          publishedAt: publishedAtPayload(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as SaveResponse;

      if (!res.ok || !data.post) {
        const detail = data.issues?.length ? ` (${data.issues.join("; ")})` : "";
        setError((data.error ?? "Something went wrong while saving.") + detail);
        return;
      }

      setSavedStatus(data.post.status);
      if (data.post.publishedAt !== undefined) {
        setPublishedAtIso(data.post.publishedAt);
        setPublishedDate(isoToDateInput(data.post.publishedAt));
      }
      if (!post) {
        router.replace(`/dashboard/blog/${data.post.id}/edit`);
        router.refresh();
        return;
      }
      setNotice(
        nextStatus === "PUBLISHED"
          ? "Published - live on /blog."
          : isPublished
            ? "Unpublished - back to draft."
            : "Draft saved.",
      );
      router.refresh();
    } catch {
      setError("Network error - your changes were not saved.");
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
              /blog/{slug || "…"} - lowercase letters, numbers, and hyphens.
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

          <div>
            <label htmlFor="post-published-date" className="mb-1.5 block text-sm font-medium text-ink">
              Published date
            </label>
            <input
              id="post-published-date"
              type="date"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
              className={cn(fieldClass, "max-w-56")}
            />
            <p className="mt-1.5 text-[13px] text-ink-faint">
              Shown on the post and used for ordering. Leave empty to stamp it automatically on
              first publish.
            </p>
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="post-primary-keyword"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Primary keyword
                  </label>
                  <input
                    id="post-primary-keyword"
                    type="text"
                    value={primaryKeyword}
                    onChange={(e) => setPrimaryKeyword(e.target.value)}
                    placeholder="website change monitoring"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="post-secondary-keyword"
                    className="mb-1.5 block text-sm font-medium text-ink"
                  >
                    Secondary keyword
                  </label>
                  <input
                    id="post-secondary-keyword"
                    type="text"
                    value={secondaryKeyword}
                    onChange={(e) => setSecondaryKeyword(e.target.value)}
                    placeholder="visual regression testing"
                    className={fieldClass}
                  />
                </div>
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

      <div className="rounded-card bg-card p-6 shadow-card">
        <label htmlFor="post-tag-input" className="block text-sm font-medium text-ink">
          Tags
        </label>
        <p className="mt-1 text-[13px] text-ink-faint">
          Shown on the blog and searchable by readers. Press Enter or comma to add - up to{" "}
          {MAX_TAGS}.
        </p>
        {tags.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove tag ${tag}`}
                  className="text-ink-faint transition-colors hover:text-ink"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <input
            id="post-tag-input"
            type="text"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addTags(tagDraft);
              }
            }}
            placeholder="seo, monitoring, changelog…"
            disabled={tags.length >= MAX_TAGS}
            className={cn(fieldClass, "flex-1")}
          />
          <button
            type="button"
            onClick={() => addTags(tagDraft)}
            disabled={!tagDraft.trim() || tags.length >= MAX_TAGS}
            className="inline-flex h-[50px] items-center rounded-field border border-line bg-card px-5 text-sm font-medium text-ink transition-colors hover:border-ink-faint disabled:opacity-60"
          >
            Add
          </button>
        </div>
      </div>

      <ContentEditor value={content} onChange={setContent} />

      <div className="flex flex-wrap items-center gap-3">
        {isPublished ? (
          <>
            <button
              type="button"
              onClick={() => save("PUBLISHED")}
              disabled={!canSave}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
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
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
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
          <p className="text-sm text-critical-strong" role="alert">
            {error}
          </p>
        )}
        {notice && !error && (
          <p className="text-sm text-success-strong" role="status">
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
