import { prisma } from "@mykavo/database";
import { articleHtml, asFaq } from "@/lib/keywords/post-html";

/**
 * "Save as a draft in WordPress" for AI Keywords posts.
 *
 * MyKavo cannot reach into a WordPress site, so it queues the post and the
 * MyKavo plugin collects it: whenever someone opens WP Admin, and every 15
 * minutes in the background (plugins/wordpress/mykavo/includes/
 * class-mykavo-drafts.php). The plugin creates a draft, or updates the one it
 * made before while it is still a draft, and reports back. It never publishes.
 */

/** The first plugin release that collects drafts. */
export const WP_DRAFTS_MIN_PLUGIN = "1.3.2";

/** How many queued drafts one collection returns. Small, so a slow site stays fast. */
export const WP_DRAFTS_BATCH = 5;

/** "1.10.2" >= "1.3.2", numerically. Unknown versions count as too old. */
export function pluginSupportsDrafts(version: string | null | undefined): boolean {
  if (!version) return false;
  const a = version.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const b = WP_DRAFTS_MIN_PLUGIN.split(".").map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== b[i]) return (a[i] ?? 0) > b[i]!;
  }
  return true;
}

export interface WpSiteLink {
  siteUrl: string;
  pluginVersion: string | null;
  /** False when the plugin is older than WP_DRAFTS_MIN_PLUGIN. */
  supportsDrafts: boolean;
  /** WP Admin's list of drafts: opening it also makes the plugin collect. */
  draftsUrl: string;
}

/** The website's live WordPress plugin connection, or null when it has none. */
export async function wordpressLinkFor(websiteId: string): Promise<WpSiteLink | null> {
  const connection = await prisma.siteConnection.findFirst({
    where: { websiteId, platform: "wordpress", revokedAt: null, tokenHash: { not: null } },
    orderBy: { connectedAt: "desc" },
    select: { siteUrl: true, pluginVersion: true },
  });
  if (!connection) return null;
  const base = connection.siteUrl.replace(/\/+$/, "");
  return {
    siteUrl: base,
    pluginVersion: connection.pluginVersion,
    supportsDrafts: pluginSupportsDrafts(connection.pluginVersion),
    draftsUrl: `${base}/wp-admin/edit.php?post_status=draft&post_type=post`,
  };
}

export type WpDraftStatus = "queued" | "delivered" | "failed";

/** What the dashboard shows for a post's WordPress draft. */
export interface WpDraftView {
  status: WpDraftStatus;
  editUrl: string | null;
  error: string | null;
  queuedAt: string;
  deliveredAt: string | null;
  /** The post was saved again after this version was sent. */
  outdated: boolean;
  /** The post version WordPress has (or is getting). */
  postVersion: number;
}

export function wpDraftView(
  row: { status: string; editUrl: string | null; error: string | null; queuedAt: Date; deliveredAt: Date | null; postVersion: number },
  currentVersion: number,
): WpDraftView {
  const status: WpDraftStatus = row.status === "delivered" || row.status === "failed" ? row.status : "queued";
  return {
    status,
    editUrl: row.editUrl,
    error: row.error,
    queuedAt: row.queuedAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    outdated: status !== "queued" && currentVersion > row.postVersion,
    postVersion: row.postVersion,
  };
}

/**
 * Queue (or re-queue) a post for the site's WordPress. A resend keeps the
 * WordPress post id, so the plugin updates that draft instead of adding a
 * second one.
 */
export async function queueWpDraft(params: {
  contentPostId: string;
  websiteId: string;
  workspaceId: string;
  postVersion: number;
  userId: string;
}) {
  const data = {
    status: "queued",
    postVersion: params.postVersion,
    error: null,
    requestedByUserId: params.userId,
    queuedAt: new Date(),
  };
  return prisma.wpDraft.upsert({
    where: { contentPostId: params.contentPostId },
    create: { contentPostId: params.contentPostId, websiteId: params.websiteId, workspaceId: params.workspaceId, ...data },
    update: data,
  });
}

/** One queued draft as the plugin receives it. */
export interface WpDraftPayload {
  id: string;
  version: number;
  title: string;
  slug: string;
  /** Article and FAQ, sanitised HTML, no title heading. */
  contentHtml: string;
  metaDescription: string;
  focusKeyword: string;
  /** JSON-LD objects; the plugin prints them only when no SEO plugin already adds schema. */
  jsonLd: unknown[];
  /** The draft made last time, to update instead of adding another. */
  wpPostId: number | null;
}

/** The queued drafts for one website, oldest first. */
export async function queuedDraftsFor(websiteId: string): Promise<WpDraftPayload[]> {
  const rows = await prisma.wpDraft.findMany({
    where: { websiteId, status: "queued" },
    orderBy: { queuedAt: "asc" },
    take: WP_DRAFTS_BATCH,
    select: {
      id: true,
      postVersion: true,
      wpPostId: true,
      contentPost: {
        select: { title: true, slug: true, metaDescription: true, bodyHtml: true, faq: true, jsonLd: true, keyword: true, version: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    // Always the post as it is now: a save after queueing is what the owner wants.
    version: r.contentPost.version,
    title: r.contentPost.title,
    slug: r.contentPost.slug,
    contentHtml: articleHtml(r.contentPost.bodyHtml, asFaq(r.contentPost.faq)),
    metaDescription: r.contentPost.metaDescription,
    focusKeyword: r.contentPost.keyword,
    jsonLd: Array.isArray(r.contentPost.jsonLd) ? r.contentPost.jsonLd : [],
    wpPostId: r.wpPostId,
  }));
}

/** Only an http(s) link back into the same site is kept as the edit link. */
export function safeEditUrl(editUrl: unknown, siteUrl: string): string | null {
  if (typeof editUrl !== "string" || editUrl.length > 500) return null;
  try {
    const url = new URL(editUrl);
    const site = new URL(siteUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = (h: string) => h.replace(/^www\./, "");
    if (host(url.hostname) !== host(site.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
