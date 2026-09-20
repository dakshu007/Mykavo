-- Object-storage keys whose owning rows are already gone (website/workspace
-- deletes). Drained by the worker; see the model comment in schema.prisma.
CREATE TABLE "pending_artifact_deletion" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pending_artifact_deletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_artifact_deletion_storageKey_key" ON "pending_artifact_deletion"("storageKey");
CREATE INDEX "pending_artifact_deletion_createdAt_idx" ON "pending_artifact_deletion"("createdAt");
