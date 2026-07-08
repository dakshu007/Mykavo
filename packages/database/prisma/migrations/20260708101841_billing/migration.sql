-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "planId" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'active',
    "provider" TEXT NOT NULL DEFAULT 'dodo',
    "dodoCustomerId" TEXT,
    "dodoSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_webhook_event" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_workspaceId_key" ON "subscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_dodoSubscriptionId_key" ON "subscription"("dodoSubscriptionId");

-- CreateIndex
CREATE INDEX "subscription_dodoCustomerId_idx" ON "subscription"("dodoCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "processed_webhook_event_eventId_key" ON "processed_webhook_event"("eventId");

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
