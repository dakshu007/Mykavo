import { describe, expect, it } from "vitest";
import { channelIdFromHtml, decodeXml, parseChannelFeed, slugifyTitle, videosFromPlaylistItems, withSlugs, type YouTubeVideo } from "./youtube";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>MyKavo</title>
 <entry>
  <id>yt:video:aaaaaaaaaaa</id>
  <yt:videoId>aaaaaaaaaaa</yt:videoId>
  <title>How to set up a baseline &amp; approve it</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=aaaaaaaaaaa"/>
  <published>2026-09-20T10:00:00+00:00</published>
  <media:group>
   <media:title>How to set up a baseline &amp; approve it</media:title>
   <media:description>Step one: add your site.
Step two: approve.</media:description>
  </media:group>
 </entry>
 <entry>
  <id>yt:video:bbbbbbbbbbb</id>
  <yt:videoId>bbbbbbbbbbb</yt:videoId>
  <title>Know what changed in 30 seconds</title>
  <link rel="alternate" href="https://www.youtube.com/shorts/bbbbbbbbbbb"/>
  <published>2026-09-27T08:00:00+00:00</published>
  <media:group><media:description></media:description></media:group>
 </entry>
 <entry>
  <yt:videoId>not-an-id</yt:videoId>
  <title>Broken entry</title>
  <published>2026-09-28T08:00:00+00:00</published>
 </entry>
</feed>`;

describe("youtube feed", () => {
  it("parses entries newest first, decoding entities and keeping line breaks", () => {
    const videos = parseChannelFeed(FEED);
    expect(videos.map((v) => v.id)).toEqual(["bbbbbbbbbbb", "aaaaaaaaaaa"]);
    const [short, long] = videos;
    expect(long.title).toBe("How to set up a baseline & approve it");
    expect(long.description).toBe("Step one: add your site.\nStep two: approve.");
    expect(long.url).toBe("https://www.youtube.com/watch?v=aaaaaaaaaaa");
    expect(long.thumbnail).toBe("https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg");
    expect(long.isShort).toBe(false);
    expect(short.isShort).toBe(true);
  });

  it("drops entries without a valid video id", () => {
    expect(parseChannelFeed(FEED).some((v) => v.title === "Broken entry")).toBe(false);
  });

  it("returns nothing for an empty or unexpected document", () => {
    expect(parseChannelFeed("")).toEqual([]);
    expect(parseChannelFeed("<html>consent page</html>")).toEqual([]);
  });

  it("decodes numeric and named entities", () => {
    expect(decodeXml("Tom&#39;s &quot;tips&quot; &#x2013; &lt;b&gt;")).toBe(`Tom's "tips" – <b>`);
  });
});

describe("channel id lookup", () => {
  const id = "UC1234567890abcdefghij_-";
  it("reads the canonical link first", () => {
    expect(channelIdFromHtml(`<link rel="canonical" href="https://www.youtube.com/channel/${id}">`)).toBe(id);
  });
  it("falls back to the embedded page data", () => {
    expect(channelIdFromHtml(`{"externalId":"${id}","title":"MyKavo"}`)).toBe(id);
  });
  it("returns null when the page has no channel id", () => {
    expect(channelIdFromHtml("<html></html>")).toBeNull();
  });
});

describe("youtube data api mapping", () => {
  it("keeps public uploads and drops private or deleted ones", () => {
    const videos = videosFromPlaylistItems([
      { snippet: { title: "Tutorial", description: "d" }, contentDetails: { videoId: "ccccccccccc", videoPublishedAt: "2026-09-01T00:00:00Z" } },
      { snippet: { title: "Private video" }, contentDetails: { videoId: "ddddddddddd" } },
      { snippet: { title: "Deleted video" }, contentDetails: { videoId: "eeeeeeeeeee", videoPublishedAt: "2026-09-02T00:00:00Z" } },
    ]);
    expect(videos.map((v) => v.id)).toEqual(["ccccccccccc"]);
  });
});

describe("watch page slugs", () => {
  const video = (id: string, title: string, publishedAt: string): YouTubeVideo => ({
    id, title, publishedAt, description: "", thumbnail: "", url: "", isShort: false,
  });

  it("turns titles into short readable slugs", () => {
    expect(slugifyTitle("How to Read a Website Change Alert (Severity, Category, Before & After)")).toBe(
      "how-to-read-a-website-change-alert-severity-category-before-and-after",
    );
    expect(slugifyTitle("Monitor Your Website Free : https://mykavo.app/")).toBe("monitor-your-website-free");
    expect(slugifyTitle("Café déjà vu")).toBe("cafe-deja-vu");
    expect(slugifyTitle("a ".repeat(60)).length).toBeLessThanOrEqual(80);
  });

  it("drops a leading episode number so renumbering never moves a page", () => {
    expect(slugifyTitle("21 How to Invite Your Team to MyKavo (Admin, Member and Viewer Roles)")).toBe(
      "how-to-invite-your-team-to-mykavo-admin-member-and-viewer-roles",
    );
    expect(slugifyTitle("07 Your Website This Week")).toBe(slugifyTitle("Your Website This Week"));
    expect(slugifyTitle("#3 - Baselines")).toBe("baselines");
    expect(slugifyTitle("16 WordPress Safe Updates: Know Exactly Which Plugin Update Broke Your Site")).toBe(
      "wordpress-safe-updates-know-exactly-which-plugin-update-broke-your-site",
    );
    expect(slugifyTitle("404 Error Explained")).toBe("404-error-explained");
    expect(slugifyTitle("2026")).toBe("2026");
  });

  it("keeps the older video's slug when titles repeat, and falls back to the id", () => {
    const videos = withSlugs([
      video("NEWNEWNEW01", "Same title", "2026-10-02T00:00:00Z"),
      video("OLDOLDOLD01", "Same title", "2026-10-01T00:00:00Z"),
      video("EMOJIEMOJI1", "🔥🔥", "2026-10-03T00:00:00Z"),
    ]);
    expect(videos.map((v) => v.slug)).toEqual(["same-title-newnewnew01", "same-title", "emojiemoji1"]);
  });
});
