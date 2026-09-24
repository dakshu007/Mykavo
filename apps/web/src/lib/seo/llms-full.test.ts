import { describe, expect, it } from "vitest";
import { allDocArticles } from "@/config/docs";
import { CHANGELOG } from "@/config/changelog";
import { llmsFullText } from "./llms-full";

describe("llms-full.txt", () => {
  const text = llmsFullText();

  it("includes every doc article and every release", () => {
    for (const { section, article } of allDocArticles()) {
      expect(text).toContain(`/docs/${section.slug}/${article.slug}`);
      expect(text).toContain(article.title);
    }
    for (const release of CHANGELOG) expect(text).toContain(release.title);
  });

  it("keeps code samples fenced", () => {
    expect(text).toContain("```sql");
  });
});
