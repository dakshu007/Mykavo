-- CreateEnum
CREATE TYPE "NotificationChannelType" AS ENUM ('EMAIL', 'SLACK', 'WEBHOOK', 'DISCORD', 'MICROSOFT_TEAMS');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "notification_channel" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "NotificationChannelType" NOT NULL DEFAULT 'EMAIL',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configuration" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "websiteId" TEXT,
    "scanId" TEXT,
    "channelType" "NotificationChannelType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_channel_workspaceId_idx" ON "notification_channel"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_channel_workspaceId_type_key" ON "notification_channel"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "notification_workspaceId_createdAt_idx" ON "notification"("workspaceId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "notification_channel" ADD CONSTRAINT "notification_channel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
