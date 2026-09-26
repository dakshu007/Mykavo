"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { card, fontDisplay } from "@/components/landing/style";
import { cn } from "@/lib/utils";
import { coverPalette } from "@/lib/blog-cover";

/** Serialized on the server - dates are preformatted so SSR and client agree. */
export interface BlogIndexPost {
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  publishedAtIso: string | null;
  publishedAtLabel: string | null;
  readMinutes: number;
  /** Display topics only (lib/blog-display.ts) - never search phrases. */
  tags: string[];
}

export interface BlogTopic {
  label: string;
  count: number;
}

/** Cards shown before the first "Load more" click. */
const PAGE_SIZE = 9;

const sameTopic = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * The post's generated cover (app/blog/[slug]/cover) - topic and motif, not
 * the title, which sits right under it. Decorative, so alt is empty.
 */
function Thumb({
  slug,
  priority = false,
  sizes,
  className = "",
}: {
  slug: string;
  priority?: boolean;
  sizes: string;
  className?: string;
}) {
  return (
    <Image
      src={`/blog/${slug}/cover`}
      alt=""
      width={1200}
      height={630}
      sizes={sizes}
      priority={priority}
      className={cn("aspect-[1200/630] w-full bg-[#F3F1E6] object-cover", className)}
    />
  );
}

function Meta({ post }: { post: BlogIndexPost }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-[#6B6B60]">
      <span
        aria-hidden
        className="flex size-5 items-center justify-center rounded-full border border-[#151515]/60 bg-[#FFD400] text-[10px] font-bold text-[#151515]"
      >
        {post.authorName.trim().charAt(0).toUpperCase() || "M"}
      </span>
      <span className="font-medium text-[#151515]">{post.authorName}</span>
      {post.publishedAtIso && post.publishedAtLabel && (
        <>
          <span aria-hidden>·</span>
          <time dateTime={post.publishedAtIso}>{post.publishedAtLabel}</time>
        </>
      )}
      <span aria-hidden>·</span>
      {post.readMinutes} min read
    </p>
  );
}

