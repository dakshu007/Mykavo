import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalDiskStorage, type ArtifactStorage } from "./storage";

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
