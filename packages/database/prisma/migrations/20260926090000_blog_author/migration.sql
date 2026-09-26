-- Blog authors: public profiles shown on posts and on /blog/author/<slug>.
-- Posts refer to an author by name (blog_post."authorName"), so blog_post is
-- untouched and the site keeps working before this is applied.

CREATE TABLE "blog_author" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "bio" TEXT,
    "imageUrl" TEXT,
    "linkedinUrl" TEXT,
    "xUrl" TEXT,
    "githubUrl" TEXT,
    "websiteUrl" TEXT,
    "highlights" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_author_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blog_author_slug_key" ON "blog_author"("slug");
CREATE UNIQUE INDEX "blog_author_name_key" ON "blog_author"("name");

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "blog_author" ENABLE ROW LEVEL SECURITY;
