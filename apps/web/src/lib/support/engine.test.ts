import { describe, expect, it } from "vitest";
import type { SupportArticle } from "@/config/support-kb/types";
import { createSupportEngine, detectSmallTalk } from "./engine";
import { editDistance, normalizeText, stem, terms } from "./text";

const article = (id: string, category: SupportArticle["category"], title: string, questions: string[]): SupportArticle => ({
  id,
  category,
  title,
  questions,
  answer: `${title}.`,
});

const KB: SupportArticle[] = [
  article("start-add-website", "getting-started", "How do I add a website?", [
    "add a website",
    "how to add my site",
    "add new website to monitor",
    "where do I put my website url",
    "start monitoring a site",
  ]),
  article("wp-connect", "wordpress", "How do I connect the WordPress plugin?", [
    "connect wordpress plugin",
    "link my wordpress site",
    "install the wordpress plugin",
    "wordpress plugin setup",
  ]),
  article("billing-cancel", "billing", "How do I cancel my subscription?", [
    "cancel my subscription",
    "stop paying",
    "how to cancel plan",
    "end my membership",
  ]),
  article("change-false-positive", "changes-alerts", "Why did I get an alert for a change I didn't make?", [
    "false alert",
    "alert but nothing changed",
    "too many alerts for dynamic content",
    "ignore rotating banner",
  ]),
];

const engine = createSupportEngine(KB);

describe("text", () => {
  it("rewrites common phrasings", () => {
    expect(normalizeText("WP plug-in")).toBe("wordpress plugin");
    expect(normalizeText("I can't sign in")).toBe("i cant login");
  });

  it("drops stopwords and stems", () => {
    expect(terms("How do I add my sites?")).toEqual(["add", "website"]);
    expect(terms("snooze the alarms")).toEqual(["mute", "alert"]);
    expect(stem("scanning")).toBe("scann");
    expect(stem("member")).toBe("member");
    expect(stem("pages")).toBe("page");
    expect(stem("404")).toBe("404");
  });

  it("measures edit distance with transpositions", () => {
    expect(editDistance("wordpress", "wordpress", 2)).toBe(0);
    expect(editDistance("wrodpress", "wordpress", 2)).toBe(1);
    expect(editDistance("abc", "xyz123", 2)).toBe(3);
  });
});

describe("support engine", () => {
  it("answers a direct question", () => {
    const reply = engine.ask("How can I add my website?");
    expect(reply.kind).toBe("answer");
    expect(reply.kind === "answer" && reply.article.id).toBe("start-add-website");
  });

  it("understands synonyms and typos", () => {
    const wp = engine.ask("how to conect wp plugin");
    expect(wp.kind === "answer" && wp.article.id).toBe("wp-connect");
    const cancel = engine.ask("i want to quit my plan");
    expect(cancel.kind === "answer" && cancel.article.id).toBe("billing-cancel");
  });

  it("hands over instead of guessing", () => {
    expect(engine.ask("what is the airspeed velocity of an unladen swallow").kind).toBe("fallback");
  });

  it("handles small talk", () => {
    expect(engine.ask("hi")).toEqual({ kind: "smalltalk", intent: "greeting" });
    expect(engine.ask("thanks!")).toEqual({ kind: "smalltalk", intent: "thanks" });
    expect(engine.ask("can I talk to a human")).toEqual({ kind: "smalltalk", intent: "human" });
  });

  it("finds articles by id", () => {
    expect(engine.get("billing-cancel")?.title).toBe("How do I cancel my subscription?");
    expect(engine.get("nope")).toBeUndefined();
  });
});

describe("detectSmallTalk", () => {
  it("leaves real questions alone", () => {
    expect(detectSmallTalk("how do I add a website")).toBeNull();
    expect(detectSmallTalk("can a real person review every alert my team gets each week")).toBeNull();
  });
});
