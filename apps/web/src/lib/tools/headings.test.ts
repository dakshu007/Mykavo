import { describe, expect, it } from "vitest";
import { buildHeadingsReport, compareTitleAndH1, extractHeadings, extractTitle, MAX_HEADINGS } from "./headings";

const base = { url: "https://e.com/", finalUrl: "https://e.com/", httpStatus: 200 };
const ids = (html: string) => buildHeadingsReport({ ...base, html }).issues.map((i) => i.id);

describe("headings", () => {
  it("extracts h1-h6 in document order and strips nested markup", () => {
    const html = `<h1 class="x">Hello <em>world</em></h1><p>x</p><h2><a href="/a"><span>Pricing</span>&amp; plans</a></h2><H3>Deep</H3>`;
    const { headings, counts, total } = extractHeadings(html);
    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [1, "Hello world"],
      [2, "Pricing & plans"],
      [3, "Deep"],
    ]);
    expect(counts).toEqual({ 1: 1, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0 });
    expect(total).toBe(3);
  });

  it("ignores headings in script, style, template, noscript and comments", () => {
    const html = `<script>var s = "<h1>no</h1>";</script><style>h1{}</style><template><h2>no</h2></template><noscript><h2>no</h2></noscript><!-- <h1>no</h1> --><h1>yes</h1>`;
    expect(extractHeadings(html).headings.map((h) => h.text)).toEqual(["yes"]);
  });

  it("closes an open heading when another starts, like a browser", () => {
    const { headings } = extractHeadings(`<h2>Outer<h3>Inner</h3></h2>`);
    expect(headings.map((h) => [h.level, h.text])).toEqual([
      [2, "Outer"],
      [3, "Inner"],
    ]);
  });

  it("uses image alt text for image-only headings and flags truly empty ones", () => {
    const { headings } = extractHeadings(`<h1><img src="l.png" alt="Acme logo"></h1><h2>  </h2>`);
    expect(headings[0]).toMatchObject({ text: "Acme logo", fromAlt: true, empty: false });
    expect(headings[1]).toMatchObject({ empty: true });
  });

  it("flags skipped levels, long headings, empty headings, no H1 and multiple H1s", () => {
    const report = buildHeadingsReport({ ...base, html: `<h2>A</h2><h4>B</h4><h5></h5><h3>${"x".repeat(80)}</h3>` });
    expect(report.headings[1].skippedFrom).toBe(2);
    expect(report.headings[3].tooLong).toBe(true);
    expect(report.issues.map((i) => i.id)).toEqual(["no-h1", "empty", "skipped-level", "long"]);
    expect(ids(`<h1>a</h1><h1>b</h1>`)).toEqual(["multiple-h1"]);
    expect(buildHeadingsReport({ ...base, html: `<h1>a</h1><h1>b</h1>` }).issues[0].severity).toBe("info");
    expect(ids(`<p>nothing</p>`)).toEqual(["no-headings"]);
    expect(ids(`<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>`)).toEqual([]);
  });

  it("caps the outline but counts every heading", () => {
    const report = buildHeadingsReport({ ...base, html: "<h1>T</h1>" + "<h2>x</h2>".repeat(MAX_HEADINGS + 10) });
    expect(report.headings).toHaveLength(MAX_HEADINGS);
    expect(report.total).toBe(MAX_HEADINGS + 11);
    expect(report.counts[2]).toBe(MAX_HEADINGS + 10);
    expect(report.truncated).toBe(true);
  });

  it("reads the title (not an SVG title) and compares it to the H1", () => {
    const html = `<head><title>Acme &amp; Co</title></head><body><svg><title>icon</title></svg><h1>acme &amp; co</h1></body>`;
    expect(extractTitle(`<svg><title>icon</title></svg><title>Real</title>`)).toBe("Real");
    const report = buildHeadingsReport({ ...base, html });
    expect(report.title).toBe("Acme & Co");
    expect(report.titleVsH1).toBe("identical");
    expect(compareTitleAndH1("Pricing | Acme", "Simple pricing")).toBe("different");
    expect(compareTitleAndH1(null, "x")).toBe("no-title");
    expect(compareTitleAndH1("x", null)).toBe("no-h1");
    expect(compareTitleAndH1(null, null)).toBe("neither");
  });
});
