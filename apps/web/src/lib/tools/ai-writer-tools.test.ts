import { describe, expect, it } from "vitest";
import { cleanSeed, fetchTopicLists, groupTopics, parseSuggestions, topicKind, topicQueries } from "./blog-topics";
import { containsKeyword, gradePost, SAMPLE_DRAFT } from "./post-grader";

describe("blog topic finder", () => {
  it("cleans seeds and refuses empty ones", () => {
    expect(cleanSeed("  WordPress   Speed!! ")).toBe("wordpress speed");
    expect(cleanSeed("a")).toBeNull();
    expect(cleanSeed("<script>")).toBe("script");
  });

  it("asks the seed and its variations", () => {
    const q = topicQueries("dog training");
    expect(q[0]).toBe("dog training");
    expect(q).toContain("how to dog training");
    expect(q).toContain("dog training vs");
  });

  it("parses the firefox autocomplete shape", () => {
    expect(parseSuggestions('["x",["Dog Training Tips","dog training near me"]]')).toEqual(["dog training tips", "dog training near me"]);
    expect(parseSuggestions("not json")).toEqual([]);
  });

  it("sorts suggestions into the kind of post they ask for", () => {
    expect(topicKind("how to train a puppy")).toBe("question");
    expect(topicKind("best dog training collar")).toBe("comparison");
    expect(topicKind("dog training for beginners")).toBe("audience");
    expect(topicKind("dog training schedule")).toBe("idea");
  });

  it("ranks suggestions seen high and often above the rest, and drops blocked words", () => {
    const g = groupTopics("dog training", [
      ["dog training tips", "dog training schedule", "dog training casino"],
      ["dog training tips", "how to start dog training"],
      ["dog training tips"],
    ]);
    expect(g.idea[0]).toEqual({ keyword: "dog training tips", kind: "idea", popularity: 5 });
    expect(g.question[0]?.keyword).toBe("how to start dog training");
    expect(JSON.stringify(g)).not.toContain("casino");
    expect(g.total).toBe(3);
  });

  it("stops asking Google after a refusal", async () => {
    let calls = 0;
    const lists = await fetchTopicLists("dog training", async () => {
      calls += 1;
      return new Response("", { status: 429 });
    });
    expect(lists).toEqual([]);
    expect(calls).toBe(3);
  });
});

describe("SEO post grader", () => {
  it("matches keywords by their meaningful words", () => {
    expect(containsKeyword("How to Speed Up Your WordPress Site", "speed up wordpress")).toBe(true);
    expect(containsKeyword("WordPress hosting guide", "speed up wordpress")).toBe(false);
  });

  it("finds what the sample draft is missing", () => {
    const g = gradePost(SAMPLE_DRAFT, "speed up wordpress");
    const status = Object.fromEntries(g.checks.map((c) => [c.id, c.status]));
    expect(status["keyword-title"]).toBe("pass");
    expect(status.faq).toBe("fail");
    expect(status.length).toBe("fail");
    expect(g.score).toBeGreaterThan(0);
    expect(g.score).toBeLessThan(60);
  });

  it("scores a complete post highly", () => {
    const section = (n: number) =>
      `## Step ${n}\n\n${"Speed up WordPress by fixing one thing at a time and measuring the result. ".repeat(14)}\n\n- one\n- two\n`;
    const draft = `# How to Speed Up WordPress in 2026\n\nTo speed up WordPress, measure first and fix caching. See [our guide](/guide) and [Google's docs](https://web.dev).\n\n${[1, 2, 3, 4].map(section).join("\n")}\n## FAQ\n\n### Why is WordPress slow?\n\nUsually heavy pages.`;
    expect(gradePost(draft, "speed up wordpress").score).toBeGreaterThanOrEqual(85);
  });

  it("is zero for an empty draft", () => {
    expect(gradePost("", "anything").score).toBe(0);
  });
});
