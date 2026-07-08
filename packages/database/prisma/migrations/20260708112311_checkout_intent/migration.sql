-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "lastEventAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "checkout_intent" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_intent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_intent_token_key" ON "checkout_intent"("token");

-- CreateIndex
CREATE INDEX "checkout_intent_workspaceId_idx" ON "checkout_intent"("workspaceId");

-- AddForeignKey
ALTER TABLE "checkout_intent" ADD CONSTRAINT "checkout_intent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
