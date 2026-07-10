-- Change notes (triage collaboration): short discussion thread attached to a
-- change event. Notes cascade with the change event and with the author.
-- Body length (1-2000 chars) is enforced at the API boundary, not in SQL.

-- CreateTable
CREATE TABLE "change_note" (
    "id" TEXT NOT NULL,
    "changeEventId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "change_note_changeEventId_idx" ON "change_note"("changeEventId");

-- AddForeignKey
ALTER TABLE "change_note" ADD CONSTRAINT "change_note_changeEventId_fkey" FOREIGN KEY ("changeEventId") REFERENCES "change_event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_note" ADD CONSTRAINT "change_note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
