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

  it("names what it found and shows the alert the visitor would get", () => {
    const html = renderToStaticMarkup(
      createElement(ToolCta, {
        heading: "H",
        body: "B",
        tool: "script-detector",
        url: "https://www.example.com/",
        watch: { items: ["Google Analytics", "Stripe", "Hotjar", "Intercom", "HubSpot"], alert: "Stripe script removed" },
      }),
    );
    expect(html).toContain("What MyKavo would watch on example.com");
    expect(html).toContain("Google Analytics");
    expect(html).toContain("+1 more");
    expect(html).toContain("Stripe script removed on example.com");
    expect(html).toContain("Watch example.com free");
  });

  it("offers the emailed site audit when a page was checked, and only then", () => {
    expect(render("https://www.example.com/pricing")).toContain("Get a free audit of all of example.com by email");
    expect(render(undefined)).not.toContain("Not ready for an account?");
  });
});
