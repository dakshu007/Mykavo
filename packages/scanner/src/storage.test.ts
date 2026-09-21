import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LocalDiskStorage,
  R2Storage,
  parseListObjectsPage,
  type ArtifactStorage,
} from "./storage";

/**
 * aws4fetch is ESM-only and loaded through a dynamic import inside
 * R2Storage.client(), so the mock is hoisted and the captured request is
 * carried out through vi.hoisted rather than a closure.
 */
const aws = vi.hoisted(() => ({
  captured: null as { url: string; init: RequestInit | undefined } | null,
}));

vi.mock("aws4fetch", () => ({
  AwsClient: class {
    async fetch(url: string, init?: RequestInit) {
      aws.captured = { url, init };
      return new Response(null, { status: 200 });
    }
  },
}));

let dir: string;
// Typed as the interface: production only ever touches these through
// ArtifactStorage, and put() carries a contentType there.
let storage: ArtifactStorage;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "mykavo-storage-"));
  storage = new LocalDiskStorage(dir);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("LocalDiskStorage.exists", () => {
  // exists() is what makes content-addressed screenshots worth anything: it
  // is the check that turns 365 uploads of an unchanged page into one.
  it("is false before a write and true after", async () => {
    const key = "ws/w1/shot/abc.jpg";
    expect(await storage.exists(key)).toBe(false);
    await storage.put(key, Buffer.from("bytes"), "image/jpeg");
    expect(await storage.exists(key)).toBe(true);
  });

  it("is false again once deleted", async () => {
    const key = "ws/w1/shot/abc.jpg";
    await storage.put(key, Buffer.from("bytes"), "image/jpeg");
    await storage.delete(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it("does not throw on a key that was never written", async () => {
    await expect(storage.exists("nothing/here.jpg")).resolves.toBe(false);
  });

  it("refuses to escape the storage root", async () => {
    await expect(storage.exists("../../etc/passwd")).resolves.toBe(false);
  });
});

describe("LocalDiskStorage round trip", () => {
  it("returns exactly the bytes written", async () => {
    const data = Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]);
    await storage.put("a/b/c.jpg", data, "image/jpeg");
    expect(await storage.get("a/b/c.jpg")).toEqual(data);
  });

  it("returns null rather than throwing for a missing key", async () => {
    expect(await storage.get("missing.jpg")).toBeNull();
  });

  // Two scans of an unchanged page write the same key with the same bytes;
  // the second write must be harmless.
  it("is idempotent when the same key is written twice", async () => {
    const data = Buffer.from("same");
    await storage.put("ws/w1/shot/h.jpg", data, "image/jpeg");
    await storage.put("ws/w1/shot/h.jpg", data, "image/jpeg");
    expect(await storage.get("ws/w1/shot/h.jpg")).toEqual(data);
  });
});

describe("parseListObjectsPage", () => {
  const page = (body: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult>${body}</ListBucketResult>`;

  it("sums object sizes and counts them", () => {
    const xml = page(`
      <Contents><Key>a/1.webp</Key><Size>1024</Size></Contents>
      <Contents><Key>a/2.webp</Key><Size>2048</Size></Contents>
      <IsTruncated>false</IsTruncated>
    `);
    expect(parseListObjectsPage(xml)).toEqual({
      bytes: 3072,
      objects: 2,
      more: false,
      nextToken: null,
    });
  });

  it("reports an empty bucket as zero rather than failing", () => {
    expect(parseListObjectsPage(page("<IsTruncated>false</IsTruncated>"))).toEqual({
      bytes: 0,
      objects: 0,
      more: false,
      nextToken: null,
    });
  });

  it("surfaces truncation and the continuation token", () => {
    const xml = page(`
      <Contents><Key>a</Key><Size>10</Size></Contents>
      <IsTruncated>true</IsTruncated>
      <NextContinuationToken>1ueGcx/LEcQ==</NextContinuationToken>
    `);
    const result = parseListObjectsPage(xml);
    expect(result.more).toBe(true);
    expect(result.nextToken).toBe("1ueGcx/LEcQ==");
  });

  it("treats a truncated page with an empty token as having none", () => {
    // Guards the caller's loop: a token of "" would be sent as a
    // continuation and the walk would repeat page one forever.
    const xml = page(`
      <IsTruncated>true</IsTruncated>
      <NextContinuationToken></NextContinuationToken>
    `);
    expect(parseListObjectsPage(xml).nextToken).toBeNull();
    expect(parseListObjectsPage(xml).more).toBe(true);
  });

  it("documents the one thing a regex parse cannot do", () => {
    // A <Size> embedded in a Key is indistinguishable from a real one to a
    // regex, so it would be counted. This is recorded rather than fixed
    // because it is unreachable: every key this bucket holds is built from
    // cuids and fixed path segments (`ws/{workspaceId}/shot/...`, see
    // packages/shared/src/artifact-keys.ts). No scanned URL, page title, or
    // any other user-supplied text ever becomes part of an object key, and
    // nothing but MyKavo writes to the bucket.
    //
    // If that ever changes - a key derived from a URL, or a shared bucket -
    // this test is the note saying to swap in a real XML parser first.
    const xml = page(`
      <Contents><Key>evil<Size>999999</Size>.webp</Key><Size>50</Size></Contents>
      <IsTruncated>false</IsTruncated>
    `);
    const result = parseListObjectsPage(xml);
    expect(result.objects).toBe(2);
    expect(result.bytes).toBe(1_000_049);
  });
});

/**
 * R2 uploads from the web app failed with `411 MissingContentLength` while
 * the identical code path in the worker succeeded. A Uint8Array body normally
 * lets the runtime set Content-Length, and plain Node does - but Next.js
 * patches global fetch, and under that patch the body went out chunked with
 * no length at all. R2 refuses those.
 *
 * The header is set explicitly now, so the request no longer depends on which
 * fetch implementation happens to be installed.
 */
describe("R2Storage.put", () => {
  beforeEach(() => {
    aws.captured = null;
  });

  async function putBytes(bytes: Buffer) {
    const r2 = new R2Storage({
      accountId: "acct",
      accessKeyId: "key",
      secretAccessKey: "secret",
      bucket: "mykavo",
    });
    await r2.put("blog-images/abc.jpg", bytes, "image/jpeg");
    return aws.captured;
  }

  it("sends Content-Length matching the body", async () => {
    const result = await putBytes(Buffer.from("x".repeat(4096)));
    const headers = result?.init?.headers as Record<string, string>;
    expect(headers["content-length"]).toBe("4096");
    expect(headers["content-type"]).toBe("image/jpeg");
  });

  it("sends Content-Length for an empty body rather than omitting it", () => {
    // "0" is a valid length and what R2 expects; omitting the header is the
    // failure, not the value being zero.
    return putBytes(Buffer.alloc(0)).then((result) => {
      const headers = result?.init?.headers as Record<string, string>;
      expect(headers["content-length"]).toBe("0");
    });
  });

  it("puts to the bucket path for the key", async () => {
    const result = await putBytes(Buffer.from("bytes"));
    expect(result?.url).toBe(
      "https://acct.r2.cloudflarestorage.com/mykavo/blog-images/abc.jpg",
    );
    expect(result?.init?.method).toBe("PUT");
  });
});
