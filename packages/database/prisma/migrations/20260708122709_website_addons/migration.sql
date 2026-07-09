-- AlterTable
ALTER TABLE "checkout_intent" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'pro';

-- CreateTable
CREATE TABLE "website_addon" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dodoSubscriptionId" TEXT NOT NULL,
    "dodoCustomerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "websitesGranted" INTEGER NOT NULL DEFAULT 30,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "lastEventAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "website_addon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_addon_dodoSubscriptionId_key" ON "website_addon"("dodoSubscriptionId");

-- CreateIndex
CREATE INDEX "website_addon_workspaceId_idx" ON "website_addon"("workspaceId");

-- CreateIndex
CREATE INDEX "website_addon_dodoCustomerId_idx" ON "website_addon"("dodoCustomerId");

-- AddForeignKey
ALTER TABLE "website_addon" ADD CONSTRAINT "website_addon_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
