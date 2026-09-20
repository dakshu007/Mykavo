import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { compressScreenshot, MAX_SCREENSHOT_BYTES } from "./scan-page";

/**
 * These run the real encoder rather than a mock. The whole claim being made
 * is "no stored screenshot exceeds 150KB", and that claim is about what sharp
 * actually produces for awkward inputs - a mocked encoder would let the
 * budget be wrong and the test still pass.
 */

/** A page-shaped image: broad flat bands, like a real layout. */
async function layoutLike(width: number, height: number): Promise<Buffer> {
  const bandHeight = 40;
  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const band = Math.floor(y / bandHeight);
    const shade = band % 2 === 0 ? 250 : 232;
    rows.push(Buffer.alloc(width * 3, shade));
  }
  return sharp(Buffer.concat(rows), { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

/** Pure noise: the worst case for JPEG, and nothing like a real page. */
async function noise(width: number, height: number): Promise<Buffer> {
  const pixels = Buffer.allocUnsafe(width * height * 3);
  // Deterministic pseudo-random so a failure is reproducible.
  let seed = 42;
  for (let i = 0; i < pixels.length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    pixels[i] = seed & 0xff;
  }
  return sharp(pixels, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("compressScreenshot", () => {
  it("returns a small screenshot byte-for-byte untouched", async () => {
    const small = await layoutLike(400, 300);
    expect(small.length).toBeLessThanOrEqual(MAX_SCREENSHOT_BYTES);

    const result = await compressScreenshot(small);
    expect(result.withinBudget).toBe(true);
    // Identity matters beyond efficiency: the stored key IS the hash of these
    // bytes, so re-encoding an already-small screenshot would change the hash
    // of every unchanged page and report a visual change on every site.
    expect(result.buffer).toBe(small);
  });

  it("brings a tall, image-heavy page under the budget", async () => {
    const tall = await layoutLike(1440, 7000);
    const result = await compressScreenshot(tall);

    expect(result.withinBudget).toBe(true);
    expect(result.buffer.length).toBeLessThanOrEqual(MAX_SCREENSHOT_BYTES);
    // And it must still be a readable JPEG, not a truncated buffer.
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    expect(meta.width ?? 0).toBeGreaterThan(300);
  }, 60_000);

  it("keeps more quality when the overshoot is small", async () => {
    // Just over budget should be rescued by an early, high-quality rung
    // rather than dropped all the way to the bottom of the ladder.
    const modest = await layoutLike(1440, 2400);
    if (modest.length <= MAX_SCREENSHOT_BYTES) return; // already fine; nothing to assert

    const result = await compressScreenshot(modest);
    expect(result.withinBudget).toBe(true);
    const meta = await sharp(result.buffer).metadata();
    // An early rung does not downscale, so full width survives.
    expect(meta.width).toBe(1440);
  }, 60_000);

  /**
   * Noise is not a real web page, but it is the input that defeats every
   * rung. The contract there is "still return a usable image and admit it is
   * over budget" - never throw, and never lose the screenshot, because a
   * snapshot with no image cannot be compared at all.
   */
  it("never throws or loses the image when nothing fits", async () => {
    const hostile = await noise(1440, 6000);
    const result = await compressScreenshot(hostile);

    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.buffer.length).toBeLessThan(hostile.length);
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("jpeg");
    // withinBudget reports the truth either way; the caller logs when false.
    expect(typeof result.withinBudget).toBe("boolean");
    if (result.withinBudget) {
      expect(result.buffer.length).toBeLessThanOrEqual(MAX_SCREENSHOT_BYTES);
    }
  }, 60_000);

  it("holds the budget at 150KB", () => {
    // The number this whole file is about. A change here is a storage-cost
    // decision, not a tweak.
    expect(MAX_SCREENSHOT_BYTES).toBe(150 * 1024);
  });
});
