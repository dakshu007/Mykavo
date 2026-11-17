-- Brand videos (docs/BRAND_VIDEO.md). Additive only: two new tables. Jobs and
-- quota reuse ai_job and ai_quota_use (kinds "brand", "video-script",
-- "video-render" and quota kind "video"). RLS on both, matching the rest.

CREATE TABLE IF NOT EXISTS "brand_kit" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT,
    "description" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "valuePoints" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "services" TEXT[],
    "colors" JSONB NOT NULL,
    "palette" TEXT[],
    "headingFont" TEXT,
    "bodyFont" TEXT,
    "logoKey" TEXT,
    "logoWidth" INTEGER,
    "logoHeight" INTEGER,
    "logoBackground" TEXT,
    "heroKey" TEXT,
    "pageKey" TEXT,
    "pageHeight" INTEGER,
    "sourceUrl" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "brand_video" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'landscape',
    "storyboard" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "scriptJobId" TEXT,
    "regenerationsUsed" INTEGER NOT NULL DEFAULT 0,
    "renderStatus" TEXT NOT NULL DEFAULT 'none',
    "renderJobId" TEXT,
    "renderProgress" INTEGER NOT NULL DEFAULT 0,
    "renderError" TEXT,
    "renderedVersion" INTEGER,
    "renderedFormat" TEXT,
    "renderWidth" INTEGER,
    "renderHeight" INTEGER,
    "watermark" BOOLEAN NOT NULL DEFAULT true,
    "videoKey" TEXT,
    "posterKey" TEXT,
    "videoBytes" INTEGER,
    "rendersUsed" INTEGER NOT NULL DEFAULT 0,
    "renderedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_video_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brand_kit_websiteId_key" ON "brand_kit"("websiteId");
CREATE INDEX IF NOT EXISTS "brand_kit_workspaceId_idx" ON "brand_kit"("workspaceId");
CREATE INDEX IF NOT EXISTS "brand_video_websiteId_createdAt_idx" ON "brand_video"("websiteId", "createdAt");
CREATE INDEX IF NOT EXISTS "brand_video_workspaceId_createdAt_idx" ON "brand_video"("workspaceId", "createdAt");

ALTER TABLE "brand_kit" ADD CONSTRAINT "brand_kit_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "brand_video" ADD CONSTRAINT "brand_video_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_kit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_video" ENABLE ROW LEVEL SECURITY;
