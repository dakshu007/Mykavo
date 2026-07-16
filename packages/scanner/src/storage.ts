/**
 * Artifact storage behind an interface (spec §8: screenshots never live in
 * PostgreSQL). Three backends:
 *
 * - LocalDiskStorage — development default (ARTIFACT_DIR).
 * - R2Storage — production (Cloudflare R2 free tier, S3-compatible API via
 *   aws4fetch SigV4 signing; zero egress fees). Both the worker and the
 *   Netlify-hosted web app authenticate with the same scoped API token.
 * - NetlifyBlobsStorage — legacy production backend (kept for the migration
 *   window and as a fallback).
 *
 * Select with ARTIFACT_STORE=r2 or ARTIFACT_STORE=netlify-blobs; anything
 * else means local disk.
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

/**
 * Cloudflare R2 via its S3-compatible endpoint. Keys are used verbatim as
 * object keys; the bucket stays PRIVATE — every read goes through an
 * authorized application route, never a public bucket URL.
 */
export class R2Storage implements ArtifactStorage {
  private clientPromise: Promise<{
    fetch: (input: string, init?: RequestInit) => Promise<Response>;
  }> | null = null;

  constructor(
    private readonly config: {
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
    },
  ) {}

  private client() {
    // aws4fetch is ESM-only — dynamic import, same pattern as @netlify/blobs.
    this.clientPromise ??= import("aws4fetch").then(
      ({ AwsClient }) =>
        new AwsClient({
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
          service: "s3",
          region: "auto",
        }),
    );
    return this.clientPromise;
  }

  private url(key: string): string {
    const encoded = key.split("/").map(encodeURIComponent).join("/");
    return `https://${this.config.accountId}.r2.cloudflarestorage.com/${this.config.bucket}/${encoded}`;
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    const client = await this.client();
    const res = await client.fetch(this.url(key), {
      method: "PUT",
      headers: { "content-type": contentType },
      body: new Uint8Array(data),
    });
    if (!res.ok) {
      throw new Error(`R2 put failed for ${key}: ${res.status} ${await res.text()}`);
    }
  }

  async get(key: string): Promise<Buffer | null> {
    const client = await this.client();
    const res = await client.fetch(this.url(key), { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`R2 get failed for ${key}: ${res.status} ${await res.text()}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const client = await this.client();
    const res = await client.fetch(this.url(key), { method: "DELETE" });
    // 404 is fine — delete is idempotent.
    if (!res.ok && res.status !== 404) {
      throw new Error(`R2 delete failed for ${key}: ${res.status} ${await res.text()}`);
    }
  }
}

/** Read R2 config from env; throws if selected but incompletely configured. */
function r2StorageFromEnv(): R2Storage {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET ?? "mykavo";
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "ARTIFACT_STORE=r2 requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY",
    );
  }
  return new R2Storage({ accountId, accessKeyId, secretAccessKey, bucket });
}

export function getDefaultStorage(): ArtifactStorage {
  if (process.env.ARTIFACT_STORE === "r2") {
    return r2StorageFromEnv();
  }
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
