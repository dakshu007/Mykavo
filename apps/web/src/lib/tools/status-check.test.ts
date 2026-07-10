import { describe, expect, it } from "vitest";
import { checkUrlStatus, mapWithConcurrency, type StatusCheckOptions } from "./status-check";

function fakeDeps(
  responses: Record<string, Partial<Record<"HEAD" | "GET", { status: number; location?: string }>>>,
): Pick<StatusCheckOptions, "fetchImpl" | "validateUrl"> & { methods: string[] } {
  const methods: string[] = [];
  return {
    methods,
    validateUrl: async (raw) => new URL(typeof raw === "string" ? raw : raw.href),
    fetchImpl: async (url, init) => {
      const method = (init.method ?? "GET") as "HEAD" | "GET";
      methods.push(`${method} ${url}`);
      const scripted = responses[url]?.[method];
      if (!scripted) throw new Error(`unscripted: ${method} ${url}`);
      return new Response(null, {
        status: scripted.status,
        headers: scripted.location ? { location: scripted.location } : {},
      });
    },
  };
}

describe("checkUrlStatus", () => {
  it("uses HEAD and reports the status", async () => {
    const deps = fakeDeps({ "https://a.example/": { HEAD: { status: 200 } } });
    const result = await checkUrlStatus("https://a.example/", deps);
    expect(result.status).toBe(200);
    expect(result.error).toBeNull();
    expect(deps.methods).toEqual(["HEAD https://a.example/"]);
  });

  it("falls back to GET when HEAD returns 405", async () => {
    const deps = fakeDeps({
      "https://a.example/": { HEAD: { status: 405 }, GET: { status: 200 } },
    });
    const result = await checkUrlStatus("https://a.example/", deps);
    expect(result.status).toBe(200);
    expect(deps.methods).toEqual(["HEAD https://a.example/", "GET https://a.example/"]);
  });

  it("follows redirects with re-validation and reports the final status", async () => {
    const deps = fakeDeps({
      "https://a.example/": { HEAD: { status: 301, location: "https://b.example/" } },
      "https://b.example/": { HEAD: { status: 200 } },
    });
    const result = await checkUrlStatus("https://a.example/", deps);
    expect(result.status).toBe(200);
    expect(result.finalUrl).toBe("https://b.example/");
    expect(result.redirectCount).toBe(1);
  });

  it("tolerates a missing scheme in user input", async () => {
    const deps = fakeDeps({ "https://a.example/": { HEAD: { status: 200 } } });
    const result = await checkUrlStatus("a.example", deps);
    expect(result.status).toBe(200);
    expect(result.url).toBe("a.example");
  });

  it("returns a per-row error instead of throwing", async () => {
    const result = await checkUrlStatus("not a url at all %%%", {
      validateUrl: async () => {
        throw new Error("should not be called");
      },
      fetchImpl: async () => {
        throw new Error("should not be called");
      },
    });
    expect(result.status).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe("mapWithConcurrency", () => {
  it("preserves input order and limits concurrency", async () => {
    let active = 0;
    let maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const results = await mapWithConcurrency(items, 3, async (n) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 10;
    });
    expect(results).toEqual([10, 20, 30, 40, 50, 60, 70, 80]);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
});
