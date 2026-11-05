/**
 * Reviews of the MyKavo plugin on WordPress.org, shown under "Running
 * WordPress? Install the free plugin." on the homepage.
 *
 * Real reviews only, word for word, each linking to the original on
 * WordPress.org, with the plugin's real overall rating next to them so
 * showing the 4 and 5 star ones never hides the full picture. Read from
 * WordPress.org's public reviews feed and plugin API, cached for six hours;
 * if WordPress.org cannot be reached, the section simply does not show.
 * No review markup (schema.org) is added: reviews of our own product on our
 * own site are not eligible for review rich results.
 */

export const WPORG_REVIEWS_FEED_URL = "https://wordpress.org/support/plugin/mykavo/reviews/feed/";
export const WPORG_REVIEWS_PAGE_URL = "https://wordpress.org/support/plugin/mykavo/reviews/";
const WPORG_RATING_URL =
  "https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=mykavo&request%5Bfields%5D%5Bsections%5D=0";
const REVALIDATE_SECONDS = 6 * 60 * 60;

export interface WpReview {
  title: string;
  author: string;
  rating: number;
  text: string;
  url: string;
  date: string;
}

export interface WpRating {
  /** Average out of 5, one decimal. */
  average: number;
  count: number;
}

/** Decode the few HTML entities WordPress.org feeds use. */
function decode(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function tag(item: string, name: string): string {
  const m = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}

/** Every review in a WordPress.org reviews RSS feed, newest first. Pure. */
export function parseReviewsFeed(xml: string): WpReview[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const out: WpReview[] = [];
  for (const item of items) {
    const description = tag(item, "description").replace(/^<!\[CDATA\[|\]\]>$/g, "");
    const rating = Number(description.match(/Rating:\s*(\d)\s*star/i)?.[1] ?? 0);
    // The review body: the paragraphs after "Rating", without bbPress's
    // "Replies" line or its revision log.
    const body = description
      .replace(/<ul[^>]*bbp-topic-revision-log[\s\S]*?<\/ul>/g, "")
      .replace(/<p>\s*Replies:[\s\S]*?<\/p>/i, "")
      .replace(/<p>\s*Rating:[\s\S]*?<\/p>/i, "")
      .replace(/<[^>]+>/g, " ");
    const text = decode(body).replace(/\s+/g, " ").trim();
    const title = decode(tag(item, "title")).replace(/\s*\(\d stars?\)\s*$/i, "").trim();
    const url = tag(item, "link");
    if (!rating || !text || !/^https:\/\/wordpress\.org\//.test(url)) continue;
    out.push({
      title,
      author: decode(tag(item, "dc:creator")),
      rating,
      text,
      url,
      date: new Date(tag(item, "pubDate")).toISOString(),
    });
  }
  return out;
}

/**
 * The reviews worth showing: 4 and 5 stars, long enough to say something
 * ("thank you" says nothing), newest first.
 */
export function pickReviews(reviews: WpReview[], limit = 3): WpReview[] {
  return reviews.filter((r) => r.rating >= 4 && r.text.length >= 25).slice(0, limit);
}

/** WordPress.org's rating (a 0-100 percentage) as an average out of 5. Pure. */
export function parseRating(json: unknown): WpRating | null {
  if (!json || typeof json !== "object") return null;
  const { rating, num_ratings: count } = json as { rating?: unknown; num_ratings?: unknown };
  if (typeof rating !== "number" || typeof count !== "number" || count < 1) return null;
  return { average: Math.round((rating / 20) * 10) / 10, count };
}

/** The reviews and rating to show, or nothing when WordPress.org has none or cannot be reached. */
export async function getPluginReviews(): Promise<{ reviews: WpReview[]; rating: WpRating | null }> {
  try {
    const [feed, info] = await Promise.all([
      fetch(WPORG_REVIEWS_FEED_URL, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) }),
      fetch(WPORG_RATING_URL, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(5000) }),
    ]);
    const reviews = feed.ok ? pickReviews(parseReviewsFeed(await feed.text())) : [];
    const rating = info.ok ? parseRating(await info.json().catch(() => null)) : null;
    return { reviews, rating };
  } catch {
    return { reviews: [], rating: null };
  }
}
