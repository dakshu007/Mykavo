/**
 * One-off migration: copy every artifact from the legacy Netlify Blobs store
 * (`fluxen-artifacts`) into Cloudflare R2. Idempotent - objects already in R2
 * with the same key are overwritten with identical content, so it's safe to
 * re-run to catch stragglers written during the cutover window.
 *
 * Usage:
 *   NETLIFY_BLOBS_SITE_ID=… NETLIFY_BLOBS_TOKEN=… \
 *   ARTIFACT_STORE=r2 R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
 *   pnpm --dir apps/worker exec tsx src/scripts/migrate-artifacts-r2.ts
 */

import { NetlifyBlobsStorage, getDefaultStorage } from "@mykavo/scanner/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  json: "application/json",
  txt: "text/plain",
};

function contentTypeFor(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

interface ListResult {
  blobs: Array<{ key: string }>;
}

async function main() {
  const siteID = process.env.NETLIFY_BLOBS_SITE_ID ?? process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN ?? process.env.NETLIFY_AUTH_TOKEN;
  if (!siteID || !token) throw new Error("Netlify Blobs credentials missing");
  if (process.env.ARTIFACT_STORE !== "r2") throw new Error("Set ARTIFACT_STORE=r2 (destination)");

  const source = new NetlifyBlobsStorage({ siteID, token });
  const dest = getDefaultStorage();

  // List all keys in the legacy store (paginated).
  const { getStore } = await import("@netlify/blobs");
  const store = getStore({ name: "fluxen-artifacts", siteID, token });
  const keys: string[] = [];
  for await (const page of store.list({ paginate: true }) as AsyncIterable<ListResult>) {
    for (const blob of page.blobs) keys.push(blob.key);
  }
  console.log(`found ${keys.length} objects in fluxen-artifacts`);

  let copied = 0;
  let failed = 0;
  const concurrency = 8;
  const queue = [...keys];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (;;) {
        const key = queue.shift();
        if (!key) return;
        try {
          const data = await source.get(key);
          if (!data) {
            console.warn(`skip (missing): ${key}`);
            continue;
          }
          await dest.put(key, data, contentTypeFor(key));
          copied += 1;
          if (copied % 25 === 0) console.log(`copied ${copied}/${keys.length}`);
        } catch (err) {
          failed += 1;
          console.error(`FAILED ${key}:`, err instanceof Error ? err.message : err);
        }
      }
    }),
  );
  console.log(`done - copied ${copied}, failed ${failed}, total ${keys.length}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
