-- A job cut off by a worker restart is re-queued once; this counts that.
ALTER TABLE "ai_job" ADD COLUMN "restarts" INTEGER NOT NULL DEFAULT 0;
