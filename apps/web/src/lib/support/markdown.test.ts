import { describe, expect, it } from "vitest";
import { answerToPlainText, parseAnswer, parseInline, safeHref, wordCount } from "./markdown";

describe("parseInline", () => {
  it("reads bold, code and links", () => {
    expect(parseInline("Open **Billing** then `Settings` or [pricing](/pricing).")).toEqual([
      { type: "text", text: "Open " },
      { type: "bold", text: "Billing" },
      { type: "text", text: " then " },
      { type: "code", text: "Settings" },
      { type: "text", text: " or " },
      { type: "link", text: "pricing", href: "/pricing" },
      { type: "text", text: "." },
    ]);
  });

  it("keeps the label but drops unsafe link targets", () => {
    expect(parseInline("[x](javascript:void)")).toEqual([{ type: "text", text: "x" }]);
    expect(parseInline("[x](//evil.example)")).toEqual([{ type: "text", text: "x" }]);
  });
});

describe("safeHref", () => {
  it("allows site paths, https and mailto only", () => {
    expect(safeHref("/dashboard")).toBe("/dashboard");
    expect(safeHref("https://wordpress.org/plugins/mykavo/")).toBe("https://wordpress.org/plugins/mykavo/");
    expect(safeHref("mailto:support@mykavo.app")).toBe("mailto:support@mykavo.app");
    expect(safeHref("http://example.com")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
  });
});

describe("parseAnswer", () => {
  it("splits paragraphs, bullets and steps", () => {
    const blocks = parseAnswer("Intro line\ncontinues.\n\n- one\n- two\n\n1. first\n2. second\n\nEnd.");
    expect(blocks.map((b) => b.type)).toEqual(["p", "ul", "ol", "p"]);
    expect(blocks[0]).toEqual({ type: "p", content: [{ type: "text", text: "Intro line continues." }] });
    expect(blocks[1].type === "ul" && blocks[1].items.length).toBe(2);
  });

  it("starts a list right after a paragraph line", () => {
    expect(parseAnswer("To do it:\n- a\n- b").map((b) => b.type)).toEqual(["p", "ul"]);
  });
});

describe("plain text", () => {
  it("flattens markup for the mailto and schema", () => {
    expect(answerToPlainText("See **Billing**.\n\n- [Pricing](/pricing)")).toBe("See Billing.\n\n- Pricing");
    expect(wordCount("See **Billing** now.\n\n1. one two")).toBe(6);
  });
});
