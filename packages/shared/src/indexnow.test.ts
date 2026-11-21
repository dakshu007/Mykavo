import { describe, expect, it } from "vitest";
import { INDEXNOW_KEY, indexNowPayload, parseSitemap, urlsToSubmit } from "./indexnow";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>https://mykavo.app/</loc></url>
<url><loc>https://mykavo.app/blog/new-post</loc><lastmod>2026-11-21T06:00:00.000Z</lastmod></url>
<url><loc>https://mykavo.app/blog/old-post</loc><lastmod>2026-10-01T06:00:00.000Z</lastmod></url>
<url><loc>https://elsewhere.com/x</loc><lastmod>2026-11-21T06:00:00.000Z</lastmod></url>
<url><loc>https://mykavo.app/tools?a=1&amp;b=2</loc></url>
</urlset>`;

describe("indexnow", () => {
  it("parses locations and lastmod", () => {
    const entries = parseSitemap(XML);
    expect(entries).toHaveLength(5);
    expect(entries[1]?.lastModified?.toISOString()).toBe("2026-11-21T06:00:00.000Z");
    expect(entries[0]?.lastModified).toBeNull();
    expect(entries[4]?.url).toBe("https://mykavo.app/tools?a=1&b=2");
  });

  it("sends only changed pages on a daily run, and only our host", () => {
    const urls = urlsToSubmit(parseSitemap(XML), { host: "mykavo.app", since: new Date("2026-11-20T00:00:00Z") });
    expect(urls).toEqual(["https://mykavo.app/blog/new-post"]);
  });

  it("sends every page of our host on a full run", () => {
    const urls = urlsToSubmit(parseSitemap(XML), { host: "mykavo.app", since: null });
    expect(urls).toHaveLength(4);
    expect(urls).not.toContain("https://elsewhere.com/x");
  });

  it("builds the payload with the public key file", () => {
    expect(indexNowPayload("mykavo.app", ["https://mykavo.app/"])).toEqual({
      host: "mykavo.app",
      key: INDEXNOW_KEY,
      keyLocation: `https://mykavo.app/${INDEXNOW_KEY}.txt`,
      urlList: ["https://mykavo.app/"],
    });
  });
});

describe("indexnow key file", () => {
  it("is published by the web app with the key as its only content", async () => {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const file = join(__dirname, "../../../apps/web/public", `${INDEXNOW_KEY}.txt`);
    expect(await readFile(file, "utf8")).toBe(INDEXNOW_KEY);
  });
});