export function BlogIndexList({
  posts,
  topics,
  initialTopic,
}: {
  posts: BlogIndexPost[];
  topics: BlogTopic[];
  initialTopic: string | null;
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string | null>(initialTopic);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return posts.filter((post) => {
      if (topic && !post.tags.some((t) => sameTopic(t, topic))) return false;
      if (!needle) return true;
      return [post.title, post.excerpt ?? "", post.authorName, post.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [posts, query, topic]);

  // The newest post leads, large, when nothing is being filtered.
  const browsing = !topic && !query.trim();
  const featured = browsing ? filtered[0] : undefined;
  const rest = featured ? filtered.slice(1) : filtered;
  const remaining = Math.max(0, rest.length - visibleCount);

  function chooseTopic(next: string | null) {
    setTopic(next);
    setVisibleCount(PAGE_SIZE);
    // Keep the filter in the address bar so it can be shared or bookmarked.
    const url = new URL(window.location.href);
    if (next) url.searchParams.set("topic", next);
    else url.searchParams.delete("topic");
    window.history.replaceState(null, "", url);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-all",
      active
        ? "border-[#151515] bg-[#151515] text-white shadow-[2px_2px_0_#FFD400]"
        : "border-[#151515]/15 bg-white text-[#151515] hover:border-[#151515]",
    );

  return (
    <div className="mx-auto max-w-6xl">
      {/* Filters: topics on the left, search on the right */}
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {topics.length > 0 && (
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0" role="group" aria-label="Filter by topic">
            <button type="button" onClick={() => chooseTopic(null)} className={chip(!topic)} aria-pressed={!topic}>
              All <span className="opacity-60">{posts.length}</span>
            </button>
            {topics.map((t) => {
              const active = topic !== null && sameTopic(topic, t.label);
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => chooseTopic(active ? null : t.label)}
                  className={chip(active)}
                  aria-pressed={active}
                >
                  {t.label} <span className="opacity-60">{t.count}</span>
                </button>
              );
            })}
          </div>
        )}
        <div className="relative w-full shrink-0 lg:w-80">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#6B6B60]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search posts…"
            aria-label="Search blog posts"
            className="h-11 w-full rounded-full border border-[#151515]/20 bg-white pl-11 pr-10 text-[14.5px] text-[#151515] placeholder:text-[#6B6B60]/70 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
          />
          {query && (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6B6B60] transition-colors hover:text-[#151515]"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
          <h2 className={`${fontDisplay} text-2xl text-[#151515]`}>No posts match.</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#6B6B60]">
            Nothing found{query.trim() ? <> for &ldquo;{query.trim()}&rdquo;</> : null}
            {topic ? <> in {topic}</> : null}. Try another topic or keyword.
          </p>
          <button
            type="button"
            onClick={() => {
              handleQueryChange("");
              chooseTopic(null);
            }}
            className="mt-6 rounded-full border border-[#151515] bg-white px-5 py-2.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#FFD400]"
          >
            Show all posts
          </button>
        </div>
      ) : (
        <>
          {featured && (
            <article className="group relative mb-8 grid overflow-hidden rounded-3xl border-2 border-[#151515] bg-white shadow-[6px_6px_0_#FFD400] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[8px_9px_0_#FFD400] motion-reduce:hover:translate-y-0 lg:grid-cols-[1.15fr_1fr]">
              {/* The cover keeps its shape; the taller column around it is filled
                  with the cover's own background colour, so nothing is cropped. */}
              <div
                className="flex items-center overflow-hidden border-b-2 border-[#151515] lg:border-b-0 lg:border-r-2"
                style={{ backgroundColor: coverPalette(featured.slug).bg }}
              >
                <div className="w-full transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:group-hover:scale-100">
                  <Thumb slug={featured.slug} priority sizes="(min-width: 1024px) 620px, 100vw" />
                </div>
              </div>
              <div className="flex flex-col p-6 sm:p-8">
                <span className="mb-3 inline-flex w-fit items-center rounded-full border border-[#151515] bg-[#FFD400] px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#151515]">
                  Latest
                </span>
                <h2 className={`${fontDisplay} text-[26px] leading-tight text-[#151515] sm:text-[32px]`}>
                  {/* The whole card is clickable through this link's overlay. */}
                  <Link href={`/blog/${featured.slug}`} className="after:absolute after:inset-0">
                    {featured.title}
                  </Link>
                </h2>
                {featured.excerpt && (
                  <p className="mt-3 line-clamp-4 text-[15px] leading-7 text-[#6B6B60]">{featured.excerpt}</p>
                )}
                <div className="mt-auto pt-6">
                  <Meta post={featured} />
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                    Read post <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </div>
            </article>
          )}

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, index) => (
              <article
                key={post.slug}
                // Every post stays in the HTML - hidden, not missing - so
                // crawlers find all of them from /blog; "Load more" only
                // changes what is on screen.
                hidden={index >= visibleCount}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#151515]/15 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-[#151515] hover:shadow-[5px_5px_0_#151515] motion-reduce:hover:translate-y-0"
              >
                <div className="overflow-hidden border-b border-[#151515]/10">
                  <div className="transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100">
                    <Thumb slug={post.slug} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" />
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  {post.tags.length > 0 && (
                    <ul className="relative z-10 mb-3 flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 2).map((tag) => (
                        <li key={tag}>
                          <button
                            type="button"
                            onClick={() => chooseTopic(tag)}
                            className="rounded-full border border-[#151515]/15 bg-[#FFD400]/25 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#151515] transition-colors hover:bg-[#FFD400]/60"
                          >
                            {tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <h2 className="line-clamp-3 text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[#151515]">
                    <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0">
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-[14px] leading-6 text-[#6B6B60]">{post.excerpt}</p>
                  )}
                  <div className="mt-auto pt-5">
                    <Meta post={post} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {remaining > 0 && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-colors hover:bg-[#ffe14d]"
          >
            Load more posts ({remaining} more)
          </button>
        </div>
      )}
    </div>
  );
}
