-- Hourly counter readings for the admin usage page (database egress).
CREATE TABLE IF NOT EXISTS "usage_sample" (
    "id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sampledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "usage_sample_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "usage_sample_metric_sampledAt_idx" ON "usage_sample"("metric", "sampledAt");

-- Not exposed through the Supabase Data API.
ALTER TABLE "usage_sample" ENABLE ROW LEVEL SECURITY;
