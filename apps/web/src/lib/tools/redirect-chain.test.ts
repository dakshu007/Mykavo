import { describe, expect, it } from "vitest";
import { followRedirectChain, type FollowOptions } from "./redirect-chain";

/** Scripted fetch: maps URL → { status, location }. No network, no DNS. */
function fakeDeps(
  responses: Record<string, { status: number; location?: string }>,
): Pick<FollowOptions, "fetchImpl" | "validateUrl"> & { requested: string[] } {
  const requested: string[] = [];
  return {
    requested,
    validateUrl: async (raw) => new URL(typeof raw === "string" ? raw : raw.href),
    fetchImpl: async (url) => {
      requested.push(url);
      const scripted = responses[url];
      if (!scripted) throw new Error(`unscripted url: ${url}`);
      return new Response(null, {
        status: scripted.status,
        headers: scripted.location ? { location: scripted.location } : {},
      });
    },
  };
}

describe("followRedirectChain", () => {
  it("returns a single completed step for a non-redirecting URL", async () => {
    const deps = fakeDeps({ "https://a.example/": { status: 200 } });
    const result = await followRedirectChain("https://a.example/", deps);
    expect(result.steps).toEqual([{ url: "https://a.example/", status: 200 }]);
    expect(result.redirectCount).toBe(0);
    expect(result.completed).toBe(true);
    expect(result.finalStatus).toBe(200);
    expect(result.loopDetected).toBe(false);
  });

  it("follows a multi-hop chain and records every status in order", async () => {
    const deps = fakeDeps({
      "http://a.example/": { status: 301, location: "https://a.example/" },
      "https://a.example/": { status: 302, location: "https://www.a.example/home" },
      "https://www.a.example/home": { status: 200 },
    });
    const result = await followRedirectChain("http://a.example/", deps);
    expect(result.steps.map((s) => s.status)).toEqual([301, 302, 200]);
    expect(result.redirectCount).toBe(2);
    expect(result.completed).toBe(true);
    expect(result.finalUrl).toBe("https://www.a.example/home");
  });

  it("resolves relative Location headers against the current URL", async () => {
    const deps = fakeDeps({
      "https://a.example/old": { status: 308, location: "/new" },
      "https://a.example/new": { status: 200 },
    });
    const result = await followRedirectChain("https://a.example/old", deps);
    expect(result.finalUrl).toBe("https://a.example/new");
    expect(result.completed).toBe(true);
  });

  it("detects a redirect loop and reports the repeated URL", async () => {
    const deps = fakeDeps({
      "https://a.example/": { status: 301, location: "https://b.example/" },
      "https://b.example/": { status: 302, location: "https://a.example/" },
    });
    const result = await followRedirectChain("https://a.example/", deps);
    expect(result.loopDetected).toBe(true);
    expect(result.loopUrl).toBe("https://a.example/");
    expect(result.completed).toBe(false);
    expect(result.finalStatus).toBeNull();
    expect(result.steps.map((s) => s.status)).toEqual([301, 302]);
  });

  it("detects a self-redirect as a loop", async () => {
    const deps = fakeDeps({
      "https://a.example/": { status: 301, location: "https://a.example/" },
    });
    const result = await followRedirectChain("https://a.example/", deps);
    expect(result.loopDetected).toBe(true);
    expect(result.loopUrl).toBe("https://a.example/");
  });

  it("stops after maxHops redirects without following further", async () => {
    const responses: Record<string, { status: number; location?: string }> = {};
    for (let i = 0; i < 20; i++) {
      responses[`https://a.example/${i}`] = { status: 301, location: `https://a.example/${i + 1}` };
    }
    const deps = fakeDeps(responses);
    const result = await followRedirectChain("https://a.example/0", { ...deps, maxHops: 10 });
    expect(result.exceededMaxHops).toBe(true);
    expect(result.completed).toBe(false);
    // Initial response + 10 followed hops = 11 responses fetched, no more.
    expect(deps.requested).toHaveLength(11);
    expect(result.steps).toHaveLength(11);
  });

  it("treats a 3xx without a Location header as terminal", async () => {
    const deps = fakeDeps({ "https://a.example/": { status: 304 } });
    const result = await followRedirectChain("https://a.example/", deps);
    expect(result.completed).toBe(true);
    expect(result.finalStatus).toBe(304);
  });

  it("re-validates every hop destination with the URL guard", async () => {
    const validated: string[] = [];
    const deps = fakeDeps({
      "https://a.example/": { status: 301, location: "https://b.example/" },
      "https://b.example/": { status: 200 },
    });
    const result = await followRedirectChain("https://a.example/", {
      fetchImpl: deps.fetchImpl,
      validateUrl: async (raw) => {
        const url = new URL(typeof raw === "string" ? raw : raw.href);
        validated.push(url.href);
        return url;
      },
    });
    expect(result.completed).toBe(true);
    expect(validated).toEqual(["https://a.example/", "https://b.example/"]);
  });

  it("propagates guard rejections for unsafe hop destinations", async () => {
    const deps = fakeDeps({
      "https://a.example/": { status: 302, location: "http://169.254.169.254/latest/meta-data" },
    });
    await expect(
      followRedirectChain("https://a.example/", {
        fetchImpl: deps.fetchImpl,
        validateUrl: async (raw) => {
          const url = new URL(typeof raw === "string" ? raw : raw.href);
          if (url.hostname === "169.254.169.254") throw new Error("blocked");
          return url;
        },
      }),
    ).rejects.toThrow("blocked");
  });
});
