-- CreateIndex
CREATE INDEX "change_event_websiteId_detectedAt_idx" ON "change_event"("websiteId", "detectedAt");

-- CreateIndex
CREATE INDEX "page_snapshot_websiteId_createdAt_idx" ON "page_snapshot"("websiteId", "createdAt");
