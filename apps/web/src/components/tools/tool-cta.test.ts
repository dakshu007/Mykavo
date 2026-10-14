import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ToolCta } from "./tool-cta";

const render = (url?: string) =>
  renderToStaticMarkup(createElement(ToolCta, { heading: "H", body: "B", tool: "script-detector", url }));

describe("ToolCta", () => {
  it("names the checked site and sends sign-up to Add website, prefilled", () => {
    const html = render("https://www.example.com/pricing");
    expect(html).toContain("Monitor example.com free");
    expect(html).toContain(
      `href="/signup?provider=google&amp;next=%2Fdashboard%2Fwebsites%2Fnew%3Furl%3Dhttps%253A%252F%252Fwww.example.com%252Fpricing&amp;from=tool%3Ascript-detector"`,
    );
  });

  it("falls back to a plain sign-up without a page", () => {
    const html = render(undefined);
    expect(html).toContain("Start monitoring free");
    expect(html).toContain(`href="/signup?provider=google&amp;from=tool%3Ascript-detector"`);
  });
});
