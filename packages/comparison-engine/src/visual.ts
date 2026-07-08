/**
 * Screenshot comparison (spec §18). Decodes two JPEG screenshots, normalizes
 * them to a common canvas (baseline/current may differ in height when content
 * changes), runs pixelmatch, and returns the difference percentage plus a
 * PNG diff image. All libraries are MIT-licensed and run in the worker.
 */

import jpeg from "jpeg-js";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export interface VisualDiffResult {
  differencePercentage: number;
  changedPixels: number;
  totalPixels: number;
  /** Encoded PNG diff image (baseline dimmed, changed pixels highlighted). */
  diffPng: Buffer;
}

interface RGBAImage {
  width: number;
  height: number;
  data: Uint8Array;
}

function decode(buffer: Buffer): RGBAImage {
  const raw = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 512 });
  return { width: raw.width, height: raw.height, data: raw.data };
}

/** Copy an RGBA image onto a white canvas of the given size (top-left origin). */
function padToCanvas(img: RGBAImage, width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4).fill(255); // white background
  for (let y = 0; y < img.height && y < height; y++) {
    for (let x = 0; x < img.width && x < width; x++) {
      const src = (y * img.width + x) * 4;
      const dst = (y * width + x) * 4;
      out[dst] = img.data[src];
      out[dst + 1] = img.data[src + 1];
      out[dst + 2] = img.data[src + 2];
      out[dst + 3] = img.data[src + 3];
    }
  }
  return out;
}

/**
 * Compare two JPEG screenshots. Returns null if either image fails to decode
 * (a degraded scan should not block the rest of the comparison).
 */
export function compareScreenshots(
  baselineJpeg: Buffer,
  currentJpeg: Buffer,
): VisualDiffResult | null {
  let baseline: RGBAImage;
  let current: RGBAImage;
  try {
    baseline = decode(baselineJpeg);
    current = decode(currentJpeg);
  } catch {
    return null;
  }

  const width = Math.max(baseline.width, current.width);
  const height = Math.max(baseline.height, current.height);
  const totalPixels = width * height;
  if (totalPixels === 0) return null;

  const baseData = padToCanvas(baseline, width, height);
  const currData = padToCanvas(current, width, height);

  const diff = new PNG({ width, height });
  const changedPixels = pixelmatch(baseData, currData, diff.data, width, height, {
    threshold: 0.1, // per-pixel color tolerance; ignores sub-perceptual noise
    includeAA: false, // ignore anti-aliasing differences
  });

  return {
    differencePercentage: (changedPixels / totalPixels) * 100,
    changedPixels,
    totalPixels,
    diffPng: PNG.sync.write(diff),
  };
}
