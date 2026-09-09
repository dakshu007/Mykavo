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
  /**
   * Raw share of pixels that differ. Honest, but inflated by any vertical
   * shift - shown to the user alongside the diff image, NOT used for severity.
   */
  differencePercentage: number;
  /**
   * Share of the page's content that genuinely changed, with rows matched
   * regardless of where they moved to. This is what severity scores on.
   */
  contentDifferencePercentage: number;
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

/* ----------------------- content-aware row alignment ---------------------- */

/** Horizontal block width when summarising a row. Coarse on purpose. */
const BLOCK_WIDTH = 16;
/** Colour levels a block average is snapped to, to absorb JPEG noise. */
const QUANTIZE_STEP = 24;

/**
 * A compact fingerprint of one pixel row: the row is divided into 16px blocks,
 * each block's average colour is quantised, and the result is folded into a
 * 32-bit FNV-1a hash. Quantising is what makes this survive JPEG re-encoding -
 * two visually identical rows must hash identically or the whole approach
 * collapses into the pixel-diff problem it exists to solve.
 */
function rowSignature(data: Uint8Array, width: number, y: number, offset: number): number {
  let hash = 0x811c9dc5;
  const rowStart = y * width * 4;
  for (let blockStart = 0; blockStart < width; blockStart += BLOCK_WIDTH) {
    const blockEnd = Math.min(blockStart + BLOCK_WIDTH, width);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let x = blockStart; x < blockEnd; x++) {
      const i = rowStart + x * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const count = blockEnd - blockStart;
    // Quantise each channel average so small compression wobble collapses.
    const qr = Math.floor((r / count + offset) / QUANTIZE_STEP);
    const qg = Math.floor((g / count + offset) / QUANTIZE_STEP);
    const qb = Math.floor((b / count + offset) / QUANTIZE_STEP);
    for (const value of [qr, qg, qb]) {
      hash ^= value;
      hash = Math.imul(hash, 0x01000193);
    }
  }
  return hash >>> 0;
}

/**
 * Two signatures per row, on quantisation grids offset by half a step.
 *
 * A single grid has hard boundaries, and a colour sitting on one flips bucket
 * under the slightest re-encode - which made an identical page re-saved at a
 * lower JPEG quality read as 16% changed, worse than the pixel diff this
 * replaces. A value near a boundary on one grid is mid-bucket on the other, so
 * requiring only ONE of the two to match removes the cliff.
 */
interface RowSignaturePair {
  a: number;
  b: number;
}

function rowSignatures(img: RGBAImage): RowSignaturePair[] {
  const out = new Array<RowSignaturePair>(img.height);
  for (let y = 0; y < img.height; y++) {
    out[y] = {
      a: rowSignature(img.data, img.width, y, 0),
      b: rowSignature(img.data, img.width, y, QUANTIZE_STEP / 2),
    };
  }
  return out;
}

/**
 * How much of the page's CONTENT actually changed, ignoring where it sits.
 *
 * A full-page screenshot is a vertical document. Insert a paragraph near the
 * top and every row below it moves down, so a naive pixel diff reports almost
 * the whole page as changed and fires a HIGH alert for a routine edit. That
 * single behaviour is the biggest source of false positives in visual
 * monitoring, and false positives are the thing that makes people stop
 * trusting alerts (spec §4.5).
 *
 * So rows are matched as a multiset rather than positionally: a row present in
 * both images counts as unchanged no matter how far it slid. What remains -
 * rows genuinely added or removed - is the real difference. Ordering is
 * deliberately not considered; a reordered page reading as unchanged is a far
 * cheaper mistake than a shifted page screaming that everything broke.
 */
function contentDifferencePercentage(baseline: RGBAImage, current: RGBAImage): number {
  const baseRows = rowSignatures(baseline);
  const currRows = rowSignatures(current);
  if (baseRows.length === 0 && currRows.length === 0) return 0;

  // Index baseline rows under BOTH grids, then consume each row at most once.
  // Buckets hold row indices (not counts) so a row claimed via grid A cannot
  // be claimed again via grid B.
  const byA = new Map<number, number[]>();
  const byB = new Map<number, number[]>();
  baseRows.forEach((sig, index) => {
    (byA.get(sig.a) ?? byA.set(sig.a, []).get(sig.a)!).push(index);
    (byB.get(sig.b) ?? byB.set(sig.b, []).get(sig.b)!).push(index);
  });
  const claimed = new Uint8Array(baseRows.length);

  /** Take an unclaimed baseline row from a bucket, or -1 if none remain. */
  function claim(bucket: number[] | undefined): number {
    if (!bucket) return -1;
    while (bucket.length > 0) {
      const index = bucket.pop()!;
      if (!claimed[index]) {
        claimed[index] = 1;
        return index;
      }
    }
    return -1;
  }

  let matched = 0;
  for (const sig of currRows) {
    if (claim(byA.get(sig.a)) !== -1 || claim(byB.get(sig.b)) !== -1) matched++;
  }

  const added = currRows.length - matched;
  const removed = baseRows.length - matched;
  const total = baseRows.length + currRows.length;
  return ((added + removed) / total) * 100;
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
    contentDifferencePercentage: contentDifferencePercentage(baseline, current),
    changedPixels,
    totalPixels,
    diffPng: PNG.sync.write(diff),
  };
}
