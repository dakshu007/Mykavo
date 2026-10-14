-- "Your trial has started" email for trials granted to existing accounts.
ALTER TABLE "workspace_trial" ADD COLUMN "startedEmailAt" TIMESTAMP(3);
