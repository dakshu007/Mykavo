import { z } from "zod";
import { site } from "@/config/site";
import { authorFor as staticAuthorFor } from "@/config/authors";

/**
 * Blog author profiles - validation and the one shape the public pages
 * render. Pure: the database lookups live in blog-authors-server.ts.
 */

/** An https URL on one of the given hosts (or any host when none given). */
const profileUrl = (hosts: string[], label: string) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine(
      (v) => {
        if (v === null) return true;
        try {
          const u = new URL(v);
          if (u.protocol !== "https:") return false;
          const host = u.hostname.replace(/^www\./, "");
          return hosts.length === 0 || hosts.some((h) => host === h || host.endsWith(`.${h}`));
        } catch {
          return false;
        }
      },
      { message: `${label} must be an https:// link${hosts.length ? ` on ${hosts.join(" or ")}` : ""}.` },
    );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const authorInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  role: optionalText(120),
  bio: optionalText(600),
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^\/api\/blog-images\/[a-f0-9]{32}\.(jpg|png|webp|gif)$/.test(v) || /^https:\/\//.test(v), {
      message: "Photo must be an uploaded image or an https:// link.",
    }),
  linkedinUrl: profileUrl(["linkedin.com"], "LinkedIn"),
  xUrl: profileUrl(["x.com", "twitter.com"], "X"),
  githubUrl: profileUrl(["github.com"], "GitHub"),
  websiteUrl: profileUrl([], "Website"),
  highlights: z
    .array(z.string().trim().min(1).max(140))
    .max(6, "At most 6 highlights.")
    .default([]),
});

export type AuthorInput = z.infer<typeof authorInputSchema>;

/** What the public pages render - from the database, or the static fallback. */
export interface AuthorView {
  name: string;
  role: string | null;
  bio: string | null;
  /** Absolute URL, ready for <img> and JSON-LD. */
  image: string | null;
  /** The author's page on this site. */
  url: string;
  links: { label: string; href: string }[];
  highlights: string[];
}

export interface AuthorRecord {
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

export function authorView(a: AuthorRecord): AuthorView {
  const links = [
    { label: "LinkedIn", href: a.linkedinUrl },
    { label: "X", href: a.xUrl },
    { label: "GitHub", href: a.githubUrl },
    { label: "Website", href: a.websiteUrl },
  ].filter((l): l is { label: string; href: string } => Boolean(l.href));
  return {
    name: a.name,
    role: a.role,
    bio: a.bio,
    image: a.imageUrl ? (a.imageUrl.startsWith("http") ? a.imageUrl : `${site.url}${a.imageUrl}`) : null,
    url: `${site.url}/blog/author/${a.slug}`,
    links,
    highlights: a.highlights,
  };
}

/** The static profile (config/authors.ts) as a view, for before any DB author exists. */
export function staticAuthorView(authorName: string): AuthorView | null {
  const a = staticAuthorFor(authorName);
  if (!a) return null;
  return {
    name: a.name,
    role: a.role,
    bio: a.bio,
    image: a.image ? (a.image.startsWith("http") ? a.image : `${site.url}${a.image}`) : null,
    url: a.url,
    links: a.sameAs.map((href) => ({ label: href.includes("linkedin.com") ? "LinkedIn" : "Profile", href })),
    highlights: [],
  };
}
