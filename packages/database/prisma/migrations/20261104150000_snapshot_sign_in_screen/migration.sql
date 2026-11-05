-- Snapshots that captured a sign-in screen instead of the page's content.
ALTER TABLE "page_snapshot" ADD COLUMN IF NOT EXISTS "signInScreen" BOOLEAN;
