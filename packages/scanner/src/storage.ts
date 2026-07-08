/**
 * Artifact storage behind an interface (spec §8: screenshots never live in
 * PostgreSQL). Local disk in development; the same interface maps 1:1 onto
 * Cloudflare R2 / S3 when hosting arrives (zero-budget: R2 free tier).
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

export function getDefaultStorage(): ArtifactStorage {
  const root = process.env.ARTIFACT_DIR ?? join(process.cwd(), ".data", "artifacts");
  return new LocalDiskStorage(root);
}
