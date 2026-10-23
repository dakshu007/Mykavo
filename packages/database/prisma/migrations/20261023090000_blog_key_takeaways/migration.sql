-- Key takeaways for the blog AI Overview box. Additive and idempotent.
ALTER TABLE "blog_post" ADD COLUMN IF NOT EXISTS "keyTakeaways" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
