import { describe, expect, it } from "vitest";
import { filterSnippets } from "./markdown-editor";

describe("markdown editor / menu", () => {
  it("shows every block for a bare slash", () => {
    expect(filterSnippets("").length).toBeGreaterThan(3);
  });

  it("/cta-wordpress finds exactly the WordPress plugin CTA", () => {
    expect(filterSnippets("cta-wordpress").map((o) => o.command)).toEqual(["cta-wordpress"]);
  });

  it("/cta offers both CTA cards", () => {
    expect(filterSnippets("cta").map((o) => o.command)).toEqual(["cta", "cta-wordpress"]);
  });
});
