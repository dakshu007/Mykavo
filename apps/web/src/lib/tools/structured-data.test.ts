import { describe, expect, it } from "vitest";
import {
  buildStructuredDataReport,
  contextIsSchemaOrg,
  detectMicrodataAndRdfa,
  extractJsonLdTexts,
  richResultsTestUrl,
  shortType,
} from "./structured-data";

const base = { url: "https://e.com/", finalUrl: "https://e.com/", httpStatus: 200 };
const ld = (v: unknown) => `<script type="application/ld+json">${JSON.stringify(v)}</script>`;
const report = (html: string) => buildStructuredDataReport({ ...base, html });

describe("structured data", () => {
  it("finds JSON-LD blocks by type attribute, skipping comments and other scripts", () => {
    const html = `<script type='application/ld+json; charset=utf-8'>{"a":1}</script><script>var x</script><!-- <script type="application/ld+json">{}</script> --><SCRIPT TYPE="Application/LD+JSON">[]</SCRIPT>`;
    expect(extractJsonLdTexts(html)).toEqual(['{"a":1}', "[]"]);
  });

  it("reports invalid JSON with the parse message and keeps going", () => {
    const r = report(`<script type="application/ld+json">{"@type": "Thing",}</script>${ld({ "@context": "https://schema.org", "@type": "WebSite", name: "E", url: "https://e.com" })}`);
    expect(r.jsonLd.blocks[0].valid).toBe(false);
    expect(r.jsonLd.blocks[0].error).toMatch(/JSON/);
    expect(r.jsonLd.blocks[1].valid).toBe(true);
    expect(r.jsonLd.entities).toHaveLength(1);
    expect(r.jsonLd.entities[0].status).toBe("ok");
    expect(r.summary).toMatchObject({ errors: 1, invalidBlocks: 1 });
  });

  it("expands arrays and @graph, inheriting the wrapper @context", () => {
    const r = report(
      ld({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "Organization", "@id": "#org", name: "Acme", url: "https://e.com", logo: "https://e.com/l.png" },
          { "@type": "WebSite", name: "Acme", url: "https://e.com" },
        ],
      }) + ld([{ "@context": "http://schema.org/", "@type": "BreadcrumbList", itemListElement: [] }]),
    );
    expect(r.jsonLd.entities.map((e) => [e.shortTypes[0], e.fromGraph, e.status])).toEqual([
      ["Organization", true, "ok"],
      ["WebSite", true, "ok"],
      ["BreadcrumbList", false, "error"],
    ]);
    expect(r.jsonLd.entities[0].id).toBe("#org");
  });

  it("flags missing @context, non-schema.org context and missing @type", () => {
    const [noCtx, other, noType] = report(ld([{ "@type": "Thing" }, { "@context": "https://example.org/vocab", "@type": "Thing" }, { "@context": "https://schema.org", name: "x" }])).jsonLd.entities;
    expect(noCtx.status).toBe("error");
    expect(noCtx.issues[0].message).toContain("@context");
    expect(other.status).toBe("warning");
    expect(noType.issues[0].message).toContain("@type");
    expect(contextIsSchemaOrg({ "@vocab": "https://schema.org/" })).toBe(true);
    expect(contextIsSchemaOrg(["https://schema.org", { x: "y" }])).toBe(true);
  });

  it("checks Product offers and the offers/review alternative", () => {
    const ok = report(ld({ "@context": "https://schema.org", "@type": "Product", name: "Mug", offers: { "@type": "Offer", price: "12.00", priceCurrency: "USD", availability: "https://schema.org/InStock" } }));
    expect(ok.jsonLd.entities[0].status).toBe("ok");
    const bad = report(ld({ "@context": "https://schema.org", "@type": "Product", name: "Mug", offers: [{ "@type": "Offer", price: 5 }] })).jsonLd.entities[0];
    expect(bad.status).toBe("error");
    expect(bad.checks.find((c) => c.property === "offers.priceCurrency")?.ok).toBe(false);
    const none = report(ld({ "@context": "https://schema.org", "@type": "Product", name: "Mug" })).jsonLd.entities[0];
    expect(none.checks.find((c) => c.property === "offers, review or aggregateRating")?.ok).toBe(false);
    const reviewed = report(ld({ "@context": "https://schema.org", "@type": "Product", name: "Mug", aggregateRating: { ratingValue: 4 } })).jsonLd.entities[0];
    expect(reviewed.status).toBe("ok");
  });

  it("checks Article, FAQPage, BreadcrumbList, LocalBusiness, Event and VideoObject", () => {
    const entities = report(
      ld([
        { "@context": "https://schema.org", "@type": "BlogPosting", headline: "H", author: { "@type": "Person" } },
        { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Q?", acceptedAnswer: { "@type": "Answer", text: "A" } }, { "@type": "Question", name: "Q2" }] },
        { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ position: 1, name: "Home", item: "https://e.com/" }, { position: 2, name: "Here" }] },
        { "@context": "https://schema.org", "@type": "Dentist", name: "Smile" },
        { "@context": "https://schema.org", "@type": "MusicEvent", name: "Gig", startDate: "2026-11-01", location: { "@type": "Place", name: "Hall" } },
        { "@context": "https://schema.org", "@type": "VideoObject", name: "V", thumbnailUrl: "t.jpg", uploadDate: "2026-01-01", description: "d" },
      ]),
    ).jsonLd.entities;
    const [article, faq, crumbs, dentist, event, video] = entities;
    expect(article.status).toBe("warning");
    expect(article.checks.filter((c) => !c.ok).map((c) => c.property)).toEqual(["image", "datePublished", "author.name"]);
    expect(faq.status).toBe("error");
    expect(faq.checks.find((c) => c.property === "mainEntity.acceptedAnswer.text")?.detail).toContain("1 question");
    expect(faq.issues.some((i) => i.level === "info")).toBe(true);
    expect(crumbs.status).toBe("ok");
    expect(dentist.checkedAs).toEqual(["LocalBusiness"]);
    expect(dentist.checks.find((c) => c.property === "address")?.ok).toBe(false);
    expect(event.status).toBe("ok");
    expect(video.status).toBe("ok");
  });

  it("summarizes properties without dumping nested objects", () => {
    const [e] = report(ld({ "@context": "https://schema.org", "@type": "Product", name: "Mug", offers: { "@type": "Offer", price: 1, priceCurrency: "USD" }, sku: 42, image: ["a.jpg", "b.jpg"] })).jsonLd.entities;
    expect(Object.fromEntries(e.properties.map((p) => [p.key, p.value]))).toEqual({
      name: "Mug",
      offers: "Offer",
      sku: "42",
      image: "a.jpg, b.jpg",
    });
  });

  it("counts microdata and RDFa with their types", () => {
    const html = `<div itemscope itemtype="https://schema.org/Product"><span itemprop="name">x</span><div itemprop="offers" itemscope itemtype="http://schema.org/Offer"></div></div><div vocab="https://schema.org/" typeof="Person"></div><span data-typeof="x"></span><p class="itemscope">no</p>`;
    const r = detectMicrodataAndRdfa(html);
    expect(r.microdata).toEqual({ count: 2, types: [{ type: "Offer", count: 1 }, { type: "Product", count: 1 }] });
    expect(r.rdfa).toEqual({ count: 1, types: [{ type: "Person", count: 1 }], vocabs: ["https://schema.org/"] });
  });

  it("normalizes type names and builds the Rich Results Test link", () => {
    expect(shortType("http://schema.org/Product")).toBe("Product");
    expect(shortType("schema:NewsArticle")).toBe("NewsArticle");
    expect(richResultsTestUrl("https://e.com/a?b=1")).toBe("https://search.google.com/test/rich-results?url=https%3A%2F%2Fe.com%2Fa%3Fb%3D1");
  });
});
