-- Operator switches (the AI kill switch first). Additive only: one new table.
CREATE TABLE IF NOT EXISTS "app_setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "app_setting_pkey" PRIMARY KEY ("key")
);
