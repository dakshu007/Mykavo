/**
 * The support assistant's matcher: given a question, find the knowledge-base
 * article that answers it, or admit it does not know.
 *
 * Deterministic retrieval, no model calls, so it costs nothing per question
 * and gives the same answer every time:
 *
 * - Every article is indexed through its title, its 15-30 phrasings, its
 *   keywords and (lightly) its answer text, as TF-IDF vectors over terms and
 *   adjacent-term pairs.
 * - A question scores against each article twice: its best single phrasing
 *   (precise when someone asks the way we wrote it) and the article as a
 *   whole (robust when they use other words). The score is a blend.
 * - Words not in the vocabulary are spell-corrected to the nearest known term
 *   ("wordpres" → "wordpress"), so typos still land.
 * - Confidence decides the reply: answer, offer "did you mean" choices, or
 *   hand over to support@mykavo.app. A wrong confident answer is worse than
 *   "I am not sure", so the bar to answer is deliberately high.
 */

import type { SupportArticle } from "@/config/support-kb/types";
import { editDistance, normalizeText, terms } from "./text";

type Vector = Map<string, number>;

export interface MatchThresholds {
  /** Minimum blended score to answer outright. */
  answer: number;
  /** A score this high answers even when a runner-up is close. */
  sure: number;
  /** Lead the top article needs over the runner-up to answer outright. */
  margin: number;
  /** Minimum score for an article to be offered as a suggestion. */
  suggest: number;
}

/**
 * Calibrated on the held-out eval phrasings (lib/support/kb.test.ts): at
 * these values about nine in ten outright answers are the right article or
 * one it links to, and the rest get "did you mean" choices instead.
 */
export const DEFAULT_THRESHOLDS: MatchThresholds = {
  answer: 0.6,
  sure: 0.85,
  margin: 0.35,
  suggest: 0.5,
};

export type SmallTalkIntent = "greeting" | "thanks" | "bye" | "human" | "identity" | "affirm" | "negative";

export interface Ranked {
  article: SupportArticle;
  score: number;
}

export type SupportReply =
  | { kind: "answer"; article: SupportArticle; score: number; related: SupportArticle[] }
  | { kind: "suggest"; suggestions: SupportArticle[]; score: number }
  | { kind: "fallback"; score: number }
  | { kind: "smalltalk"; intent: SmallTalkIntent };

interface IndexedArticle {
  article: SupportArticle;
  phrases: Vector[];
  centroid: Vector;
}

export interface EngineTuning {
  /** Weight of the best single phrasing vs the whole article in the blend. */
  phraseWeight: number;
  /** Pairs of adjacent terms count for less than single terms. */
  bigramWeight: number;
  /** The answer body adds vocabulary to an article, at a low weight. */
  answerWeight: number;
  titleWeight: number;
  /** Rarity measured across articles (true) or across single phrasings. */
  articleIdf: boolean;
  /** Let answer words the phrasings never use into the article vector. */
  answerNewWords: boolean;
  /**
   * Index the held-out eval phrasings too. On in production (more phrasings,
   * better answers); the accuracy test turns it off to measure honestly.
   */
  indexEvalQuestions: boolean;
  /** Weight of the Naive Bayes posterior added to the similarity score. */
  bayesWeight: number;
  /** Additive smoothing for Naive Bayes. */
  bayesAlpha: number;
}

export const DEFAULT_TUNING: EngineTuning = {
  phraseWeight: 0.55,
  bigramWeight: 0.6,
  answerWeight: 0.2,
  titleWeight: 1.4,
  articleIdf: true,
  answerNewWords: false,
  indexEvalQuestions: true,
  bayesWeight: 0.5,
  bayesAlpha: 0.1,
};
const MAX_RELATED = 3;
const MAX_SUGGESTIONS = 3;

function featuresOf(ts: string[], bigramWeight: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (const t of ts) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (let i = 0; i + 1 < ts.length; i++) {
    const pair = `${ts[i]}_${ts[i + 1]}`;
    counts.set(pair, (counts.get(pair) ?? 0) + bigramWeight);
  }
  return counts;
}

