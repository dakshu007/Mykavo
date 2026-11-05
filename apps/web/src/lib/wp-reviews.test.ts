import { describe, expect, it } from "vitest";
import { parseRating, parseReviewsFeed, pickReviews } from "./wp-reviews";

// Trimmed from a real WordPress.org reviews feed (another plugin's), November 2026.
const FEED = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel>
<item>
  <guid>https://wordpress.org/support/topic/helping-our-website/</guid>
  <title>Helping our website&#8230;. (5 stars)</title>
  <link>https://wordpress.org/support/topic/helping-our-website/</link>
  <pubDate>Wed, 04 Nov 2026 02:36:12 +0000</pubDate>
  <dc:creator>Melvin</dc:creator>
  <description><![CDATA[
    <p>Replies: 1</p>
    <p>Rating: 5 stars</p>
<p class="wp-block-paragraph">Excellent plugin that we need for sending email &amp; alerts.</p>
  ]]></description>
</item>
<item>
  <title>Great app!! (5 stars)</title>
  <link>https://wordpress.org/support/topic/great-app-816/</link>
  <pubDate>Mon, 05 Oct 2026 23:39:30 +0000</pubDate>
  <dc:creator>omelc</dc:creator>
  <description><![CDATA[<p>Replies: 1</p><p>Rating: 5 stars</p><p>Great app!!</p>
<ul id="bbp-topic-revision-log-1" class="bbp-topic-revision-log"><li>This topic was modified 1 month ago by omelc.</li></ul>]]></description>
</item>
<item>
  <title>Solid option for SMTP (4 stars)</title>
  <link>https://wordpress.org/support/topic/solid-option-for-smtp/</link>
  <pubDate>Mon, 28 Sep 2026 22:10:13 +0000</pubDate>
  <dc:creator>kingfisherwebdev</dc:creator>
  <description><![CDATA[<p>Replies: 1</p><p>Rating: 4 stars</p><p>Reliable, and easy to configure. A little aggressive with the pro version upsell</p>]]></description>
</item>
<item>
  <title>Constantly disconnecting (1 star)</title>
  <link>https://wordpress.org/support/topic/constantly-disconnecting-3/</link>
  <pubDate>Thu, 27 Aug 2026 18:55:53 +0000</pubDate>
  <dc:creator>Brittany</dc:creator>
  <description><![CDATA[<p>Replies: 1</p><p>Rating: 1 star</p><p>Constantly disconnecting without warning.</p>]]></description>
</item>
</channel></rss>`;

describe("parseReviewsFeed", () => {
  it("reads rating, author, title, text and link", () => {
    const reviews = parseReviewsFeed(FEED);
    expect(reviews).toHaveLength(4);
    expect(reviews[0]).toEqual({
      title: "Helping our website….",
      author: "Melvin",
      rating: 5,
      text: "Excellent plugin that we need for sending email & alerts.",
      url: "https://wordpress.org/support/topic/helping-our-website/",
      date: "2026-11-04T02:36:12.000Z",
    });
    expect(reviews[1].text).toBe("Great app!!");
    expect(reviews[3].rating).toBe(1);
  });

  it("reads an empty feed as no reviews", () => {
    expect(parseReviewsFeed("<rss><channel></channel></rss>")).toEqual([]);
  });
});

describe("pickReviews", () => {
  it("keeps 4 and 5 star reviews that say something, newest first", () => {
    const picked = pickReviews(parseReviewsFeed(FEED));
    expect(picked.map((r) => r.author)).toEqual(["Melvin", "kingfisherwebdev"]);
  });
});

describe("parseRating", () => {
  it("turns WordPress.org's percentage into stars out of 5", () => {
    expect(parseRating({ rating: 96, num_ratings: 23 })).toEqual({ average: 4.8, count: 23 });
    expect(parseRating({ rating: 0, num_ratings: 0 })).toBeNull();
    expect(parseRating(null)).toBeNull();
  });
});
