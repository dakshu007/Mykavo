import { describe, expect, it } from "vitest";
import { displayTags, showUpdated } from "./blog-display";
import { toolForPost } from "./blog-tools";
import { authorFor } from "@/config/authors";

describe("displayTags", () => {
  it("keeps short topics and drops search phrases", () => {
    expect(
      displayTags(["Databases", "best free database 2026", "free database for web app", "Postgres", "SEO"]),
    ).toEqual(["Databases", "Postgres", "SEO"]);
  });

  it("shows at most four", () => {
    expect(displayTags(["a", "b", "c", "d", "e"])).toEqual(["a", "b", "c", "d"]);
  });
});

describe("showUpdated", () => {
  const published = new Date("2026-09-20T10:00:00Z");
  it("hides same-day edits", () => {
    expect(showUpdated(published, new Date("2026-09-20T18:00:00Z"))).toBe(false);
  });
  it("shows edits a day or more later", () => {
    expect(showUpdated(published, new Date("2026-09-22T09:00:00Z"))).toBe(true);
  });
  it("never shows for an unpublished post", () => {
    expect(showUpdated(null, new Date())).toBe(false);
  });
});

describe("toolForPost", () => {
  const post = (title: string, tags: string[] = []) => ({ title, tags, primaryKeyword: null, secondaryKeyword: null });
  it("matches the post's subject to a tool", () => {
    expect(toolForPost(post("Accidental noindex: how to detect it"))).toBe("meta-tags");
    expect(toolForPost(post("Redirect chains explained"))).toBe("redirects");
    expect(toolForPost(post("Your analytics script disappeared"))).toBe("scripts");
    expect(toolForPost(post("Find every broken link and 404"))).toBe("status");
    expect(toolForPost(post("What E-E-A-T means for small sites"))).toBe("eeat");
  });
  it("offers nothing when nothing fits", () => {
    expect(toolForPost(post("Best free databases in 2026", ["Databases"]))).toBeNull();
  });
});

describe("authorFor", () => {
  it("finds the founder from the byline", () => {
    expect(authorFor("Dakshesh - Founder (MyKavo)")?.id).toBe("dakshesh");
  });
  it("leaves team posts to the team", () => {
    expect(authorFor("MyKavo Team")).toBeNull();
  });
});
