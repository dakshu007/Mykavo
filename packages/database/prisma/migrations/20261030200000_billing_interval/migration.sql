-- Yearly billing: which Dodo product (monthly or yearly) a subscription is on.
-- Additive with a default, so existing rows read as monthly.
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT NOT NULL DEFAULT 'month';
