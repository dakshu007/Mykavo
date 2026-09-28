import { describe, expect, it } from "vitest";
import { channelIdFromHtml, decodeXml, parseChannelFeed, videosFromPlaylistItems } from "./youtube";

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
