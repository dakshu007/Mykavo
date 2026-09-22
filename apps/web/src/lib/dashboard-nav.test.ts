import { describe, expect, it } from "vitest";
import {
  dashboardNav,
  flattenNav,
  isNavItemActive,
  type NavAccess,
} from "./dashboard-nav";

const fresh: NavAccess = {
  monitoringLive: false,
  isBlogAdmin: false,
  isPlatformAdmin: false,
};
const live: NavAccess = { ...fresh, monitoringLive: true };

describe("dashboardNav - the first run", () => {
  /**
   * The whole point of the grouping. A brand-new account should see the loop
   * and its account settings, not a ten-entry menu that reads as ten
   * products competing for the same first impression.
   */
  it("shows only the loop and account before monitoring is live", () => {
    expect(dashboardNav(fresh).map((g) => g.id)).toEqual(["monitoring", "account"]);
  });

  it("hides the analysis tools until the loop has run once", () => {
    const ids = flattenNav(dashboardNav(fresh)).map((i) => i.id);
    expect(ids).not.toContain("site-audit");
    expect(ids).not.toContain("search-console");
    expect(ids).not.toContain("analyser");
  });

  /**
   * Not a judgement call about clutter: with no baseline each of those three
   * pages renders its own "add a website first" empty state, so on day one
   * they are dead ends.
   */
  it("reveals them for good once a baseline exists", () => {
    const analysis = dashboardNav(live).find((g) => g.id === "analysis");
    expect(analysis?.items.map((i) => i.id)).toEqual([
      "site-audit",
      "search-console",
      "analyser",
    ]);
  });

  it("never gates the loop itself", () => {
    for (const access of [fresh, live]) {
      const monitoring = dashboardNav(access).find((g) => g.id === "monitoring");
      expect(monitoring?.items.map((i) => i.id)).toEqual([
        "overview",
        "websites",
        "changes",
        "scans",
      ]);
    }
  });

  it("never gates account access - billing must always be reachable", () => {
    for (const access of [fresh, live]) {
      expect(flattenNav(dashboardNav(access)).map((i) => i.id)).toContain("billing");
      expect(flattenNav(dashboardNav(access)).map((i) => i.id)).toContain("settings");
    }
  });
});

describe("dashboardNav - operator entries", () => {
  it("adds nothing for an ordinary user", () => {
    expect(dashboardNav(live).some((g) => g.id === "admin")).toBe(false);
  });

  it("adds only Blog for a blog admin", () => {
    const admin = dashboardNav({ ...live, isBlogAdmin: true }).find((g) => g.id === "admin");
    expect(admin?.items.map((i) => i.id)).toEqual(["blog"]);
  });

  it("adds Users and All Usage for a platform admin", () => {
    const admin = dashboardNav({ ...live, isPlatformAdmin: true }).find(
      (g) => g.id === "admin",
    );
    expect(admin?.items.map((i) => i.id)).toEqual(["users", "usage"]);
  });

  it("keeps the two privileges independent", () => {
    const both = dashboardNav({ ...live, isBlogAdmin: true, isPlatformAdmin: true });
    const admin = both.find((g) => g.id === "admin");
    expect(admin?.items.map((i) => i.id)).toEqual(["blog", "users", "usage"]);
  });

  it("puts admin last, below the user's own screens", () => {
    const ids = dashboardNav({ ...live, isPlatformAdmin: true }).map((g) => g.id);
    expect(ids[ids.length - 1]).toBe("admin");
  });
});

describe("dashboardNav - shape guarantees", () => {
  it("has no duplicate ids or hrefs in any configuration", () => {
    for (const access of [
      fresh,
      live,
      { ...live, isBlogAdmin: true, isPlatformAdmin: true },
    ]) {
      const items = flattenNav(dashboardNav(access));
      expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
      expect(new Set(items.map((i) => i.href)).size).toBe(items.length);
    }
  });

  it("marks only Overview as an exact match", () => {
    const exact = flattenNav(dashboardNav({ ...live, isPlatformAdmin: true })).filter(
      (i) => i.exact,
    );
    expect(exact.map((i) => i.id)).toEqual(["overview"]);
  });

  it("keeps every href under /dashboard", () => {
    for (const item of flattenNav(dashboardNav({ ...live, isPlatformAdmin: true }))) {
      expect(item.href.startsWith("/dashboard")).toBe(true);
    }
  });
});

describe("isNavItemActive", () => {
  const nav = flattenNav(dashboardNav(live));
  const byId = (id: string) => {
    const item = nav.find((i) => i.id === id);
    if (!item) throw new Error(`missing ${id}`);
    return item;
  };

  it("matches Overview only on the dashboard root", () => {
    expect(isNavItemActive(byId("overview"), "/dashboard")).toBe(true);
    expect(isNavItemActive(byId("overview"), "/dashboard/websites")).toBe(false);
  });

  it("matches a section on its own sub-pages", () => {
    expect(isNavItemActive(byId("websites"), "/dashboard/websites/abc123")).toBe(true);
    expect(isNavItemActive(byId("scans"), "/dashboard/scans/xyz")).toBe(true);
  });

  it("does not light up a sibling section", () => {
    expect(isNavItemActive(byId("changes"), "/dashboard/scans/xyz")).toBe(false);
  });

  /**
   * /dashboard/search-console must not make /dashboard/scans active, which a
   * careless prefix check would do if an href were ever shortened.
   */
  it("keeps prefix-adjacent sections apart", () => {
    expect(isNavItemActive(byId("scans"), "/dashboard/search-console")).toBe(false);
  });
});
