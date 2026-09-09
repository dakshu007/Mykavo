import { describe, expect, it } from "vitest";
import {
  FEATURE_LIST,
  blogIndexGraph,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
  softwareApplicationNode,
} from "./structured-data";
import { plans } from "@/config/plans";

describe("jsonLdScript", () => {
  it("escapes < so a payload cannot break out of its script tag", () => {
    const out = jsonLdScript({ evil: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c");
  });

  it("still parses back to the original object", () => {
    const payload = { a: 1, b: "two" };
    expect(JSON.parse(jsonLdScript(payload))).toEqual(payload);
  });
});

describe("faqPage", () => {
  it("emits one Question per item with its answer attached", () => {
    const schema = faqPage([{ q: "Is it free?", a: "There is a free plan." }]);
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(1);
    expect(schema.mainEntity[0]).toMatchObject({
      "@type": "Question",
      name: "Is it free?",
      acceptedAnswer: { "@type": "Answer", text: "There is a free plan." },
    });
  });
});

describe("breadcrumbList", () => {
  it("prepends Home and numbers positions from 1", () => {
    const schema = breadcrumbList([
      { name: "Blog", path: "/blog" },
      { name: "A post", path: "/blog/a-post" },
    ]);
    expect(schema.itemListElement.map((i) => i.name)).toEqual(["Home", "Blog", "A post"]);
    expect(schema.itemListElement.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(schema.itemListElement[0].item).not.toMatch(/\/$/);
  });

  it("builds absolute URLs", () => {
    const schema = breadcrumbList([{ name: "Pricing", path: "/pricing" }]);
    expect(schema.itemListElement[1].item).toMatch(/^https?:\/\/.+\/pricing$/);
  });
});

describe("softwareApplicationNode", () => {
  it("prices every plan from config/plans, never a hardcoded number", () => {
    const node = softwareApplicationNode({
      offers: plans.map((p) => ({
        name: p.name,
        priceUsd: p.priceMonthlyUsd,
        description: p.headline,
      })),
      featureList: FEATURE_LIST,
    });
    expect(node.offers).toHaveLength(plans.length);
    for (const [index, plan] of plans.entries()) {
      expect(node.offers[index].price).toBe(String(plan.priceMonthlyUsd));
      expect(node.offers[index].priceCurrency).toBe("USD");
    }
  });
});

describe("FEATURE_LIST", () => {
  /**
   * Guards the exact drift that let a shipped week of features go unmentioned
   * in the metadata that search and AI answer engines read. If a capability
   * ships, it belongs here - this test is the reminder.
   */
  it("covers every shipped capability surface", () => {
    for (const capability of [
      "Website change detection",
      "Visual regression",
      "SEO change monitoring",
      "Technical SEO site audit",
      "Google Search Console integration",
      "E-E-A-T",
      "Broken link monitoring",
      "Third-party script monitoring",
      "Performance regression monitoring",
      "Lighthouse",
      "Uptime and SSL monitoring",
      "Conversion element monitoring",
      "White-label client reports",
    ]) {
      expect(FEATURE_LIST).toContain(capability);
    }
  });
});

describe("organizationNode", () => {
  it("is addressable by @id so other nodes can reference one publisher", () => {
    expect(organizationNode()["@id"]).toMatch(/#organization$/);
  });
});

describe("blogIndexGraph", () => {
  it("lists every post in order with absolute URLs", () => {
    const graph = blogIndexGraph([
      { slug: "first", title: "First", publishedAt: new Date("2026-01-01") },
      { slug: "second", title: "Second", publishedAt: new Date("2026-02-01") },
    ]);
    const list = graph["@graph"][1] as { itemListElement: Array<Record<string, unknown>> };
    expect(list.itemListElement).toHaveLength(2);
    expect(list.itemListElement[0]).toMatchObject({ position: 1, name: "First" });
    expect(String(list.itemListElement[1].url)).toMatch(/\/blog\/second$/);
  });

  it("handles an empty blog without emitting a broken list", () => {
    const graph = blogIndexGraph([]);
    const list = graph["@graph"][1] as { itemListElement: unknown[] };
    expect(list.itemListElement).toEqual([]);
  });
});
