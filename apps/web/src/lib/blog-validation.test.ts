import { describe, expect, it } from "vitest";
import { blogPostInputSchema, SLUG_PATTERN } from "./blog-validation";

const validPayload = {
  title: "Why website baselines matter",
  slug: "why-website-baselines-matter",
  excerpt: "A short introduction to approved baselines.",
  content: "## Baselines\n\nEvery scan compares against an approved baseline.",
  status: "DRAFT" as const,
  authorName: "MyKavo Team",
  seoTitle: "Why website baselines matter",
  seoDescription: "How approved baselines cut false positives.",
};

describe("SLUG_PATTERN", () => {
  it("accepts well-formed slugs", () => {
    expect(SLUG_PATTERN.test("hello-world-2026")).toBe(true);
    expect(SLUG_PATTERN.test("a")).toBe(true);
  });

  it("rejects malformed slugs", () => {
    expect(SLUG_PATTERN.test("Hello-World")).toBe(false);
    expect(SLUG_PATTERN.test("-leading")).toBe(false);
    expect(SLUG_PATTERN.test("trailing-")).toBe(false);
    expect(SLUG_PATTERN.test("double--hyphen")).toBe(false);
    expect(SLUG_PATTERN.test("spaces here")).toBe(false);
    expect(SLUG_PATTERN.test("")).toBe(false);
  });
});

describe("blogPostInputSchema", () => {
  it("accepts a complete valid payload", () => {
    const parsed = blogPostInputSchema.parse(validPayload);
    expect(parsed.slug).toBe("why-website-baselines-matter");
    expect(parsed.status).toBe("DRAFT");
  });

  it("rejects a missing title and slug", () => {
    expect(blogPostInputSchema.safeParse({ ...validPayload, title: "  " }).success).toBe(false);
    expect(blogPostInputSchema.safeParse({ ...validPayload, slug: "" }).success).toBe(false);
  });

  it("rejects malformed slugs", () => {
    expect(
      blogPostInputSchema.safeParse({ ...validPayload, slug: "Bad Slug!" }).success,
    ).toBe(false);
  });

  it("rejects unknown statuses", () => {
    expect(
      blogPostInputSchema.safeParse({ ...validPayload, status: "ARCHIVED" }).success,
    ).toBe(false);
  });

  it("normalizes empty optional fields to null", () => {
    const parsed = blogPostInputSchema.parse({
      ...validPayload,
      excerpt: "   ",
      seoTitle: "",
      seoDescription: undefined,
    });
    expect(parsed.excerpt).toBeNull();
    expect(parsed.seoTitle).toBeNull();
    expect(parsed.seoDescription).toBeNull();
  });

  it("defaults authorName when omitted", () => {
    const rest: Partial<typeof validPayload> = { ...validPayload };
    delete rest.authorName;
    expect(blogPostInputSchema.parse(rest).authorName).toBe("MyKavo Team");
  });

  it("allows empty draft content", () => {
    expect(
      blogPostInputSchema.safeParse({ ...validPayload, content: "" }).success,
    ).toBe(true);
  });
});
