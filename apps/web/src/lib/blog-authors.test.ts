import { describe, expect, it } from "vitest";
import { authorInputSchema, authorView } from "./blog-authors";

const base = { name: "Dakshesh B" };

describe("authorInputSchema", () => {
  it("accepts a full, real profile", () => {
    const r = authorInputSchema.safeParse({
      ...base,
      role: "Founder, MyKavo",
      bio: "Builds MyKavo.",
      imageUrl: "/api/blog-images/0123456789abcdef0123456789abcdef.jpg",
      linkedinUrl: "https://www.linkedin.com/in/someone",
      xUrl: "https://x.com/someone",
      githubUrl: "https://github.com/someone",
      websiteUrl: "https://example.com",
      highlights: ["Built 40+ client WordPress sites"],
    });
    expect(r.success).toBe(true);
  });

  it("turns empty optional fields into null", () => {
    const r = authorInputSchema.parse({ ...base, role: "", bio: "  ", linkedinUrl: "" });
    expect(r.role).toBeNull();
    expect(r.bio).toBeNull();
    expect(r.linkedinUrl).toBeNull();
    expect(r.highlights).toEqual([]);
  });

  it("rejects a profile link on the wrong site, or not https", () => {
    expect(authorInputSchema.safeParse({ ...base, linkedinUrl: "https://evil.example/in/x" }).success).toBe(false);
    expect(authorInputSchema.safeParse({ ...base, linkedinUrl: "https://linkedin.com.evil.example/x" }).success).toBe(false);
    expect(authorInputSchema.safeParse({ ...base, githubUrl: "http://github.com/x" }).success).toBe(false);
    expect(authorInputSchema.safeParse({ ...base, websiteUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("only takes uploaded or https photos", () => {
    expect(authorInputSchema.safeParse({ ...base, imageUrl: "/api/blog-images/../../etc.jpg" }).success).toBe(false);
    expect(authorInputSchema.safeParse({ ...base, imageUrl: "data:image/png;base64,xx" }).success).toBe(false);
    expect(authorInputSchema.safeParse({ ...base, imageUrl: "https://cdn.example.com/me.jpg" }).success).toBe(true);
  });

  it("caps highlights at six", () => {
    expect(authorInputSchema.safeParse({ ...base, highlights: Array.from({ length: 7 }, (_, i) => `Fact ${i}`) }).success).toBe(false);
  });
});

describe("authorView", () => {
  it("builds absolute image and page URLs and keeps only the links that exist", () => {
    const v = authorView({
      slug: "dakshesh-b",
      name: "Dakshesh B",
      role: null,
      bio: null,
      imageUrl: "/api/blog-images/0123456789abcdef0123456789abcdef.jpg",
      linkedinUrl: "https://www.linkedin.com/in/someone",
      xUrl: null,
      githubUrl: null,
      websiteUrl: null,
      highlights: [],
    });
    expect(v.image).toMatch(/^https:\/\/.+\/api\/blog-images\//);
    expect(v.url).toMatch(/\/blog\/author\/dakshesh-b$/);
    expect(v.links).toEqual([{ label: "LinkedIn", href: "https://www.linkedin.com/in/someone" }]);
  });
});
