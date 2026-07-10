-- Website organization tags (agency labels: client, team, retainer…).
-- JSON array of lowercase display tags — max 5 per website, each 1–20
-- chars of [a-z0-9-]. Normalization and caps are enforced at the API
-- layer; readers parse defensively (see apps/web/src/lib/tags.ts).

-- AlterTable
ALTER TABLE "website" ADD COLUMN     "tags" JSONB;
