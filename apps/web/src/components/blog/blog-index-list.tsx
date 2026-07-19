"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, X } from "lucide-react";
import { card, fontDisplay } from "@/components/landing/style";

/** Serialized on the server - dates are preformatted so SSR and client agree. */
export interface BlogIndexPost {
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  publishedAtIso: string | null;
  publishedAtLabel: string | null;
  readMinutes: number;
  tags: string[];
}

/** Posts shown before the first "Load more" click - keeps the page short. */
const PAGE_SIZE = 6;

export function BlogIndexList({ posts }: { posts: BlogIndexPost[] }) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return posts;
    return posts.filter((post) =>
      [post.title, post.excerpt ?? "", post.authorName, post.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [posts, query]);

  const visible = filtered.slice(0, visibleCount);
  const remaining = filtered.length - visible.length;

  function handleQueryChange(value: string) {
    setQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-8">
        <Search
          className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-[#6B6B60]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Search posts by title, topic, or tag…"
          aria-label="Search blog posts"
          className="w-full rounded-full border border-[#151515]/20 bg-white py-3.5 pl-12 pr-12 text-[15px] text-[#151515] placeholder:text-[#6B6B60]/70 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
        />
        {query && (
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6B6B60] transition-colors hover:text-[#151515]"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={`${card} flex flex-col items-center px-6 py-14 text-center`}>
          <h2 className={`${fontDisplay} text-2xl text-[#151515]`}>No posts match.</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#6B6B60]">
            Nothing found for &ldquo;{query.trim()}&rdquo;. Try a different keyword or browse
            everything.
          </p>
          <button
            type="button"
            onClick={() => handleQueryChange("")}
            className="mt-6 rounded-full border border-[#151515] bg-white px-5 py-2.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#FFD400]"
          >
            Show all posts
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {visible.map((post) => (
            <article
              key={post.slug}
              className={`${card} group p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[5px_5px_0_#151515] sm:p-8`}
            >
              <p className="text-[13px] text-[#6B6B60]">
                {post.publishedAtIso && post.publishedAtLabel && (
                  <>
                    <time dateTime={post.publishedAtIso}>{post.publishedAtLabel}</time>
                    <span aria-hidden> · </span>
                  </>
                )}
                {post.authorName}
                <span aria-hidden> · </span>
                {post.readMinutes} min read
              </p>
              <h2 className={`${fontDisplay} mt-3 text-[28px] leading-tight text-[#151515]`}>
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              {post.excerpt && (
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{post.excerpt}</p>
              )}
              {post.tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <li key={tag}>
                      <button
                        type="button"
                        onClick={() => handleQueryChange(tag)}
                        className="rounded-full border border-[#151515]/15 bg-[#FFD400]/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#151515] transition-colors hover:bg-[#FFD400]/60"
                      >
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                Read post{" "}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-1"
                  aria-hidden
                />
              </Link>
            </article>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-colors hover:bg-[#ffe14d]"
          >
            Read more posts ({remaining} more)
          </button>
        </div>
      )}
    </div>
  );
}
