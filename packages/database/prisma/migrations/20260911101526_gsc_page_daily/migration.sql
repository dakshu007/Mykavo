-- CreateTable
CREATE TABLE "gsc_page_daily" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL,
    "impressions" INTEGER NOT NULL,
    "ctr" DOUBLE PRECISION NOT NULL,
    "position" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "gsc_page_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gsc_page_daily_websiteId_page_date_idx" ON "gsc_page_daily"("websiteId", "page", "date");

-- CreateIndex
CREATE UNIQUE INDEX "gsc_page_daily_websiteId_date_page_key" ON "gsc_page_daily"("websiteId", "date", "page");

-- AddForeignKey
ALTER TABLE "gsc_page_daily" ADD CONSTRAINT "gsc_page_daily_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
