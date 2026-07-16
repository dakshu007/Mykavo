/**
 * One-off migration: move profile photos out of Postgres and into object
 * storage. Finds every user whose `image` is an inline data URL, uploads the
 * decoded bytes under `avatars/<random>.jpg|png`, and rewrites the row to the
 * small `/api/avatars/<name>` path. Idempotent — already-migrated rows (URL
 * paths) are skipped.
 *
 * Usage:
 *   DATABASE_URL=… ARTIFACT_STORE=r2 R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… \
 *   R2_SECRET_ACCESS_KEY=… pnpm --dir apps/worker exec tsx src/scripts/migrate-avatars-r2.ts
 */

import { randomBytes } from "node:crypto";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";

const DATA_URL_PATTERN = /^data:image\/(jpeg|png);base64,(.+)$/;

async function main() {
  const storage = getDefaultStorage();
  const users = await prisma.user.findMany({
    where: { image: { startsWith: "data:" } },
    select: { id: true, image: true },
  });
  console.log(`found ${users.length} inline avatars to migrate`);

  let migrated = 0;
  for (const user of users) {
    const match = user.image?.match(DATA_URL_PATTERN);
    if (!match) {
      console.warn(`skip ${user.id}: unrecognized data URL shape`);
      continue;
    }
    const extension = match[1] === "png" ? "png" : "jpg";
    const name = `${randomBytes(16).toString("hex")}.${extension}`;
    await storage.put(
      `avatars/${name}`,
      Buffer.from(match[2], "base64"),
      match[1] === "png" ? "image/png" : "image/jpeg",
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { image: `/api/avatars/${name}` },
    });
    migrated += 1;
    console.log(`migrated ${user.id} → avatars/${name}`);
  }
  console.log(`done — migrated ${migrated}/${users.length}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
