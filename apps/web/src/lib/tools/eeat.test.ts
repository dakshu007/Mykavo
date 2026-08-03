import { describe, expect, it } from "vitest";
import { analyzeEeat, extractEeatFacts, type EeatAuxSignals } from "./eeat";

const AUX_ALL: EeatAuxSignals = { aboutPage: true, contactPage: true, privacyPage: true, termsPage: true };
const AUX_NONE: EeatAuxSignals = { aboutPage: false, contactPage: false, privacyPage: false, termsPage: false };

const STRONG_PAGE = `<!doctype html><html lang="en"><head>
  <title>How we tested 12 running shoes over 400 miles</title>
  <meta name="description" content="Our hands-on running shoe test: 400 miles, 12 shoes, one clear winner.">
  <meta name="author" content="Priya Raman">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    datePublished: "2026-07-01",
    dateModified: "2026-08-01",
    author: { "@type": "Person", name: "Priya Raman" },
    publisher: { "@type": "Organization", name: "RunLab", logo: "https://runlab.example/logo.png", sameAs: ["https://linkedin.com/company/runlab", "https://x.com/runlab"] },
  })}</script>
  </head><body>
  <article>
    <p class="byline">By Priya Raman - certified running coach with 10 years of experience. Medically reviewed by Dr. K. Ade.</p>
    <time datetime="2026-08-01">Updated August 1, 2026</time>
    <h2>How we tested</h2>
    <p>We tested each shoe personally over four weeks. In my experience the cushioning claims rarely survive 100 miles, so we measured midsole compression ourselves. ${"solid detail sentence goes right here. ".repeat(120)}</p>
    <h2>Results</h2>
    <p>Full data below, with sources from <a href="https://pubmed.example.org/study">this study</a> and <a href="https://runrepeat.example.com/data">independent lab data</a>.</p>
    <img src="/wear-test.jpg" alt="Midsole wear after 400 miles">
    <img src="/lab-rig.jpg" alt="Our compression testing rig">
  </article>
  <footer>© 2026 RunLab Media Ltd. <a href="/about">About</a> <a href="/contact">Contact</a> <a href="/privacy">Privacy</a> <a href="/terms">Terms</a> <a href="mailto:hi@runlab.example">hi@runlab.example</a></footer>
  </body></html>`;

const WEAK_PAGE = `<html><head></head><body><p>Lorem ipsum dolor sit amet, welcome to page.</p><form action="http://pay.example.com/go"><input></form></body></html>`;

describe("analyzeEeat on a strong page", () => {
  const report = analyzeEeat("https://runlab.example/shoes", STRONG_PAGE, AUX_ALL);

  it("passes every check and rates Excellent", () => {
    const failures = report.checks.filter((c) => c.status !== "pass");
    expect(failures.map((c) => c.id)).toEqual([]);
    expect(report.overall).toBe(100);
    expect(report.rating).toBe("Excellent");
    expect(Object.values(report.pillars).every((p) => p === 100)).toBe(true);
  });

  it("identifies the author and organization by name", () => {
    expect(report.checks.find((c) => c.id === "author-byline")?.detail).toContain("Priya Raman");
    expect(report.checks.find((c) => c.id === "entity-schema")?.detail).toContain("RunLab");
  });
});

describe("analyzeEeat on a weak page", () => {
  const report = analyzeEeat("http://weak.example/", WEAK_PAGE, AUX_NONE);

  it("fails the load-bearing signals", () => {
    const failed = report.checks.filter((c) => c.status === "fail").map((c) => c.id);
    for (const expected of [
      "https", "contact-info", "privacy-policy", "no-placeholder", "secure-embeds",
      "author-byline", "entity-schema", "about-page", "visible-dates", "content-depth",
    ]) {
      expect(failed).toContain(expected);
    }
    expect(report.rating).toBe("Poor");
    expect(report.overall).toBeLessThan(25);
  });

  it("sorts failures before warnings before passes", () => {
    const order = { fail: 0, warn: 1, pass: 2 } as const;
    const sequence = report.checks.map((c) => order[c.status]);
    expect([...sequence].sort((a, b) => a - b)).toEqual(sequence);
  });
});

describe("trust weighting and partial credit", () => {
  it("weights trust double in the overall score", () => {
    // Same pillar scores except trust => overall must move twice as much.
    const base = analyzeEeat("https://runlab.example/x", STRONG_PAGE, AUX_ALL);
    const noPrivacy = analyzeEeat("https://runlab.example/x", STRONG_PAGE, { ...AUX_ALL, privacyPage: false });
    const trustDrop = base.pillars.TRUST - noPrivacy.pillars.TRUST;
    expect(trustDrop).toBeGreaterThan(0);
    expect(base.overall - noPrivacy.overall).toBe(Math.round((base.pillars.EXPERIENCE + base.pillars.EXPERTISE + base.pillars.AUTHORITATIVENESS + base.pillars.TRUST * 2) / 5) - Math.round((noPrivacy.pillars.EXPERIENCE + noPrivacy.pillars.EXPERTISE + noPrivacy.pillars.AUTHORITATIVENESS + noPrivacy.pillars.TRUST * 2) / 5));
  });

  it("gives warn half credit (mailto counts as contact without a contact page)", () => {
    const withMailto = analyzeEeat("https://runlab.example/x", STRONG_PAGE, { ...AUX_ALL, contactPage: false });
    expect(withMailto.checks.find((c) => c.id === "contact-info")?.status).toBe("pass");
  });
});

describe("extractEeatFacts", () => {
  const facts = extractEeatFacts("https://runlab.example/shoes", STRONG_PAGE);

  it("detects linked trust pages so probes can be skipped", () => {
    expect(facts.linkedPages).toEqual({ aboutPage: true, contactPage: true, privacyPage: true, termsPage: true });
  });

  it("counts citations and social separately", () => {
    expect(facts.externalContentLinks).toBe(2);
    expect(facts.schemaSameAs).toBe(2);
  });

  it("is deterministic - same HTML, same result", () => {
    const again = analyzeEeat("https://runlab.example/shoes", STRONG_PAGE, AUX_ALL);
    expect(again).toEqual(analyzeEeat("https://runlab.example/shoes", STRONG_PAGE, AUX_ALL));
  });
});
