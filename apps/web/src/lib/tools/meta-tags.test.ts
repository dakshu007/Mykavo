import { describe, expect, it } from "vitest";
import {
  buildMetaChecklist,
  evaluateH1,
  evaluateMetaDescription,
  evaluateRobotsMeta,
  evaluateTitle,
  extractMetaTags,
} from "./meta-tags";

const HTML = `<!doctype html>
<html>
<head>
  <title>Aurora Outdoor - Tents &amp; Camping Gear for Serious Hikers</title>
  <meta name="description" content="Quality tents and camping gear.">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="Aurora Outdoor">
  <meta property="og:image" content="https://aurora-outdoor.com/og.png">
  <link rel="canonical" href="https://aurora-outdoor.com/">
</head>
<body>
  <h1>Aurora <b>Outdoor</b></h1>
</body>
</html>`;

describe("extractMetaTags", () => {
  const tags = extractMetaTags(HTML);

  it("extracts core SEO tags with entity decoding", () => {
    expect(tags.title).toBe("Aurora Outdoor - Tents & Camping Gear for Serious Hikers");
    expect(tags.metaDescription).toBe("Quality tents and camping gear.");
    expect(tags.canonicalUrl).toBe("https://aurora-outdoor.com/");
    expect(tags.robotsMeta).toBe("index, follow");
  });

  it("extracts Open Graph tags and reports missing ones as null", () => {
    expect(tags.ogTitle).toBe("Aurora Outdoor");
    expect(tags.ogImage).toBe("https://aurora-outdoor.com/og.png");
    expect(tags.ogDescription).toBeNull();
  });

  it("counts H1s and strips inline tags from values", () => {
    expect(tags.h1Count).toBe(1);
    expect(tags.h1Values).toEqual(["Aurora Outdoor"]);
  });

  it("caps h1Values at 5 while counting all of them", () => {
    const many = extractMetaTags("<h1>a</h1><h1>b</h1><h1>c</h1><h1>d</h1><h1>e</h1><h1>f</h1>");
    expect(many.h1Count).toBe(6);
    expect(many.h1Values).toHaveLength(5);
  });
});

describe("evaluateTitle (50–60 guidance)", () => {
  it("fails when missing", () => {
    expect(evaluateTitle(null).status).toBe("fail");
    expect(evaluateTitle(null).detail).toContain("Missing");
  });

  it("warns when shorter than 50 characters", () => {
    const check = evaluateTitle("Short title");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("11 characters");
    expect(check.detail).toContain("50–60");
  });

  it("passes between 50 and 60 characters inclusive", () => {
    expect(evaluateTitle("x".repeat(50)).status).toBe("pass");
    expect(evaluateTitle("x".repeat(60)).status).toBe("pass");
  });

  it("warns when longer than 60 characters", () => {
    const check = evaluateTitle("x".repeat(61));
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("truncate");
  });
});

describe("evaluateMetaDescription (120–160 guidance)", () => {
  it("fails when missing", () => {
    expect(evaluateMetaDescription(null).status).toBe("fail");
  });

  it("warns when shorter than 120 characters", () => {
    const check = evaluateMetaDescription("Too short.");
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("120–160");
  });

  it("passes between 120 and 160 characters inclusive", () => {
    expect(evaluateMetaDescription("x".repeat(120)).status).toBe("pass");
    expect(evaluateMetaDescription("x".repeat(160)).status).toBe("pass");
  });

  it("warns when longer than 160 characters", () => {
    expect(evaluateMetaDescription("x".repeat(161)).status).toBe("warn");
  });
});

describe("evaluateRobotsMeta", () => {
  it("passes when absent (defaults to index, follow)", () => {
    expect(evaluateRobotsMeta(null).status).toBe("pass");
  });

  it("fails on noindex", () => {
    expect(evaluateRobotsMeta("noindex, nofollow").status).toBe("fail");
  });

  it("warns on nofollow without noindex", () => {
    expect(evaluateRobotsMeta("index, nofollow").status).toBe("warn");
  });
});

describe("evaluateH1", () => {
  it("fails with zero H1s", () => {
    expect(evaluateH1(0, []).status).toBe("fail");
  });

  it("passes with exactly one H1", () => {
    expect(evaluateH1(1, ["Hello"]).status).toBe("pass");
  });

  it("warns with multiple H1s", () => {
    const check = evaluateH1(3, ["a", "b", "c"]);
    expect(check.status).toBe("warn");
    expect(check.detail).toContain("3");
  });
});

describe("buildMetaChecklist", () => {
  it("produces the full ordered checklist", () => {
    const checks = buildMetaChecklist(extractMetaTags(HTML));
    expect(checks.map((c) => c.id)).toEqual([
      "title",
      "meta-description",
      "canonical",
      "robots",
      "h1",
      "og-title",
      "og-description",
      "og-image",
    ]);
    // og:description is missing in the fixture → warn
    expect(checks.find((c) => c.id === "og-description")?.status).toBe("warn");
    expect(checks.find((c) => c.id === "og-image")?.status).toBe("pass");
  });
});
