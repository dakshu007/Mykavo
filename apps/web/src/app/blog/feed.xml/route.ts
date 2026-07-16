import { prisma } from "@mykavo/database";
import { site } from "@/config/site";

// Dynamic on purpose: publishing from the dashboard must reach the feed
// immediately, without a redeploy (same policy as the blog pages).
export const dynamic = "force-dynamic";

function xmlEscape(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** RSS 2.0 feed of published posts - small SEO/distribution win. */
export async function GET() {
  const posts = await prisma.blogPost.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      slug: true,
      title: true,
      excerpt: true,
      publishedAt: true,
      authorName: true,
    },
  });

  const items = posts
    .map((post) => {
      const url = `${site.url}/blog/${post.slug}`;
      return [
        "    <item>",
        `      <title>${xmlEscape(post.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        post.excerpt ? `      <description>${xmlEscape(post.excerpt)}</description>` : null,
        post.publishedAt ? `      <pubDate>${post.publishedAt.toUTCString()}</pubDate>` : null,
        `      <author>${xmlEscape(post.authorName)}</author>`,
        "    </item>",
      ]
        .filter((line): line is string => line !== null)
        .join("\n");
    })
    .join("\n");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(`${site.name} Blog`)}</title>
    <link>${xmlEscape(`${site.url}/blog`)}</link>
    <atom:link href="${xmlEscape(`${site.url}/blog/feed.xml`)}" rel="self" type="application/rss+xml"/>
    <description>Website monitoring, SEO regressions, and catching changes before customers do.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`;

  return new Response(feed, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
