-- Read-along for blog narration: word start times per narrated block.
ALTER TABLE "blog_audio" ADD COLUMN "timeline" JSONB;
ALTER TABLE "blog_audio" ADD COLUMN "timelineVersion" INTEGER NOT NULL DEFAULT 0;
