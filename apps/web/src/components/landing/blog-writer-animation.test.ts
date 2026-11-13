import { describe, expect, it } from "vitest";
import { BW_CHIPS, BW_KEYWORDS, BW_TITLE, blogWriterFrameAt } from "./blog-writer-animation";

const at = (u: number) => blogWriterFrameAt(0.8 + u);

describe("AI Keywords & Blog Writer animation", () => {
  it("opens on the finished draft before the loop starts", () => {
    const f = blogWriterFrameAt(0);
    expect(f.title).toBe(BW_TITLE);
    expect(f.chips).toHaveLength(BW_CHIPS.length);
    expect(f.ready).toBeCloseTo(1, 5);
  });

  it("reads the site before it ranks keywords", () => {
    expect(at(1.0).site.o).toBeGreaterThan(0.9);
    expect(at(1.0).list.o).toBe(0);
    expect(at(4.0).rows.every((row) => row.o > 0.99)).toBe(true);
    expect(at(4.0).rows).toHaveLength(BW_KEYWORDS.length);
  });

  it("presses Write post, then types the title, then adds the extras", () => {
    expect(at(4.95).pressed).toBe(true);
    expect(at(5.5).thinking).toBe(true);
    const mid = at(6.3).title;
    expect(mid.length).toBeGreaterThan(0);
    expect(mid.length).toBeLessThan(BW_TITLE.length);
    expect(at(7.1).title).toBe(BW_TITLE);
    expect(at(8.5).chips[0]).toBe(0);
    expect(at(10.0).chips.every((c) => c > 0.99)).toBe(true);
    expect(at(9.5).ready).toBe(0);
  });

  it("fades out and starts again", () => {
    expect(at(12.95).site.o).toBe(0);
    expect(at(13 + 0.7).site.o).toBeGreaterThan(0.9);
  });
});