function normalize(v: Vector): Vector {
  let sum = 0;
  for (const x of v.values()) sum += x * x;
  const len = Math.sqrt(sum);
  if (len === 0) return v;
  for (const [k, x] of v) v.set(k, x / len);
  return v;
}

function dot(a: Vector, b: Vector): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let s = 0;
  for (const [k, x] of small) {
    const y = large.get(k);
    if (y !== undefined) s += x * y;
  }
  return s;
}

function addInto(target: Vector, v: Vector, weight: number) {
  for (const [k, x] of v) target.set(k, (target.get(k) ?? 0) + x * weight);
}

/** Answer text without link targets and markup, for indexing. */
function plainAnswer(answer: string): string {
  return answer.replace(/\]\([^)]*\)/g, "]").replace(/[*#[\]]/g, " ");
}

const SMALL_TALK: [SmallTalkIntent, RegExp][] = [
  [
    "human",
    /\b(human|real person|real human|person|someone real|agent|representative|operator|live chat|talk to (you|someone|support|a person)|speak (to|with) (someone|support|a person|a human)|contact (you|support|us|the team)|support email|your email|email address for support|reach (you|support))\b/,
  ],
  ["identity", /^(who|what) are you\b|\bare you (a )?(bot|robot|ai|human|real|chatgpt|gpt)\b|\byour name\b/],
  ["thanks", /^(thanks|thank you|thx|ty|cheers|great thanks|awesome|perfect|nice|cool|got it|that helped|helpful)[!. ]*$/],
  ["bye", /^(bye|goodbye|see you|see ya|later|cya|good night)[!. ]*$/],
  ["greeting", /^(hello|hi|hey|hiya|yo|good (morning|afternoon|evening)|namaste|greetings|sup|hola)( there| team| mykavo)?[!. ]*$/],
  ["affirm", /^(yes|yeah|yep|yup|sure|ok|okay|alright|fine)[!. ]*$/],
  ["negative", /^(no|nope|nah|not really|didnt help|that didnt help|wrong|useless|not helpful)[!. ]*$/],
];

export function detectSmallTalk(question: string): SmallTalkIntent | null {
  const text = normalizeText(question)
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "greeting";
  for (const [intent, pattern] of SMALL_TALK) {
    if (!pattern.test(text)) continue;
    // "Can a real person review my alerts" is a question, not a hand-off
    // request: only treat "human" as small talk when the message is short.
    if (intent === "human" && text.split(" ").length > 9) continue;
    return intent;
  }
  return null;
}

export interface SupportEngine {
  ask(question: string, options?: { contextArticleId?: string }): SupportReply;
  rank(question: string, options?: { contextArticleId?: string }): Ranked[];
  get(id: string): SupportArticle | undefined;
  articles: SupportArticle[];
}

export function createSupportEngine(
  articles: SupportArticle[],
  thresholds: MatchThresholds = DEFAULT_THRESHOLDS,
  tuning: EngineTuning = DEFAULT_TUNING,
): SupportEngine {
  const byId = new Map(articles.map((a) => [a.id, a]));
  const features = (ts: string[]) => featuresOf(ts, tuning.bigramWeight);

  // Document frequency over every phrase (title, phrasings, keywords).
  const phraseFeatures: { articleIndex: number; f: Map<string, number>; title: boolean }[] = [];
  articles.forEach((a, articleIndex) => {
    phraseFeatures.push({ articleIndex, f: features(terms(a.title)), title: true });
    const phrasings = tuning.indexEvalQuestions ? [...a.questions, ...(a.evalQuestions ?? [])] : a.questions;
    for (const q of phrasings) phraseFeatures.push({ articleIndex, f: features(terms(q)), title: false });
    if (a.keywords?.length) phraseFeatures.push({ articleIndex, f: features(terms(a.keywords.join(" "))), title: false });
  });
  const df = new Map<string, number>();
  let docCount = phraseFeatures.length;
  if (tuning.articleIdf) {
    const seen = new Map<string, Set<number>>();
    for (const { articleIndex, f } of phraseFeatures)
      for (const k of f.keys()) {
        const set = seen.get(k) ?? new Set<number>();
        set.add(articleIndex);
        seen.set(k, set);
      }
    for (const [k, set] of seen) df.set(k, set.size);
    docCount = articles.length;
  } else {
    for (const { f } of phraseFeatures) for (const k of f.keys()) df.set(k, (df.get(k) ?? 0) + 1);
  }
  const idf = (k: string) => Math.log(1 + docCount / (df.get(k) ?? 0.5));

  const vectorize = (f: Map<string, number>): Vector => {
    const v: Vector = new Map();
    for (const [k, tf] of f) v.set(k, (1 + Math.log(Math.max(tf, 1))) * Math.min(tf, 1) * idf(k));
    return normalize(v);
  };

  const indexed: IndexedArticle[] = articles.map((article) => ({ article, phrases: [], centroid: new Map() }));
  for (const { articleIndex, f, title } of phraseFeatures) {
    const v = vectorize(f);
    const entry = indexed[articleIndex];
    entry.phrases.push(v);
    addInto(entry.centroid, v, title ? tuning.titleWeight : 1);
  }
  for (const entry of indexed) {
    const answerFeatures = features(terms(plainAnswer(entry.article.answer)));
    // Only words the phrasings already know: the answer body widens recall
    // without letting incidental words decide a match.
    if (!tuning.answerNewWords) for (const k of [...answerFeatures.keys()]) if (!df.has(k)) answerFeatures.delete(k);
    addInto(entry.centroid, vectorize(answerFeatures), tuning.answerWeight * Math.max(1, entry.phrases.length / 4));
    normalize(entry.centroid);
  }

  // Naive Bayes over single terms: each article is a class trained on its
  // phrasings. It rewards an article for every query word its phrasings use,
  // which complements the vector match on short or oddly worded questions.
  const bayesCounts = articles.map((a) => {
    const counts = new Map<string, number>();
    const add = (text: string, weight: number) => {
      for (const t of terms(text)) counts.set(t, (counts.get(t) ?? 0) + weight);
    };
    add(a.title, 2);
    for (const q of a.questions) add(q, 1);
    if (tuning.indexEvalQuestions) for (const q of a.evalQuestions ?? []) add(q, 1);
    if (a.keywords?.length) add(a.keywords.join(" "), 1);
    add(plainAnswer(a.answer), 0.3);
    return counts;
  });
  const bayesVocab = new Set<string>();
  for (const c of bayesCounts) for (const k of c.keys()) bayesVocab.add(k);
  const bayesDenominators = bayesCounts.map(
    (c) => [...c.values()].reduce((x, y) => x + y, 0) + tuning.bayesAlpha * bayesVocab.size,
  );

  function posterior(queryTerms: string[]): number[] {
    const known = queryTerms.filter((t) => bayesVocab.has(t));
    if (known.length === 0) return articles.map(() => 0);
    // A posterior always sums to one, so a single familiar word in an
    // off-topic question would look certain. Scale by how much of the
    // question the knowledge base actually recognises.
    const coverage = known.length / queryTerms.length;
    const logs = bayesCounts.map((c, i) =>
      known.reduce((sum, t) => sum + Math.log(((c.get(t) ?? 0) + tuning.bayesAlpha) / bayesDenominators[i]), 0),
    );
    const max = Math.max(...logs);
    const exps = logs.map((l) => Math.exp(l - max));
    const total = exps.reduce((x, y) => x + y, 0);
    return exps.map((e) => (e / total) * coverage);
  }

  // Vocabulary for spelling correction: single terms only, most frequent first.
  const vocabulary = [...df.entries()]
    .filter(([k]) => !k.includes("_"))
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
  const known = new Set(vocabulary);
  const corrections = new Map<string, string | null>();

  function correct(term: string): string | null {
    if (known.has(term)) return term;
    if (term.length < 5 || /\d/.test(term)) return null;
    const cached = corrections.get(term);
    if (cached !== undefined) return cached;
    const max = term.length >= 9 ? 2 : 1;
    let best: string | null = null;
    let bestDistance = max + 1;
    for (const word of vocabulary) {
      if (Math.abs(word.length - term.length) > max) continue;
      const d = editDistance(term, word, max);
      if (d < bestDistance) {
        best = word;
        bestDistance = d;
        if (d === 1) break; // vocabulary is ordered by frequency
      }
    }
    corrections.set(term, best);
    return best;
  }

  function queryTerms(question: string): string[] {
    return terms(question)
      .map(correct)
      .filter((t): t is string => t !== null);
  }

  function rank(question: string, options?: { contextArticleId?: string }): Ranked[] {
    const ts = queryTerms(question);
    const q = vectorize(features(ts));
    if (q.size === 0) return [];
    const bayes = posterior(ts);
    const contextCategory = options?.contextArticleId ? byId.get(options.contextArticleId)?.category : undefined;
    const ranked: Ranked[] = indexed.map(({ article, phrases, centroid }, i) => {
      let best = 0;
      for (const p of phrases) {
        const s = dot(q, p);
        if (s > best) best = s;
      }
      let score =
        tuning.phraseWeight * best + (1 - tuning.phraseWeight) * dot(q, centroid) + tuning.bayesWeight * bayes[i];
      // A follow-up question most likely stays on the topic just discussed.
      if (contextCategory && article.category === contextCategory) score += 0.02;
      return { article, score };
    });
    return ranked.sort((a, b) => b.score - a.score);
  }

  /** Share of the question's words the knowledge base knows, before spelling fixes. */
  function familiarity(question: string): number {
    const ts = terms(question);
    if (ts.length === 0) return 0;
    return ts.filter((t) => known.has(t)).length / ts.length;
  }

  function ask(question: string, options?: { contextArticleId?: string }): SupportReply {
    const ranked = rank(question, options);
    const top = ranked[0];
    // Mostly unfamiliar words means the question is about something else
    // ("who won the world cup"): say so rather than offer unrelated answers.
    const offTopic = familiarity(question) < 0.5 && (!top || top.score < thresholds.answer);
    if (!top || top.score < thresholds.suggest || offTopic) {
      const smallTalk = detectSmallTalk(question);
      if (smallTalk) return { kind: "smalltalk", intent: smallTalk };
      return { kind: "fallback", score: top?.score ?? 0 };
    }
    const smallTalk = detectSmallTalk(question);
    if (smallTalk && top.score < thresholds.sure) return { kind: "smalltalk", intent: smallTalk };

    const second = ranked[1];
    const lead = second ? top.score - second.score : top.score;
    if ((top.score >= thresholds.sure && lead >= thresholds.margin / 2) || (top.score >= thresholds.answer && lead >= thresholds.margin)) {
      // Close runners-up first: when the match is near, the right answer is
      // usually one of them, one tap away. Then the article's own links.
      const related: SupportArticle[] = [];
      for (const r of ranked.slice(1)) {
        if (related.length >= 2 || r.score < Math.max(thresholds.suggest, top.score * 0.7)) break;
        related.push(r.article);
      }
      for (const id of top.article.related ?? []) {
        const a = byId.get(id);
        if (a && a !== top.article && !related.includes(a) && related.length < MAX_RELATED) related.push(a);
      }
      return { kind: "answer", article: top.article, score: top.score, related };
    }
    const suggestions = ranked
      .filter((r) => r.score >= Math.max(thresholds.suggest, top.score * 0.6))
      .slice(0, MAX_SUGGESTIONS)
      .map((r) => r.article);
    return { kind: "suggest", suggestions, score: top.score };
  }

  return { ask, rank, get: (id) => byId.get(id), articles };
}
