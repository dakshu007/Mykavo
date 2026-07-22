import type { MetadataRoute } from "next";
import { prisma } from "@mykavo/database";
import { site } from "@/config/site";

// Dynamic so newly published blog posts appear without a redeploy.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    "",
    "/pricing",
    "/preview",
    "/about",
    "/support",
    "/privacy",
    "/terms",
    "/cookies",
    "/tools/website-change-detector",
    "/tools/meta-tag-checker",
    "/tools/redirect-chain-checker",
    "/tools/bulk-url-status-checker",
    "/tools/script-detector",
    "/visual-regression-testing",
    "/seo-monitoring",
    "/website-content-monitoring",
    "/website-monitoring-for-wordpress",
    "/website-monitoring-for-shopify",
    "/website-monitoring-for-webflow",
    "/guides/how-to-monitor-website-changes",
    "/guides/website-monitoring-checklist",
    "/guides/website-maintenance-checklist",
    "/guides/website-deployment-checklist",
    "/blog",
  ];
  const entries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${site.url}${route}`,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.8,
  }));

  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    });
    for (const post of posts) {
      entries.push({
        url: `${site.url}/blog/${post.slug}`,
        lastModified: post.updatedAt,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch {
    // Database unavailable (e.g. build without DB) - serve the static routes.
  }

  return entries;
}
