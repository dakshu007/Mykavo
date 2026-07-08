import { describe, expect, it } from "vitest";
import jpeg from "jpeg-js";
import { compareScreenshots } from "./visual";

/** Encode a solid-fill RGBA image to JPEG. */
function solid(width: number, height: number, color: [number, number, number]): Buffer {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = color[0];
    data[i * 4 + 1] = color[1];
    data[i * 4 + 2] = color[2];
    data[i * 4 + 3] = 255;
  }
  return jpeg.encode({ data: Buffer.from(data), width, height }, 100).data;
}

/** Half white on top, black on the bottom. */
function halfSplit(width: number, height: number): Buffer {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const v = y < height / 2 ? 255 : 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data: Buffer.from(data), width, height }, 100).data;
}

describe("compareScreenshots", () => {
  it("reports ~0% for identical images", () => {
    const a = solid(64, 64, [255, 255, 255]);
    const result = compareScreenshots(a, solid(64, 64, [255, 255, 255]))!;
    expect(result).not.toBeNull();
    expect(result.differencePercentage).toBeLessThan(1);
  });

  it("reports ~50% when half the image flips to black", () => {
    const white = solid(64, 64, [255, 255, 255]);
    const half = halfSplit(64, 64);
    const result = compareScreenshots(white, half)!;
    expect(result.differencePercentage).toBeGreaterThan(40);
    expect(result.differencePercentage).toBeLessThan(60);
    expect(result.diffPng.length).toBeGreaterThan(0);
  });

  it("handles different image heights by padding to a common canvas", () => {
    const tall = solid(64, 128, [255, 255, 255]);
    const short = solid(64, 64, [255, 255, 255]);
    const result = compareScreenshots(tall, short)!;
    // The extra area is white-vs-white padding, so difference stays low.
    expect(result.totalPixels).toBe(64 * 128);
    expect(result.differencePercentage).toBeLessThan(5);
  });

  it("returns null when a buffer is not decodable", () => {
    expect(compareScreenshots(Buffer.from("not a jpeg"), solid(8, 8, [0, 0, 0]))).toBeNull();
  });
});
