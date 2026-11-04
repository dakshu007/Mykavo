import { describe, expect, it } from "vitest";
import { aiBotsQuerySchema, historySince } from "./wp-ai-insights";

describe("aiBotsQuerySchema", () => {
  it("defaults to 90 days and reads the query string", () => {
    expect(aiBotsQuerySchema.parse({}).days).toBe(90);
    expect(aiBotsQuerySchema.parse({ days: "30" }).days).toBe(30);
  });

  it.each(["0", "366", "1.5", "abc", "-3"])("refuses days=%s", (days) => {
    expect(aiBotsQuerySchema.safeParse({ days }).success).toBe(false);
  });
});

describe("historySince", () => {
  it("counts today as the first day", () => {
    const now = new Date("2026-11-04T18:00:00Z");
    expect(historySince(1, now).toISOString()).toBe("2026-11-04T00:00:00.000Z");
    expect(historySince(7, now).toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });
});
