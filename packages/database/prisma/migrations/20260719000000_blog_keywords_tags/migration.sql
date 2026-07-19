-- Blog SEO focus keywords + tags. Editable publish date needs no DDL.
ALTER TABLE "blog_post" ADD COLUMN "primaryKeyword" TEXT;
ALTER TABLE "blog_post" ADD COLUMN "secondaryKeyword" TEXT;
ALTER TABLE "blog_post" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
