import { describe, expect, it } from "vitest";
import { compareForCompetitor } from "./competitor";
import type { PageToolSnapshot, ScriptInfo } from "./snapshot";

function script(domain: string, service: string | null): ScriptInfo {
  return { src: `https://${domain}/a.js`, domain, isThirdParty: true, service };
}

function snap(partial: Partial<PageToolSnapshot> = {}): PageToolSnapshot {
  return {
    url: "https://a.test/",
    finalUrl: "https://a.test/",
    fetchedAt: new Date().toISOString(),
    httpStatus: 200,
    responseTimeMs: 300,
    redirectChain: [],
    pageWeightBytes: 100_000,
    title: "A".repeat(45),
    metaDescription: "D".repeat(140),
    canonicalUrl: "https://a.test/",
    robotsMeta: null,
    h1Values: ["One"],
    internalLinkCount: 20,
    externalLinkCount: 4,
    scripts: [],
    ...partial,
  };
}

const row = (r: ReturnType<typeof compareForCompetitor>, label: string) =>
  r.rows.find((x) => x.label === label)!;

describe("compareForCompetitor - search visibility", () => {
  it("awards the title row to whoever is inside the ideal band", () => {
    const r = compareForCompetitor(snap(), snap({ title: "T".repeat(120) }));
    expect(row(r, "Title tag").verdict).toBe("you");
    expect(row(r, "Title tag").them).toContain("long");
  });

  it("calls a missing title what it is", () => {
    const r = compareForCompetitor(snap({ title: null }), snap());
    expect(row(r, "Title tag").you).toBe("Missing");
    expect(row(r, "Title tag").verdict).toBe("them");
  });

  // The single most valuable thing this tool can surface about a rival.
  it("flags a competitor page that is noindexed", () => {
    const r = compareForCompetitor(snap(), snap({ robotsMeta: "noindex, follow" }));
    expect(row(r, "Indexable by Google").them).toBe("No - noindex");
    expect(row(r, "Indexable by Google").verdict).toBe("you");
  });

  it("treats an index directive as indexable", () => {
    const r = compareForCompetitor(snap({ robotsMeta: "index, follow" }), snap());
    expect(row(r, "Indexable by Google").verdict).toBe("tie");
  });

  it("scores redirect hops exactly, with no tolerance", () => {
    const r = compareForCompetitor(
      snap(),
      snap({ redirectChain: [{ url: "https://b.test", status: 301 }] }),
    );
    expect(row(r, "Redirect hops").verdict).toBe("you");
  });
});

describe("compareForCompetitor - speed and weight", () => {
  it("gives the lighter page the win", () => {
    const r = compareForCompetitor(snap({ pageWeightBytes: 50_000 }), snap({ pageWeightBytes: 400_000 }));
    expect(row(r, "Page weight (HTML)").verdict).toBe("you");
  });

  // One request is a noisy measurement; a 5% gap is not a finding.
  it("ties on response times that are close enough to be noise", () => {
    const r = compareForCompetitor(snap({ responseTimeMs: 300 }), snap({ responseTimeMs: 330 }));
    expect(row(r, "Server response").verdict).toBe("tie");
  });

  it("still calls a genuinely slower server", () => {
    const r = compareForCompetitor(snap({ responseTimeMs: 200 }), snap({ responseTimeMs: 1400 }));
    expect(row(r, "Server response").verdict).toBe("you");
  });
});

describe("compareForCompetitor - content", () => {
  it("wants exactly one H1 - zero and five are both wrong", () => {
    const one = compareForCompetitor(snap({ h1Values: ["a"] }), snap({ h1Values: [] }));
    expect(row(one, "H1 heading").verdict).toBe("you");
    const many = compareForCompetitor(snap({ h1Values: ["a"] }), snap({ h1Values: ["a", "b", "c"] }));
    expect(row(many, "H1 heading").verdict).toBe("you");
  });

  // More internal links is not automatically better, so it is shown, not scored.
  it("reports link counts without declaring a winner", () => {
    const r = compareForCompetitor(snap({ internalLinkCount: 3 }), snap({ internalLinkCount: 300 }));
    expect(row(r, "Internal links").verdict).toBe("info");
    expect(r.score.you + r.score.them + r.score.tie).toBeLessThan(r.rows.length);
  });
});

describe("compareForCompetitor - technology", () => {
  it("names the services on each page", () => {
    const r = compareForCompetitor(
      snap({ scripts: [script("googletagmanager.com", "Google Tag Manager")] }),
      snap({ scripts: [script("js.stripe.com", "Stripe"), script("hotjar.com", "Hotjar")] }),
    );
    expect(row(r, "Recognised services").them).toBe("Hotjar, Stripe");
  });

  // The genuinely interesting output: what they run that you do not.
  it("reports what the competitor uses and you do not", () => {
    const r = compareForCompetitor(
      snap({ scripts: [script("googletagmanager.com", "Google Tag Manager")] }),
      snap({
        scripts: [
          script("googletagmanager.com", "Google Tag Manager"),
          script("hotjar.com", "Hotjar"),
        ],
      }),
    );
    expect(r.theirExtraServices).toEqual(["Hotjar"]);
    expect(r.yourExtraServices).toEqual([]);
  });

  it("says so plainly when nothing is recognised", () => {
    const r = compareForCompetitor(snap(), snap());
    expect(row(r, "Recognised services").you).toBe("None detected");
  });

  it("ignores unidentified scripts rather than listing raw domains", () => {
    const r = compareForCompetitor(snap({ scripts: [script("cdn.unknown.test", null)] }), snap());
    expect(row(r, "Recognised services").you).toBe("None detected");
  });
});

describe("compareForCompetitor - scoring", () => {
  it("counts wins per side and ignores info rows", () => {
    const r = compareForCompetitor(snap(), snap());
    expect(r.score.you).toBe(0);
    expect(r.score.them).toBe(0);
    expect(r.score.tie).toBeGreaterThan(0);
  });

  it("adds up to the number of scored rows", () => {
    const r = compareForCompetitor(snap({ title: null }), snap({ pageWeightBytes: 900_000 }));
    const scored = r.rows.filter((x) => x.verdict !== "info").length;
    expect(r.score.you + r.score.them + r.score.tie).toBe(scored);
  });
});
