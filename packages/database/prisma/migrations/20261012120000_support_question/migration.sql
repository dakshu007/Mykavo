-- Questions asked of the support assistant on /support, so the operator can
-- see what people ask and which questions have no answer yet.
--
-- Additive and idempotent: safe to run more than once.

CREATE TABLE IF NOT EXISTS "support_question" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "articleId" TEXT,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contextArticleId" TEXT,
    "helpful" BOOLEAN,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_question_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "support_question_createdAt_idx"
    ON "support_question"("createdAt" DESC);

CREATE INDEX IF NOT EXISTS "support_question_kind_createdAt_idx"
    ON "support_question"("kind", "createdAt" DESC);

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "support_question" ENABLE ROW LEVEL SECURITY;
