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

/* ----------------------- the diff image, not the number ------------------- */

import { PNG } from "pngjs";

/**
 * A page built from a list of row shades, one entry per pixel row.
 *
 * Solid blocks are the wrong fixture for this: shifting a block of one colour
 * down only changes the few rows at its edges, so it understates the very
 * inflation being tested. A real page is rows of text and images that each
 * differ from their neighbours, so a shift misaligns essentially all of them.
 * Shades step by more than the signature's quantisation, so adjacent rows are
 * genuinely distinguishable rather than collapsing into one bucket.
 */
const SHADES = [20, 90, 160, 230, 55, 125, 195];

/** Concatenate row-shade runs into one page image. */
function pageOfRows(width: number, rows: number[]): Buffer {
  const height = rows.length;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = rows[y];
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data: Buffer.from(data), width, height }, 100).data;
}

/** n rows cycling through the shade palette, starting at `from`. */
function body(n: number, from = 0): number[] {
  return Array.from({ length: n }, (_, i) => SHADES[(i + from) % SHADES.length]);
}

/** Share of rows in the diff image carrying a highlight rather than the fade. */
function highlightedRowShare(diffPng: Buffer): number {
  const png = PNG.sync.read(diffPng);
  let flagged = 0;
  for (let y = 0; y < png.height; y++) {
    // The gutter stripe is painted solid, so the first pixel of a row is the
    // cheapest reliable test for "this row was marked".
    const i = y * png.width * 4;
    const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
    const faded = r > 200 && g > 200 && b > 200;
    if (!faded) flagged++;
  }
  return flagged / png.height;
}

describe("the diff image", () => {
  /**
   * THE BUG THIS EXISTS TO PREVENT.
   *
   * A real customer added one link to their nav. Everything below shifted by
   * a few pixels, the positional pixel diff called every row changed, and the
   * diff image came out solid red - useless for seeing what had actually
   * happened. The severity score was already shift-aware; the picture was not.
   */
  it("does not light up the whole page when content merely shifts down", () => {
    const before = pageOfRows(64, [...body(20), ...body(80, 3)]);
    // Same page with an 8-row band inserted near the top: everything below
    // slides down, which is the customer's nav link in miniature.
    const after = pageOfRows(64, [...body(20), ...body(8, 5), ...body(80, 3)]);
    const result = compareScreenshots(before, after)!;

    // The positional count is still huge - that is the honest pixel answer,
    // and exactly why it must not be what the image is drawn from.
    expect(result.differencePercentage).toBeGreaterThan(30);

    // The picture, though, points at the insertion and leaves the rest alone.
    expect(highlightedRowShare(result.diffPng)).toBeLessThan(0.25);
  });

  it("highlights nothing when the page is unchanged", () => {
    const unchanged = pageOfRows(64, body(60));
    const result = compareScreenshots(unchanged, unchanged)!;
    expect(highlightedRowShare(result.diffPng)).toBeLessThan(0.05);
  });

  /**
   * The failure mode the fix could have introduced. A deleted section leaves
   * the surviving rows matching perfectly - they just move up - so a naive
   * "highlight what is new" would show a clean page for a real deletion.
   */
  it("still marks the page when a section is deleted", () => {
    const before = pageOfRows(64, [...body(20), ...body(30, 2), ...body(30, 4)]);
    const after = pageOfRows(64, [...body(20), ...body(30, 4)]);
    const result = compareScreenshots(before, after)!;
    expect(highlightedRowShare(result.diffPng)).toBeGreaterThan(0);
  });

  it("marks a genuinely rewritten page nearly everywhere", () => {
    const before = pageOfRows(64, Array.from({ length: 80 }, () => 245));
    const after = pageOfRows(64, Array.from({ length: 80 }, () => 15));
    const result = compareScreenshots(before, after)!;
    expect(highlightedRowShare(result.diffPng)).toBeGreaterThan(0.9);
  });

  it("produces an image the same size as the current page", () => {
    const before = pageOfRows(64, body(40));
    const after = pageOfRows(64, body(90));
    const png = PNG.sync.read(compareScreenshots(before, after)!.diffPng);
    expect(png.width).toBe(64);
    expect(png.height).toBe(90);
  });
});
