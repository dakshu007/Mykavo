import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { LiteYouTube } from "@/components/video/lite-youtube";
import { site } from "@/config/site";
import { CHANNEL_URL, getChannelVideos, type YouTubeVideo } from "@/lib/youtube";
import {
  ORGANIZATION_ID,
  WEBSITE_ID,
  breadcrumbList,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

const PATH = "/video-tutorials";

// Re-read the channel every 30 minutes: a new upload appears here on its own.
export const revalidate = 1800;

const DESCRIPTION =
  "Short video walkthroughs of MyKavo: adding a website, approving a baseline, reading change alerts, before-and-after comparisons, SEO and visual monitoring, and more.";

/**
 * Until the channel has a public video this page is an empty shell, and an
 * indexed page with no content is exactly the thin page Google's spam
 * updates demote - so it asks not to be indexed until the first upload.
 */
export async function generateMetadata(): Promise<Metadata> {
  const videos = await getChannelVideos();
  return withSocial({
    title: "MyKavo Video Tutorials - Website Monitoring Walkthroughs",
    description: DESCRIPTION,
    alternates: { canonical: PATH },
    ...(videos.length === 0 ? { robots: { index: false, follow: true } } : {}),
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function excerpt(text: string, max = 320): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const cut = clean.lastIndexOf(" ", max);
  return `${clean.slice(0, cut > 0 ? cut : max).trimEnd()}...`;
}

/** CollectionPage + VideoObject list, so search can show these as video results. */
function videosJsonLd(videos: YouTubeVideo[]) {
  const url = `${site.url}${PATH}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name: "MyKavo video tutorials",
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: videos.length,
          itemListOrder: "https://schema.org/ItemListOrderDescending",
          itemListElement: videos.map((v, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "VideoObject",
              "@id": `${v.url}#video`,
              name: v.title,
              description: v.description || v.title,
              thumbnailUrl: v.thumbnail,
              uploadDate: v.publishedAt,
              contentUrl: v.url,
              embedUrl: `https://www.youtube-nocookie.com/embed/${v.id}`,
              publisher: { "@id": ORGANIZATION_ID },
            },
          })),
        },
      },
    ],
  };
}

function ShortChip() {
  return (
    <span className="rounded-full bg-[#151515] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#FFD400]">
      Short
    </span>
  );
}

export default async function VideoTutorialsPage() {
  const videos = await getChannelVideos();
  const [latest, ...rest] = videos;
  const subscribeUrl = `${CHANNEL_URL}?sub_confirmation=1`;

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(videosJsonLd(videos)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Video tutorials", path: PATH }])) }}
      />
      <LandingNav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className={`${eyebrow} mb-4`}>{"// video tutorials //"}</p>
            <h1 className={`${fontDisplay} text-4xl leading-[1.08] sm:text-5xl`}>Learn MyKavo in minutes</h1>
            <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
              Short walkthroughs of every part of MyKavo, from your first baseline to reading an alert. New videos
              appear here as soon as they are published on our YouTube channel.
            </p>
          </div>
          <a
            href={subscribeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-[#151515] px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-black sm:self-auto"
          >
            <span aria-hidden className="size-2 rounded-full bg-[#FF3B30]" />
            Subscribe on YouTube
          </a>
        </div>

        {latest ? (
          <>
            <section aria-labelledby="latest-video" className="mt-12 grid gap-8 lg:grid-cols-[1.55fr_1fr] lg:items-center">
              <div className="relative aspect-video overflow-hidden rounded-2xl border border-[#151515] bg-[#151515] shadow-[6px_6px_0_#151515]">
                <LiteYouTube id={latest.id} title={latest.title} thumbnail={latest.thumbnail} size="hero" />
              </div>
              <div>
                <p className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B6B60]">
                  <span className="rounded-full bg-[#FFD400] px-2 py-0.5 text-[10px] text-[#151515]">Latest</span>
                  <time dateTime={latest.publishedAt}>{formatDate(latest.publishedAt)}</time>
                  {latest.isShort && <ShortChip />}
                </p>
                <h2 id="latest-video" className="mt-3 text-[26px] font-semibold leading-tight tracking-tight">
                  {latest.title}
                </h2>
                {latest.description && (
                  <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-[#6B6B60]">{excerpt(latest.description)}</p>
                )}
                <a
                  href={latest.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-1 text-[14px] font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4"
                >
                  Watch on YouTube
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
              </div>
            </section>

            {rest.length > 0 && (
              <section aria-labelledby="all-videos" className="mt-20">
                <h2 id="all-videos" className="text-[22px] font-semibold tracking-tight">
                  All tutorials <span className="font-mono text-[14px] font-normal text-[#6B6B60]">({videos.length})</span>
                </h2>
                <ul className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((v) => (
                    <li key={v.id}>
                      <div className="relative aspect-video overflow-hidden rounded-xl border border-black/10 bg-[#151515]">
                        <LiteYouTube id={v.id} title={v.title} thumbnail={v.thumbnail} />
                      </div>
                      <p className="mt-3 flex items-center gap-2 font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#6B6B60]">
                        <time dateTime={v.publishedAt}>{formatDate(v.publishedAt)}</time>
                        {v.isShort && <ShortChip />}
                      </p>
                      <h3 className="mt-1.5 text-[16.5px] font-semibold leading-snug">
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:underline hover:decoration-[#FFD400] hover:decoration-2 hover:underline-offset-4">
                          {v.title}
                        </a>
                      </h3>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        ) : (
          <div className="mt-12 rounded-2xl border border-black/10 bg-white p-10 text-center">
            <p className="text-[18px] font-semibold">Tutorials are on their way.</p>
            <p className="mt-2 text-[15px] text-[#6B6B60]">
              We are recording walkthroughs now. Subscribe to get them the day they go live.
            </p>
            <a
              href={subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              Visit the MyKavo channel
              <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        )}

        <div className="mt-20 rounded-2xl border border-[#151515] bg-[#151515] p-8 text-center">
          <p className={`${fontDisplay} text-2xl text-[#E9EBDF] sm:text-3xl`}>Know what changed. Fix what matters.</p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <GoogleButton onDark />
            <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
              or sign up with email
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
