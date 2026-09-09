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

/**
 * A page rendered as horizontal bands - a crude stand-in for a real document:
 * distinct blocks of content stacked vertically on white.
 */
function bandedPage(bands: Array<[number, number, number]>, bandHeight = 40, width = 320): Buffer {
  const height = bands.length * bandHeight;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const [r, g, b] = bands[Math.floor(y / bandHeight)];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data: Buffer.from(data), width, height }, 90).data;
}

const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [220, 40, 40];
const BLUE: [number, number, number] = [40, 60, 220];
const GREEN: [number, number, number] = [30, 170, 90];
const GOLD: [number, number, number] = [255, 212, 0];

describe("content difference vs raw pixel difference", () => {
  it("does not scream when content is merely pushed down (THE false positive)", () => {
    // Baseline: three sections. Current: one new section inserted at the top,
    // pushing every original section down by one band. Nothing was rewritten.
    const baseline = bandedPage([WHITE, RED, WHITE, BLUE, WHITE, GREEN]);
    const current = bandedPage([WHITE, GOLD, WHITE, RED, WHITE, BLUE, WHITE, GREEN]);

    const result = compareScreenshots(baseline, current);
    expect(result).not.toBeNull();

    // The positional pixel diff is enormous - everything moved.
    expect(result!.differencePercentage).toBeGreaterThan(30);
    // The content diff sees the same sections, just relocated, and reports
    // only the genuinely new material.
    expect(result!.contentDifferencePercentage).toBeLessThan(
      result!.differencePercentage / 2,
    );
  });

  it("still reports a real rewrite as a large change", () => {
    const baseline = bandedPage([WHITE, RED, WHITE, BLUE]);
    const current = bandedPage([GOLD, GREEN, GOLD, GREEN]);
    const result = compareScreenshots(baseline, current);
    expect(result!.contentDifferencePercentage).toBeGreaterThan(60);
  });

  it("reports no content change for an identical page", () => {
    const page = bandedPage([WHITE, RED, WHITE, BLUE]);
    const result = compareScreenshots(page, page);
    expect(result!.contentDifferencePercentage).toBe(0);
  });

  it("survives JPEG re-encoding of the same content", () => {
    // Quantised row signatures must ignore compression wobble, otherwise the
    // content diff degenerates back into the pixel diff.
    const bands: Array<[number, number, number]> = [WHITE, RED, WHITE, BLUE, WHITE, GREEN];
    const height = bands.length * 40;
    const data = new Uint8Array(320 * height * 4);
    for (let y = 0; y < height; y++) {
      const [r, g, b] = bands[Math.floor(y / 40)];
      for (let x = 0; x < 320; x++) {
        const i = (y * 320 + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
    const highQuality = jpeg.encode({ data: Buffer.from(data), width: 320, height }, 95).data;
    const lowQuality = jpeg.encode({ data: Buffer.from(data), width: 320, height }, 60).data;
    const result = compareScreenshots(highQuality, lowQuality);
    expect(result!.contentDifferencePercentage).toBeLessThan(5);
  });

  it("counts removed content, not just added", () => {
    const baseline = bandedPage([WHITE, RED, WHITE, BLUE, WHITE, GREEN]);
    const current = bandedPage([WHITE, RED, WHITE, GREEN]);
    const result = compareScreenshots(baseline, current);
    expect(result!.contentDifferencePercentage).toBeGreaterThan(0);
  });
});
