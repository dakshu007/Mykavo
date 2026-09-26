"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { AuthorBox } from "@/components/blog/author-box";
import { compressImage } from "@/lib/blog-editor/compress-image";
import type { AuthorView } from "@/lib/blog-authors";

export interface EditorAuthor {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  bio: string | null;
  imageUrl: string | null;
  linkedinUrl: string | null;
  xUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  highlights: string[];
}

const MAX_HIGHLIGHTS = 6;
const fieldClass =
  "w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[13px] text-ink-faint">{hint}</p>}
    </div>
  );
}

export function AuthorForm({ author }: { author?: EditorAuthor }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(author?.name ?? "");
  const [role, setRole] = useState(author?.role ?? "");
  const [bio, setBio] = useState(author?.bio ?? "");
  const [imageUrl, setImageUrl] = useState(author?.imageUrl ?? "");
  const [linkedinUrl, setLinkedinUrl] = useState(author?.linkedinUrl ?? "");
  const [xUrl, setXUrl] = useState(author?.xUrl ?? "");
  const [githubUrl, setGithubUrl] = useState(author?.githubUrl ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(author?.websiteUrl ?? "");
  const [highlights, setHighlights] = useState<string[]>(author?.highlights ?? []);
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { file: small } = await compressImage(file);
      const form = new FormData();
      form.append("file", small);
      const res = await fetch("/api/blog/images", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
      setImageUrl(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addHighlight() {
    const text = draft.trim();
    if (!text || highlights.length >= MAX_HIGHLIGHTS || highlights.includes(text)) return;
    setHighlights([...highlights, text.slice(0, 140)]);
    setDraft("");
  }

  async function save() {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(author ? `/api/blog/authors/${author.id}` : "/api/blog/authors", {
        method: author ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, bio, imageUrl, linkedinUrl, xUrl, githubUrl, websiteUrl, highlights }),
      });
      const data = (await res.json().catch(() => ({}))) as { author?: { id: string }; error?: string; issues?: string[] };
      if (!res.ok || !data.author) {
        setError((data.error ?? "Could not save the author.") + (data.issues?.length ? ` ${data.issues.join(" ")}` : ""));
        return;
      }
      if (!author) {
        router.replace(`/dashboard/blog/authors/${data.author.id}/edit`);
        router.refresh();
        return;
      }
      setNotice("Saved - the author box on every post by this author is updated.");
      router.refresh();
    } catch {
      setError("Network error - nothing was saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!author) return;
    if (!window.confirm(`Delete the profile for "${author.name}"? Their posts keep the name, without the profile.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/blog/authors/${author.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not delete the author.");
        return;
      }
      router.replace("/dashboard/blog/authors");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  // Live preview, exactly as a post shows it. Links only appear once they
  // look like links; the server validates properly on save.
  const looksLikeUrl = (v: string) => /^https:\/\/\S+\.\S+/.test(v.trim());
  const preview: AuthorView = {
    name: name.trim() || "Author name",
    role: role.trim() || null,
    bio: bio.trim() || null,
    image: imageUrl || null,
    url: author ? `/blog/author/${author.slug}` : "/about",
    links: [
      { label: "LinkedIn", href: linkedinUrl },
      { label: "X", href: xUrl },
      { label: "GitHub", href: githubUrl },
      { label: "Website", href: websiteUrl },
    ].filter((l) => looksLikeUrl(l.href)),
    highlights,
  };

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/blog/authors"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> All authors
      </Link>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5 rounded-card bg-card p-6 shadow-card">
          <div className="flex items-center gap-4">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview of the uploaded photo
              <img src={imageUrl} alt="" className="size-20 rounded-full border-2 border-[#151515] object-cover" />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full border-2 border-dashed border-line text-ink-faint">
                <ImagePlus className="size-6" aria-hidden />
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink hover:border-ink-faint disabled:opacity-60"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {imageUrl ? "Change photo" : "Upload photo"}
              </button>
              {imageUrl && (
                <button type="button" onClick={() => setImageUrl("")} className="h-10 px-3 text-sm text-ink-secondary hover:text-ink">
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
              <p className="w-full text-[13px] text-ink-faint">A square, clear headshot works best. JPEG, PNG or WebP.</p>
            </div>
          </div>

          <Field id="author-name" label="Name" hint="Exactly as it appears in a post's author field - that is how posts are matched to this profile.">
            <input id="author-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dakshesh B" className={fieldClass} />
          </Field>
          <Field id="author-role" label="Role">
            <input id="author-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder, MyKavo" className={fieldClass} />
          </Field>
          <Field id="author-bio" label={`Description (${bio.length}/600)`} hint="Two or three sentences: what they do and why they know this topic.">
            <textarea id="author-bio" rows={4} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} className={fieldClass} />
          </Field>

          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Highlights</p>
            <p className="mb-2 text-[13px] text-ink-faint">
              Real, checkable facts that show experience - &quot;Built and maintained 40+ client WordPress sites&quot;,
              &quot;Speaker at WordCamp Pune 2025&quot;. No follower counts or claims you cannot back up. Up to {MAX_HIGHLIGHTS}.
            </p>
            {highlights.length > 0 && (
              <ul className="mb-2 space-y-2">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink">
                    <span className="flex-1">{h}</span>
                    <button type="button" onClick={() => setHighlights(highlights.filter((x) => x !== h))} aria-label={`Remove "${h}"`} className="text-ink-faint hover:text-ink">
                      <X className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {highlights.length < MAX_HIGHLIGHTS && (
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addHighlight();
                    }
                  }}
                  maxLength={140}
                  placeholder="Add a highlight and press Enter"
                  aria-label="New highlight"
                  className={fieldClass}
                />
                <button type="button" onClick={addHighlight} aria-label="Add highlight" className="inline-flex size-12 shrink-0 items-center justify-center rounded-field border border-line bg-card text-ink hover:border-ink-faint">
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="author-linkedin" label="LinkedIn">
              <input id="author-linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://www.linkedin.com/in/..." className={fieldClass} />
            </Field>
            <Field id="author-x" label="X">
              <input id="author-x" value={xUrl} onChange={(e) => setXUrl(e.target.value)} placeholder="https://x.com/..." className={fieldClass} />
            </Field>
            <Field id="author-github" label="GitHub">
              <input id="author-github" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/..." className={fieldClass} />
            </Field>
            <Field id="author-website" label="Website">
              <input id="author-website" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className={fieldClass} />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !name.trim()}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {author ? "Save author" : "Add author"}
            </button>
            {author && (
              <button type="button" onClick={remove} disabled={deleting} className="inline-flex h-11 items-center gap-2 px-3 text-sm font-medium text-critical-strong disabled:opacity-60">
                {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
                Delete
              </button>
            )}
            {error && <p className="text-sm text-critical-strong" role="alert">{error}</p>}
            {notice && !error && <p className="text-sm text-success-strong">{notice}</p>}
          </div>
        </div>

        <div>
          <p className="label-micro mb-2">Preview - as it appears on a post</p>
          <div className="blog-reader rounded-[28px] bg-card p-6 shadow-card">
            <AuthorBox author={preview} showPageLink={Boolean(author)} />
          </div>
        </div>
      </div>
    </div>
  );
}
