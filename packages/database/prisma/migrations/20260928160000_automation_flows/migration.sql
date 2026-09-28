-- MyKavo Automation Tool: custom email flows, the accounts going through
-- them, and what happened at each step. Three new tables only, so nothing
-- else changes; until they exist the tool shows a notice and no flow runs.

-- CreateTable
CREATE TABLE "automation_flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "trigger" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdByEmail" TEXT,
    "updatedByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flow_run" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentStepId" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "stopReason" TEXT,

    CONSTRAINT "automation_flow_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_flow_event" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepId" TEXT,
    "kind" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_flow_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_flow_run_status_nextRunAt_idx" ON "automation_flow_run"("status", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "automation_flow_run_flowId_userId_key" ON "automation_flow_run"("flowId", "userId");

-- CreateIndex
CREATE INDEX "automation_flow_event_flowId_createdAt_idx" ON "automation_flow_event"("flowId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "automation_flow_event_flowId_stepId_kind_idx" ON "automation_flow_event"("flowId", "stepId", "kind");

-- AddForeignKey
ALTER TABLE "automation_flow_run" ADD CONSTRAINT "automation_flow_run_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "automation_flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flow_run" ADD CONSTRAINT "automation_flow_run_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_flow_event" ADD CONSTRAINT "automation_flow_event_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "automation_flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "automation_flow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_flow_run" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "automation_flow_event" ENABLE ROW LEVEL SECURITY;
