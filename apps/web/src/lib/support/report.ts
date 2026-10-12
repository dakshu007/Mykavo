import { isMissingTableError, prisma } from "@mykavo/database";
import { SUPPORT_ARTICLES } from "@/config/support-kb";

/**
 * What people ask the support assistant, for the operator: how much it
 * answers, which questions it could not, and which answers were rated down.
 * The "needs an answer" list is the to-do list for the knowledge base.
 */

export interface SupportQuestionRow {
  id: string;
  question: string;
  kind: string;
  articleTitle: string | null;
  score: number;
  helpful: boolean | null;
  signedIn: boolean;
  createdAt: Date;
}

export interface SupportReport {
  ready: boolean;
  days: number;
  totals: { asked: number; answered: number; suggested: number; unanswered: number; helpful: number; notHelpful: number };
  needsAnswer: SupportQuestionRow[];
  topArticles: { id: string; title: string; count: number; helpful: number; notHelpful: number }[];
  recent: SupportQuestionRow[];
}

const DAYS = 30;
const titles = new Map(SUPPORT_ARTICLES.map((a) => [a.id, a.title]));

function toRow(r: {
  id: string;
  question: string;
  kind: string;
  articleId: string | null;
  score: number;
  helpful: boolean | null;
  userId: string | null;
  createdAt: Date;
}): SupportQuestionRow {
  return {
    id: r.id,
    question: r.question,
    kind: r.kind,
    articleTitle: r.articleId ? (titles.get(r.articleId) ?? r.articleId) : null,
    score: r.score,
    helpful: r.helpful,
    signedIn: Boolean(r.userId),
    createdAt: r.createdAt,
  };
}

const EMPTY: SupportReport = {
  ready: false,
  days: DAYS,
  totals: { asked: 0, answered: 0, suggested: 0, unanswered: 0, helpful: 0, notHelpful: 0 },
  needsAnswer: [],
  topArticles: [],
  recent: [],
};

export async function loadSupportReport(): Promise<SupportReport> {
  const since = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000);
  try {
    const [byKind, byHelpful, needsAnswer, topArticles, recent] = await Promise.all([
      prisma.supportQuestion.groupBy({ by: ["kind"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.supportQuestion.groupBy({
        by: ["helpful"],
        where: { createdAt: { gte: since }, helpful: { not: null } },
        _count: { _all: true },
      }),
      prisma.supportQuestion.findMany({
        where: { createdAt: { gte: since }, OR: [{ kind: { in: ["fallback", "suggest"] } }, { helpful: false }] },
        orderBy: { createdAt: "desc" },
        take: 60,
      }),
      prisma.supportQuestion.groupBy({
        by: ["articleId"],
        where: { createdAt: { gte: since }, articleId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { articleId: "desc" } },
        take: 12,
      }),
      prisma.supportQuestion.findMany({ where: { kind: { not: "smalltalk" } }, orderBy: { createdAt: "desc" }, take: 40 }),
    ]);

    const kindCount = (kinds: string[]) =>
      byKind.filter((k) => kinds.includes(k.kind)).reduce((sum, k) => sum + k._count._all, 0);
    const ratedIds = topArticles.map((t) => t.articleId).filter((id): id is string => Boolean(id));
    const ratings = ratedIds.length
      ? await prisma.supportQuestion.groupBy({
          by: ["articleId", "helpful"],
          where: { createdAt: { gte: since }, articleId: { in: ratedIds }, helpful: { not: null } },
          _count: { _all: true },
        })
      : [];
    const rating = (id: string, helpful: boolean) =>
      ratings.find((r) => r.articleId === id && r.helpful === helpful)?._count._all ?? 0;

    return {
      ready: true,
      days: DAYS,
      totals: {
        asked: kindCount(["answer", "suggest", "fallback", "pick"]),
        answered: kindCount(["answer", "pick"]),
        suggested: kindCount(["suggest"]),
        unanswered: kindCount(["fallback"]),
        helpful: byHelpful.find((h) => h.helpful === true)?._count._all ?? 0,
        notHelpful: byHelpful.find((h) => h.helpful === false)?._count._all ?? 0,
      },
      needsAnswer: needsAnswer.map(toRow),
      topArticles: ratedIds.map((id) => ({
        id,
        title: titles.get(id) ?? id,
        count: topArticles.find((t) => t.articleId === id)?._count._all ?? 0,
        helpful: rating(id, true),
        notHelpful: rating(id, false),
      })),
      recent: recent.map(toRow),
    };
  } catch (err) {
    if (isMissingTableError(err)) return EMPTY;
    throw err;
  }
}
