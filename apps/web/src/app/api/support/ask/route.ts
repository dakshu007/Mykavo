import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getSession } from "@/lib/session";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { supportEngine } from "@/lib/support/kb";
import { pickMessage, toMessage, type AssistantMessage } from "@/lib/support/respond";

/**
 * The support assistant on /support. Answers from the knowledge base with the
 * deterministic matcher (no model calls, nothing billed per question) and
 * records the question so unanswered ones can be added to the library.
 */

const bodySchema = z.union([
  z.object({
    question: z.string().trim().min(1).max(500),
    contextArticleId: z.string().max(80).optional(),
  }),
  z.object({ articleId: z.string().min(1).max(80) }),
]);

export async function POST(request: Request) {
  const limit = rateLimit(`support-ask:${clientKey(request)}`, { limit: 40, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You're asking faster than I can read. Give it a few seconds and try again." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Type a question to get an answer." }, { status: 400 });
  }

  let message: AssistantMessage | null;
  let question: string;
  let contextArticleId: string | null = null;
  if ("articleId" in input) {
    message = pickMessage(supportEngine, input.articleId);
    if (!message) return NextResponse.json({ error: "That answer no longer exists." }, { status: 404 });
    question = message.article?.title ?? input.articleId;
  } else {
    question = input.question;
    contextArticleId = input.contextArticleId && supportEngine.get(input.contextArticleId) ? input.contextArticleId : null;
    message = toMessage(supportEngine.ask(question, { contextArticleId: contextArticleId ?? undefined }));
  }

  const id = await record(question, message, contextArticleId);
  return NextResponse.json({ id, message });
}

/** Best effort: the answer matters more than the log, so failures are swallowed. */
async function record(question: string, message: AssistantMessage, contextArticleId: string | null): Promise<string | null> {
  try {
    const session = await getSession().catch(() => null);
    const row = await prisma.supportQuestion.create({
      data: {
        question: question.slice(0, 500),
        kind: message.kind,
        articleId: message.article?.id ?? null,
        score: Math.round(message.score * 1000) / 1000,
        contextArticleId,
        userId: session?.user.id ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    console.error("[support] could not record question", err instanceof Error ? err.message : err);
    return null;
  }
}
