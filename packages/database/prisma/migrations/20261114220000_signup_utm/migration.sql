-- UTM tags of the campaign that brought a new account (the last tagged
-- visit before signing up). Nullable: most signups arrive untagged.
ALTER TABLE "signup_attribution" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "signup_attribution" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "signup_attribution" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "signup_attribution" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "signup_attribution" ADD COLUMN "utmTerm" TEXT;
