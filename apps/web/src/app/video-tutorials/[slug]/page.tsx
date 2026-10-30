import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { withSocial } from "@/lib/social-metadata";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { site } from "@/config/site";
import {
  CHANNEL_URL,
  TUTORIALS_PATH,
  embedUrl,
  getTutorialVideos,
  watchPath,
  type TutorialVideo,
} from "@/lib/youtube";
import { ORGANIZATION_ID, WEBSITE_ID, breadcrumbList, jsonLdScript, organizationNode } from "@/lib/seo/structured-data";

type Params = { params: Promise<{ slug: string }> };

// Same cadence as the gallery: a new upload gets its page within 30 minutes.
export const revalidate = 1800;

export async function generateStaticParams() {
  return (await getTutorialVideos()).map((v) => ({ slug: v.slug }));
}

async function findVideo(slug: string): Promise<{ video: TutorialVideo; all: TutorialVideo[] } | null> {
  const all = await getTutorialVideos();
  const video = all.find((v) => v.slug === slug);
  return video ? { video, all } : null;
}

function summary(v: TutorialVideo, max = 155): string {
  const text = (v.description || "").replace(/https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (!text) return `${v.title}. A MyKavo video tutorial on website change and regression monitoring.`;
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(" ", max);
  return `${text.slice(0, cut > 0 ? cut : max).trimEnd()}...`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await findVideo(slug);
  if (!found) return {};
  const { video } = found;
  return withSocial({
    title: video.title,
    description: summary(video),
    alternates: { canonical: watchPath(video.slug) },
    openGraph: {
      type: "video.other",
      title: video.title,
      description: summary(video),
      url: watchPath(video.slug),
      images: [{ url: video.thumbnail, width: 480, height: 360, alt: video.title }],
      videos: [{ url: embedUrl(video.id), width: 1280, height: 720, type: "text/html" }],
    },
  });
}

/** One VideoObject as the page's main entity: what makes this a watch page to Google. */
function videoJsonLd(v: TutorialVideo) {
  const url = `${site.url}${watchPath(v.slug)}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebPage",
        "@id": `${url}#page`,
        url,
        name: v.title,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        primaryImageOfPage: v.thumbnail,
        mainEntity: { "@id": `${url}#video` },
      },
      {
        "@type": "VideoObject",
        "@id": `${url}#video`,
        name: v.title,
        description: v.description.trim() || summary(v),
        thumbnailUrl: [v.thumbnail],
        uploadDate: v.publishedAt,
        embedUrl: embedUrl(v.id),
        url,
        sameAs: v.url,
        inLanguage: "en",
        publisher: { "@id": ORGANIZATION_ID },
      },
    ],
  };
}

export default async function TutorialWatchPage({ params }: Params) {
  const { slug } = await params;
  const found = await findVideo(slug);
  if (!found) notFound();
  const { video, all } = found;
  const more = all.filter((v) => v.id !== video.id).slice(0, 6);

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(videoJsonLd(video)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Video tutorials", path: TUTORIALS_PATH },
              { name: video.title, path: watchPath(video.slug) },
            ]),
          ),
        }}
      />
      <LandingNav />
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <Link
          href={TUTORIALS_PATH}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6B6B60] hover:text-[#151515]"
        >
          <ArrowLeft className="size-4" aria-hidden /> All video tutorials
        </Link>

        {/* The video comes first and loads with the page: Google indexes a
            video only when it is the main content of its page. */}
        <div
          className={`relative mt-6 overflow-hidden rounded-2xl border border-[#151515] bg-[#151515] shadow-[6px_6px_0_#151515] ${
            video.isShort ? "mx-auto aspect-[9/16] max-w-sm" : "aspect-video"
          }`}
        >
          <iframe
            className="absolute inset-0 size-full"
            src={`${embedUrl(video.id)}?rel=0&modestbranding=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="mt-8 max-w-3xl">
          <p className={`${eyebrow} flex items-center gap-2`}>
            {"// video tutorial //"}
            <time dateTime={video.publishedAt} className="normal-case tracking-normal">
              {formatDate(video.publishedAt)}
            </time>
          </p>
          <h1 className={`${fontDisplay} mt-3 text-3xl leading-[1.12] sm:text-4xl`}>{video.title}</h1>
          {video.description.trim() && (
            <p className="mt-5 whitespace-pre-line break-words text-[15px] leading-7 text-[#3d3d38]">{video.description.trim()}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[14px] font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              Watch on YouTube <ArrowUpRight className="size-4" aria-hidden />
            </a>
            <a
              href={`${CHANNEL_URL}?sub_confirmation=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#151515] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black"
            >
              <span aria-hidden className="size-2 rounded-full bg-[#FF3B30]" />
              Subscribe
            </a>
          </div>
        </div>

        <section className="mt-14 rounded-2xl bg-[#151515] px-6 py-10 text-center sm:px-10">
          <h2 className={`${fontDisplay} text-3xl text-[#E9EBDF]`}>Try it on your own website.</h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-6 text-[#9C9E93]">
            MyKavo watches your pages and tells you when something important changes or breaks. Free plan, set up in
            minutes.
          </p>
          <div className="mt-7 flex flex-col items-center gap-3">
            <GoogleButton onDark from={`tutorial:${video.slug}`} />
            <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
              or sign up with email
            </Link>
          </div>
        </section>

        {more.length > 0 && (
          <section aria-labelledby="more-videos" className="mt-16">
            <h2 id="more-videos" className="text-[22px] font-semibold tracking-tight">
              More tutorials
            </h2>
            <ul className="mt-6 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((v) => (
                <li key={v.id}>
                  <Link href={watchPath(v.slug)} className="group block">
                    <div className="relative aspect-video overflow-hidden rounded-xl border border-black/10 bg-[#151515]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- remote YouTube thumbnail, no next/image domain configured */}
                      <img
                        src={v.thumbnail}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                      />
                    </div>
                    <p className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.1em] text-[#6B6B60]">
                      <time dateTime={v.publishedAt}>{formatDate(v.publishedAt)}</time>
                    </p>
                    <h3 className="mt-1 text-[16px] font-semibold leading-snug group-hover:underline group-hover:decoration-[#FFD400] group-hover:decoration-2 group-hover:underline-offset-4">
                      {v.title}
                    </h3>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
