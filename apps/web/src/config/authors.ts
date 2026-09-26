import { site } from "./site";

/**
 * Blog authors - the real people behind the posts.
 *
 * Search engines and AI answer engines weigh who wrote a page (E-E-A-T):
 * a named person with a role, a bio and profiles they can verify beats an
 * anonymous "Team". Posts store a free-text author name, so each profile
 * says which names are its own.
 *
 * `sameAs` and `image` stay empty until they are real: a sameAs pointing at
 * a profile that is not this person's is an entity-graph error.
 */
export interface AuthorProfile {
  id: string;
  /** Matches the post's authorName. */
  matches: (authorName: string) => boolean;
  name: string;
  role: string;
  bio: string;
  /** Where to learn more - the about page for now. */
  url: string;
  /** Public path or absolute URL of a square photo; initials when absent. */
  image: string | null;
  /** The person's own profiles (LinkedIn, X, GitHub). */
  sameAs: string[];
}

export const AUTHORS: AuthorProfile[] = [
  {
    id: "dakshesh",
    matches: (n) => /^\s*dakshesh\b/i.test(n),
    name: "Dakshesh B",
    role: "Founder, MyKavo",
    bio: "Founder of MyKavo. Builds website change and regression monitoring for agencies, developers and site owners, and writes about the quiet ways websites break - plugin updates, deploys, and SEO settings that change without anyone noticing.",
    url: `${site.url}/about`,
    image: null,
    sameAs: [],
  },
];

/** The profile for a post's author name, or null for team posts. */
export function authorFor(authorName: string): AuthorProfile | null {
  return AUTHORS.find((a) => a.matches(authorName)) ?? null;
}
