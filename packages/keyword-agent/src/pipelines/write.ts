import { MODELS } from "../pricing";
import { AgentError, structuredCall, type AgentDeps, type AgentRun } from "../claude";
import { postOutput, type ProfileInput } from "../schemas";
import { htmlToText, sanitizePostHtml, slugify } from "../html";
import { buildJsonLd, type FaqItem } from "../jsonld";

/**
 * One-click post writer: a single Sonnet call for the whole draft, then code
 * does everything that must be exact: HTML sanitising, links restricted to
 * the site's real pages, slug, JSON-LD and the length checks. A truncated or
 * thin answer is never saved.
 */

export interface WriteInput {
  keyword: string;
  /** The user's own experience, examples or opinions (E-E-A-T), optional. */
  notes: string;
  profile: ProfileInput;
  siteName: string;
  siteUrl: string;
  /** The only URLs the post may link to. */
  pages: { url: string; title: string }[];
  /** Titles already written for this site, to avoid repeating them. */
  existingTitles: string[];
}

export interface WrittenPost {
  title: string;
  slug: string;
  metaDescription: string;
  bodyHtml: string;
  faq: FaqItem[];
  jsonLd: Record<string, unknown>[];
  reviewNotes: string[];
  wordCount: number;
}

const SYSTEM = `You are an expert content writer for small business websites. You write original, genuinely useful posts in plain, warm, human language for real customers, not for search engines.
Rules:
- Write in the requested language only.
- Original writing only. Never copy wording from other sites.
- Never invent statistics, prices, studies, quotes, awards or customer stories. If a fact needs checking, say so in reviewNotes.
- Medical, legal and financial topics: general information only, recommend speaking to a professional, and add a reviewNotes item asking for expert review.
- Links: only to URLs from the provided page list, where they genuinely help the reader. No other links.`;

export const MIN_WORDS = 300;

export async function writePost(deps: AgentDeps, run: AgentRun, input: WriteInput): Promise<WrittenPost> {
  const raw = await structuredCall(deps, run, {
    step: "write",
    model: MODELS.writer,
    system: SYSTEM,
    instruction: `Write a complete blog post for this business targeting the search "${input.keyword}".
- onTopic: false if the search has nothing to do with this business (then write nothing else useful).
- title: compelling, includes the search naturally, under 65 characters, different from the existing titles.
- metaDescription: 140 to 160 characters.
- bodyHtml: 900 to 1500 words of HTML using only h2, h3, p, ul, ol, li, strong, em and a. No h1 (the title is the h1). Start with a short intro that answers the search directly. Use the business's own services and the owner's notes where relevant. Include 2 to 4 links to the most relevant pages from the page list.
- faq: 3 to 5 questions people really ask about this search, with short answers.
- reviewNotes: anything the owner must check or personalise before publishing (prices, claims, local details).
Language: "${input.profile.language}". Market: "${input.profile.country}".`,
    data: {
      business: input.profile,
      siteName: input.siteName,
      ownerNotes: input.notes || "None given.",
      pages: input.pages.slice(0, 40),
      existingTitles: input.existingTitles.slice(0, 30),
    },
    schema: postOutput,
    maxTokens: 16_000,
    effort: "medium",
  });

  if (!raw.onTopic) {
    throw new AgentError("off_topic", `"${input.keyword}" doesn't look related to this website, so no post was written.`);
  }

  const bodyHtml = sanitizePostHtml(raw.bodyHtml, { allowedLinks: input.pages.map((p) => p.url) });
  const wordCount = htmlToText(bodyHtml).split(" ").filter(Boolean).length;
  if (wordCount < MIN_WORDS) {
    throw new AgentError("failed", "The draft came back too short to be useful, so it was not saved. Please try again.");
  }

  const title = raw.title.replace(/\s+/g, " ").trim().slice(0, 120) || input.keyword;
  const metaDescription = raw.metaDescription.replace(/\s+/g, " ").trim().slice(0, 170);
  const faq = raw.faq
    .map((f) => ({ question: f.question.replace(/\s+/g, " ").trim().slice(0, 200), answer: f.answer.replace(/\s+/g, " ").trim().slice(0, 800) }))
    .filter((f) => f.question && f.answer)
    .slice(0, 8);

  return {
    title,
    slug: slugify(title) || slugify(input.keyword),
    metaDescription,
    bodyHtml,
    faq,
    jsonLd: buildJsonLd({
      title,
      metaDescription,
      language: input.profile.language,
      siteName: input.siteName,
      siteUrl: input.siteUrl,
      faq,
    }),
    reviewNotes: raw.reviewNotes.map((n) => n.replace(/\s+/g, " ").trim().slice(0, 300)).filter(Boolean).slice(0, 8),
    wordCount,
  };
}
