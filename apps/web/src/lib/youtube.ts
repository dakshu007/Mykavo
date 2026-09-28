/**
 * The MyKavo YouTube channel as a list of videos, for /video-tutorials.
 *
 * No API key is needed: YouTube publishes every channel's latest uploads as
 * an Atom feed. The page re-reads it on a timer (ISR), so a new upload shows
 * up on mykavo.app within the hour without anyone touching the site.
 *
 * The feed only ever carries the 15 newest uploads. When the channel
 * outgrows that, set YOUTUBE_API_KEY (a plain YouTube Data API v3 key, no
 * OAuth) and the full uploads playlist is read instead.
 *
 * The channel is identified by its handle (from config/site socials). Feeds
 * need the UC... channel id, so it is read from the channel page once a day;
 * set YOUTUBE_CHANNEL_ID to skip that lookup.
 */

import { socials } from "@/config/site";

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
  isShort: boolean;
};

const REVALIDATE_FEED = 1800;
const REVALIDATE_CHANNEL_ID = 86400;
/** Upper bound for the API path: enough for years of tutorials. */
const API_MAX_VIDEOS = 200;

export const CHANNEL_URL = socials.find((s) => s.label === "YouTube")?.href ?? "https://www.youtube.com/@mykavo";

const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

/* ---------- parsing (pure, tested) ---------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? "";
  });
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? decodeXml(m[1].trim()) : null;
}

function attr(xml: string, name: string, attribute: string): string | null {
  const m = xml.match(new RegExp(`<${name}\\s[^>]*${attribute}="([^"]*)"`));
  return m ? decodeXml(m[1]) : null;
}

/** The best thumbnail YouTube serves for every video. */
export const thumbnailFor = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Parse a channel's Atom feed into videos, newest first. */
export function parseChannelFeed(xml: string): YouTubeVideo[] {
  const entries = xml.split("<entry>").slice(1).map((e) => e.split("</entry>")[0]);
  const videos: YouTubeVideo[] = [];
  for (const entry of entries) {
    const id = tag(entry, "yt:videoId");
    const title = tag(entry, "title");
    const publishedAt = tag(entry, "published");
    if (!id || !/^[\w-]{11}$/.test(id) || !title || !publishedAt) continue;
    const link = attr(entry, "link", "href") ?? "";
    videos.push({
      id,
      title,
      description: tag(entry, "media:description") ?? "",
      publishedAt,
      thumbnail: thumbnailFor(id),
      url: `https://www.youtube.com/watch?v=${id}`,
      isShort: link.includes("/shorts/"),
    });
  }
  return videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Pull the UC... id out of a channel page's HTML. */
export function channelIdFromHtml(html: string): string | null {
  const patterns = [
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /"channelId":"(UC[\w-]{22})"/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

type PlaylistItem = {
  snippet?: { title?: string; description?: string; resourceId?: { videoId?: string } };
  contentDetails?: { videoId?: string; videoPublishedAt?: string };
};

/** Map a YouTube Data API playlistItems page into videos (private/deleted items dropped). */
export function videosFromPlaylistItems(items: PlaylistItem[]): YouTubeVideo[] {
  const out: YouTubeVideo[] = [];
  for (const item of items) {
    const id = item.contentDetails?.videoId ?? item.snippet?.resourceId?.videoId;
    const publishedAt = item.contentDetails?.videoPublishedAt;
    const title = item.snippet?.title;
    if (!id || !publishedAt || !title || title === "Private video" || title === "Deleted video") continue;
    out.push({
      id,
      title,
      description: item.snippet?.description ?? "",
      publishedAt,
      thumbnail: thumbnailFor(id),
      url: `https://www.youtube.com/watch?v=${id}`,
      isShort: false,
    });
  }
  return out;
}

/* ---------- fetching ---------- */

async function resolveChannelId(): Promise<string | null> {
  const configured = process.env.YOUTUBE_CHANNEL_ID?.trim();
  if (configured && CHANNEL_ID_RE.test(configured)) return configured;
  try {
    const res = await fetch(CHANNEL_URL, {
      headers: { "accept-language": "en-US,en;q=0.9", "user-agent": "Mozilla/5.0 (compatible; MyKavoSite/1.0)" },
      next: { revalidate: REVALIDATE_CHANNEL_ID },
    });
    if (!res.ok) return null;
    return channelIdFromHtml(await res.text());
  } catch {
    return null;
  }
}

async function fromApi(channelId: string, key: string): Promise<YouTubeVideo[]> {
  const playlistId = `UU${channelId.slice(2)}`;
  const videos: YouTubeVideo[] = [];
  let pageToken = "";
  while (videos.length < API_MAX_VIDEOS) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.search = new URLSearchParams({ part: "snippet,contentDetails", maxResults: "50", playlistId, key, ...(pageToken ? { pageToken } : {}) }).toString();
    const res = await fetch(url, { next: { revalidate: REVALIDATE_FEED } });
    if (!res.ok) throw new Error(`YouTube API ${res.status}`);
    const data = (await res.json()) as { items?: PlaylistItem[]; nextPageToken?: string };
    videos.push(...videosFromPlaylistItems(data.items ?? []));
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return videos.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

async function fromFeed(channelId: string): Promise<YouTubeVideo[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, {
    next: { revalidate: REVALIDATE_FEED },
  });
  if (!res.ok) throw new Error(`YouTube feed ${res.status}`);
  return parseChannelFeed(await res.text());
}

/**
 * The channel's videos, newest first. Never throws: if YouTube cannot be
 * reached the page renders its empty state and the next revalidation tries
 * again.
 */
export async function getChannelVideos(): Promise<YouTubeVideo[]> {
  const channelId = await resolveChannelId();
  if (!channelId) return [];
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (key) {
    try {
      return await fromApi(channelId, key);
    } catch {
      // Bad key or quota: the feed still has the newest uploads.
    }
  }
  try {
    return await fromFeed(channelId);
  } catch {
    return [];
  }
}
