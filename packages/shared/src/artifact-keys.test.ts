import { describe, expect, it } from "vitest";
import { screenshotPrefix, diffKey, isContentAddressedScreenshotKey } from "./artifact-keys";

const HASH = "a".repeat(64);

describe("screenshotPrefix", () => {
  it("scopes screenshots to the workspace", () => {
    expect(screenshotPrefix("ws_123")).toBe("ws/ws_123/shot");
  });

  // The whole storage saving rests on this: the same bytes must produce the
  // same key on every scan, or nothing is ever deduplicated.
  it("produces a stable key for identical bytes across scans", () => {
    const key = (scanId: string) => `${screenshotPrefix("ws_1")}/${HASH}.jpg`;
    expect(key("scan_a")).toBe(key("scan_b"));
  });

  it("keeps different workspaces apart even for identical bytes", () => {
    expect(`${screenshotPrefix("ws_1")}/${HASH}.jpg`).not.toBe(
      `${screenshotPrefix("ws_2")}/${HASH}.jpg`,
    );
  });
});

describe("diffKey", () => {
  const base = { workspaceId: "ws_1", scanId: "scan_1", monitoredPageId: "page_1" };

  // Diffs are NOT shared. Two pages that look identical must not collide, or
  // one scan's evidence overwrites another's.
  it("is unique per scan and per page", () => {
    expect(diffKey(base)).not.toBe(diffKey({ ...base, scanId: "scan_2" }));
    expect(diffKey(base)).not.toBe(diffKey({ ...base, monitoredPageId: "page_2" }));
  });

  it("is deterministic, so retention rebuilds the same key months later", () => {
    expect(diffKey(base)).toBe(diffKey({ ...base }));
  });

  // Diffs already in the bucket were written at <artifactPrefix>/diff.png.
  // Changing this layout would orphan every one of them.
  it("keeps the pre-existing layout so stored diffs still resolve", () => {
    expect(diffKey(base)).toBe("ws/ws_1/scan/scan_1/page_1/diff.png");
  });
});

describe("isContentAddressedScreenshotKey", () => {
  it("recognises a shared, content-addressed key", () => {
    expect(isContentAddressedScreenshotKey(`ws/ws_1/shot/${HASH}.jpg`)).toBe(true);
  });

  it("does not mistake a legacy per-scan key for a shared one", () => {
    expect(
      isContentAddressedScreenshotKey("ws/ws_1/scan/scan_1/page_1/screenshot.jpg"),
    ).toBe(false);
  });

  it("rejects anything that is not a full sha256", () => {
    expect(isContentAddressedScreenshotKey("ws/ws_1/shot/abc.jpg")).toBe(false);
    expect(isContentAddressedScreenshotKey(`ws/ws_1/shot/${"z".repeat(64)}.jpg`)).toBe(false);
  });
});
