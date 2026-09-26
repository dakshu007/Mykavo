import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { AuthorView } from "@/lib/blog-authors";

/**
 * "Written by" - the author's photo, role, bio, highlights and profile
 * links. Shared by the post page, the author page and the dashboard's live
 * preview (no hooks, so it renders on the server and the client alike).
 *
 * The highlights are the author's own verifiable facts, and the links are
 * their real profiles - the social proof here is "you can check who this
 * is", never invented numbers or badges.
 */
export function AuthorBox({
  author,
  showPageLink = true,
  className = "",
}: {
  author: AuthorView;
  /** Off on the author page itself. */
  showPageLink?: boolean;
  className?: string;
}) {
  const initial = author.name.trim().charAt(0).toUpperCase() || "M";
  return (
    <div className={`flex items-start gap-4 ${className}`}>
      {author.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- small fixed-size avatar from the blog image store
        <img
          src={author.image}
          alt={author.name}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-full border-2 border-[#151515] object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-[#151515] bg-[#FFD400] text-2xl font-bold text-[#151515]"
        >
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="label-micro">Written by</p>
        <p className="mt-0.5 text-[17px] font-semibold text-ink">{author.name}</p>
        {author.role && <p className="text-sm text-ink-secondary">{author.role}</p>}
        {author.bio && <p className="mt-2 text-sm leading-6 text-ink-secondary">{author.bio}</p>}
        {author.highlights.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {author.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm leading-6 text-ink">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-[#1A7F37]" aria-hidden />
                {h}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {author.links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer me"
              className="inline-flex h-8 items-center rounded-full border border-[#151515]/15 bg-white px-3 text-[12.5px] font-semibold text-[#151515] transition-colors hover:border-[#151515]"
            >
              {l.label}
            </a>
          ))}
          {showPageLink && (
            <Link
              href={author.url.replace(/^https?:\/\/[^/]+/, "") || "/about"}
              className="ml-1 text-[13px] font-semibold text-ink underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              More from {author.name.split(/\s+/)[0]}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
