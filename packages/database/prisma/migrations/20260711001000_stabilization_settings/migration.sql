-- Stabilization / false-positive controls (spec §25, §36).
-- Both columns hold JSON arrays of CSS selector strings (max 20 per list,
-- each selector ≤200 chars — enforced at the API layer, parsed defensively
-- everywhere else).
--   ignoredSelectors: matching elements are REMOVED from the DOM before
--     text/DOM hashing and never appear in the screenshot — excluded from
--     comparison entirely (cookie banners, ads, rotating content).
--   screenshotMasks: matching elements are covered with a solid block in
--     the screenshot only — their content is still compared (dates, counters).

-- AlterTable
ALTER TABLE "website" ADD COLUMN     "ignoredSelectors" JSONB,
ADD COLUMN     "screenshotMasks" JSONB;
