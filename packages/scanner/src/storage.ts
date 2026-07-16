/**
 * Artifact storage behind an interface (spec §8: screenshots never live in
 * PostgreSQL). Two backends:
 *
 * - LocalDiskStorage — development default (ARTIFACT_DIR).
 * - NetlifyBlobsStorage — production (zero-budget: included in Netlify's
 *   plan). The Netlify-hosted web app reads blobs via the ambient function
 *   context; the worker (which runs outside Netlify) authenticates with a
 *   site ID + personal access token.
 *
 * Select with ARTIFACT_STORE=netlify-blobs; anything else means local disk.
 */

import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";

export interface ArtifactStorage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export class LocalDiskStorage implements ArtifactStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    const safe = normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    if (safe.includes("..")) throw new Error(`Unsafe artifact key: ${key}`);
    return join(this.rootDir, safe);
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.resolve(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}

/** Blob store name shared by the worker (writer) and web app (reader). */
// Deliberately keeps the pre-rename name: every production screenshot/diff
// already lives in this Netlify Blobs store — renaming it would orphan them.
const BLOB_STORE_NAME = "fluxen-artifacts";

// Minimal structural type for the store — @netlify/blobs is ESM-only and
// loaded via dynamic import() (same pattern as lighthouse.ts), so its types
// aren't imported statically.
interface BlobStore {
  set(key: string, data: Blob): Promise<unknown>;
  get(key: string, opts: { type: "arrayBuffer" }): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
}

export class NetlifyBlobsStorage implements ArtifactStorage {
  private storePromise: Promise<BlobStore> | null = null;

  constructor(
    private readonly credentials?: { siteID: string; token: string },
  ) {}

  private store(): Promise<BlobStore> {
    this.storePromise ??= import("@netlify/blobs").then(({ getStore }) =>
      this.credentials
        ? (getStore({ name: BLOB_STORE_NAME, ...this.credentials }) as BlobStore)
        : // Inside Netlify functions the site context is ambient.
          (getStore(BLOB_STORE_NAME) as BlobStore),
    );
    return this.storePromise;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const store = await this.store();
    await store.set(key, new Blob([new Uint8Array(data)], { type: contentType }));
  }

  async get(key: string): Promise<Buffer | null> {
    const store = await this.store();
    const buf = await store.get(key, { type: "arrayBuffer" });
    return buf ? Buffer.from(buf) : null;
  }

  async delete(key: string): Promise<void> {
    const store = await this.store();
    await store.delete(key);
  }
}

export function getDefaultStorage(): ArtifactStorage {
  if (process.env.ARTIFACT_STORE === "netlify-blobs") {
    const siteID = process.env.NETLIFY_BLOBS_SITE_ID ?? process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_BLOBS_TOKEN ?? process.env.NETLIFY_AUTH_TOKEN;
    // With explicit credentials (the worker, outside Netlify) authenticate
    // manually; without them rely on the ambient Netlify function context.
    return new NetlifyBlobsStorage(
      siteID && token ? { siteID, token } : undefined,
    );
  }
  const root = process.env.ARTIFACT_DIR ?? join(process.cwd(), ".data", "artifacts");
  return new LocalDiskStorage(root);
}
