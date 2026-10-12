/**
 * Shapes an engine reply into what the support widget renders. Kept apart
 * from the route so it can be tested without a request or a database.
 */

import { SUPPORT_CATEGORIES, type SupportArticle } from "@/config/support-kb/types";
import type { SupportEngine, SupportReply } from "./engine";
import { FALLBACK_REPLY, SMALL_TALK_REPLIES, SUGGEST_INTRO } from "./replies";

export interface ArticleRef {
  id: string;
  title: string;
}

export interface AssistantMessage {
  kind: SupportReply["kind"] | "pick";
  /** Markdown-subset text to show. */
  text: string;
  /** The article this answer came from. */
  article: (ArticleRef & { category: string }) | null;
  /** Clickable follow-ups: related articles or "did you mean" choices. */
  options: ArticleRef[];
  /** Whether to show the email hand-over prominently. */
  offerEmail: boolean;
  score: number;
}

const ref = (a: SupportArticle): ArticleRef => ({ id: a.id, title: a.title });

export function articleMessage(article: SupportArticle, related: SupportArticle[], kind: "answer" | "pick", score: number): AssistantMessage {
  return {
    kind,
    text: article.answer,
    article: { id: article.id, title: article.title, category: SUPPORT_CATEGORIES[article.category].title },
    options: related.map(ref),
    offerEmail: false,
    score,
  };
}

export function toMessage(reply: SupportReply): AssistantMessage {
  switch (reply.kind) {
    case "answer":
      return articleMessage(reply.article, reply.related, "answer", reply.score);
    case "suggest":
      return { kind: "suggest", text: SUGGEST_INTRO, article: null, options: reply.suggestions.map(ref), offerEmail: true, score: reply.score };
    case "smalltalk":
      return {
        kind: "smalltalk",
        text: SMALL_TALK_REPLIES[reply.intent],
        article: null,
        options: [],
        offerEmail: reply.intent === "human" || reply.intent === "negative",
        score: 1,
      };
    case "fallback":
      return { kind: "fallback", text: FALLBACK_REPLY, article: null, options: [], offerEmail: true, score: reply.score };
  }
}

/** A suggestion or related article the person clicked. */
export function pickMessage(engine: SupportEngine, articleId: string): AssistantMessage | null {
  const article = engine.get(articleId);
  if (!article) return null;
  const related = (article.related ?? [])
    .map((id) => engine.get(id))
    .filter((a): a is SupportArticle => Boolean(a))
    .slice(0, 3);
  return articleMessage(article, related, "pick", 1);
}
