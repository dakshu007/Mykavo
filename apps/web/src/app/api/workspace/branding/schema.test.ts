import { describe, expect, it } from "vitest";
import { brandingUpdateSchema } from "./schema";

const png = `data:image/png;base64,${"A".repeat(400)}`;

describe("brandingUpdateSchema", () => {
  it("accepts a full branding payload", () => {
    const parsed = brandingUpdateSchema.parse({
      brandName: "  Northwind Digital  ",
      brandColor: "#1A2B3C",
      logo: png,
    });
    expect(parsed.brandName).toBe("Northwind Digital");
    expect(parsed.brandColor).toBe("#1A2B3C");
  });

  it("accepts nulls (clear branding) and omitted logo (keep current)", () => {
    const parsed = brandingUpdateSchema.parse({ brandName: null, brandColor: null });
    expect(parsed.brandName).toBeNull();
    expect(parsed.logo).toBeUndefined();
    expect(
      brandingUpdateSchema.parse({ brandName: "X", brandColor: null, logo: null }).logo,
    ).toBeNull();
  });

  it("rejects bad colors, oversized names, and non-image logos", () => {
    expect(
      brandingUpdateSchema.safeParse({ brandName: "X", brandColor: "red" }).success,
    ).toBe(false);
    expect(
      brandingUpdateSchema.safeParse({ brandName: "X", brandColor: "#fff" }).success,
    ).toBe(false);
    expect(
      brandingUpdateSchema.safeParse({ brandName: "y".repeat(61), brandColor: null })
        .success,
    ).toBe(false);
    expect(
      brandingUpdateSchema.safeParse({
        brandName: "X",
        brandColor: null,
        logo: "data:image/svg+xml;base64,AAAA",
      }).success,
    ).toBe(false);
    expect(
      brandingUpdateSchema.safeParse({
        brandName: "X",
        brandColor: null,
        logo: `data:image/png;base64,${"A".repeat(300_000)}`,
      }).success,
    ).toBe(false);
  });
});
