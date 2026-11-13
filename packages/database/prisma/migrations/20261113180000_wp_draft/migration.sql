-- "Save as a draft in WordPress" for AI Keywords posts. One row per post:
-- MyKavo queues it, the MyKavo WordPress plugin collects it and creates (or
-- updates) a draft post in WP Admin, then reports back the post id.

CREATE TABLE "wp_draft" (
    "id" TEXT NOT NULL,
    "contentPostId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "postVersion" INTEGER NOT NULL,
    "wpPostId" INTEGER,
    "editUrl" TEXT,
    "error" TEXT,
    "requestedByUserId" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wp_draft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "wp_draft_contentPostId_key" ON "wp_draft"("contentPostId");

CREATE INDEX "wp_draft_websiteId_status_idx" ON "wp_draft"("websiteId", "status");

ALTER TABLE "wp_draft" ADD CONSTRAINT "wp_draft_contentPostId_fkey" FOREIGN KEY ("contentPostId") REFERENCES "content_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wp_draft" ADD CONSTRAINT "wp_draft_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "wp_draft" ENABLE ROW LEVEL SECURITY;
