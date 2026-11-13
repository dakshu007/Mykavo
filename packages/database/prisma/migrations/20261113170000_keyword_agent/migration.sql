-- AI Keyword Agent tables (docs/keyword-agent.md). Additive only: new tables, one
-- nullable column on ai_usage. RLS on every new table, matching the rest.

ALTER TABLE "ai_usage" ADD COLUMN     "plan" TEXT;

CREATE TABLE "content_profile" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "businessType" TEXT NOT NULL,
    "services" TEXT[],
    "audience" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "pages" JSONB NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_job" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "step" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "resultId" TEXT,
    "error" TEXT,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "ai_job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_quota_use" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "aiJobId" TEXT NOT NULL,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_quota_use_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_step" (
    "id" TEXT NOT NULL,
    "aiJobId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicroUsd" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_step_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "autocomplete_cache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "suggestions" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "autocomplete_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "keyword_report" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "aiJobId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "keyword_report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "keyword_opportunity" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "cluster" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suggestedTitle" TEXT NOT NULL,
    "competition" TEXT NOT NULL,
    "popularity" INTEGER NOT NULL,
    "position" DOUBLE PRECISION,
    "impressions" INTEGER,

    CONSTRAINT "keyword_opportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "content_post" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "faq" JSONB NOT NULL,
    "jsonLd" JSONB NOT NULL,
    "reviewNotes" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "regenerationsUsed" INTEGER NOT NULL DEFAULT 0,
    "aiJobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_post_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_profile_websiteId_key" ON "content_profile"("websiteId");

CREATE INDEX "ai_job_websiteId_kind_createdAt_idx" ON "ai_job"("websiteId", "kind", "createdAt");

CREATE INDEX "ai_job_workspaceId_createdAt_idx" ON "ai_job"("workspaceId", "createdAt");

CREATE UNIQUE INDEX "ai_quota_use_aiJobId_key" ON "ai_quota_use"("aiJobId");

CREATE INDEX "ai_quota_use_workspaceId_kind_createdAt_idx" ON "ai_quota_use"("workspaceId", "kind", "createdAt");

CREATE INDEX "agent_step_aiJobId_idx" ON "agent_step"("aiJobId");

CREATE INDEX "agent_step_createdAt_idx" ON "agent_step"("createdAt");

CREATE INDEX "autocomplete_cache_fetchedAt_idx" ON "autocomplete_cache"("fetchedAt");

CREATE UNIQUE INDEX "autocomplete_cache_query_country_language_key" ON "autocomplete_cache"("query", "country", "language");

CREATE UNIQUE INDEX "keyword_report_aiJobId_key" ON "keyword_report"("aiJobId");

CREATE INDEX "keyword_report_websiteId_createdAt_idx" ON "keyword_report"("websiteId", "createdAt");

CREATE INDEX "keyword_report_expiresAt_idx" ON "keyword_report"("expiresAt");

CREATE INDEX "keyword_opportunity_reportId_rank_idx" ON "keyword_opportunity"("reportId", "rank");

CREATE INDEX "content_post_websiteId_createdAt_idx" ON "content_post"("websiteId", "createdAt");

ALTER TABLE "content_profile" ADD CONSTRAINT "content_profile_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_job" ADD CONSTRAINT "ai_job_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_step" ADD CONSTRAINT "agent_step_aiJobId_fkey" FOREIGN KEY ("aiJobId") REFERENCES "ai_job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "keyword_report" ADD CONSTRAINT "keyword_report_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "keyword_opportunity" ADD CONSTRAINT "keyword_opportunity_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "keyword_report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "content_post" ADD CONSTRAINT "content_post_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "content_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_quota_use" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent_step" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "autocomplete_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "keyword_report" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "keyword_opportunity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_post" ENABLE ROW LEVEL SECURITY;
