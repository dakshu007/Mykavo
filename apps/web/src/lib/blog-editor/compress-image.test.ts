import { describe, expect, it } from "vitest";
import { compressImage, formatBytes, IMAGE_BUDGET_BYTES } from "./compress-image";

function fileOf(bytes: number, type: string, name = "photo.jpg"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("formatBytes", () => {
  it("uses KB below a megabyte and MB above", () => {
    expect(formatBytes(150 * 1024)).toBe("150 KB");
    expect(formatBytes(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });
});

describe("compressImage", () => {
  it("leaves a file already within budget untouched", async () => {
    const small = fileOf(50 * 1024, "image/jpeg");
    const result = await compressImage(small);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(small);
    expect(result.bytes).toBe(50 * 1024);
  });

  it("passes GIFs through - re-encoding would kill the animation", async () => {
    const gif = fileOf(400 * 1024, "image/gif", "loop.gif");
    const result = await compressImage(gif);
    expect(result.compressed).toBe(false);
    expect(result.file).toBe(gif);
  });

  it("degrades to the original rather than throwing when decoding fails", async () => {
    // Not a real image, so decoding cannot succeed. An upload must still be
    // attempted - the route's own size limit is the backstop.
    const broken = fileOf(IMAGE_BUDGET_BYTES + 1, "image/png", "broken.png");
    const result = await compressImage(broken);
    expect(result.file).toBe(broken);
    expect(result.compressed).toBe(false);
  });

  it("treats the budget as inclusive", async () => {
    const exact = fileOf(IMAGE_BUDGET_BYTES, "image/jpeg");
    const result = await compressImage(exact);
    expect(result.compressed).toBe(false);
  });
});
