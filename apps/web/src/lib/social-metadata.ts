import type { Metadata } from "next";

/**
 * Next.js doesn't copy a page's `title`/`description` into its Open Graph or
 * Twitter tags: a page that sets only those inherits the root layout's social
 * tags. Before this helper, ~90 pages shared as the homepage on LinkedIn,
 * Slack, X and WhatsApp (homepage title, description and og:url).
 *
 * withSocial() fills openGraph/twitter title, description and url from the
 * page's own metadata. Anything the page sets explicitly wins.
 *
 * The share image is set explicitly too: Next drops the inherited
 * app/opengraph-image.png as soon as a page declares its own openGraph, so
 * without this every such page shared with no picture. A segment's own
 * opengraph-image file (blog posts) still takes priority over this.
 */
const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "MyKavo - Know what changed. Fix what matters.",
};

export function withSocial(meta: Metadata): Metadata {
  const title =
    typeof meta.title === "string"
      ? meta.title
      : meta.title && typeof meta.title === "object" && "absolute" in meta.title
        ? meta.title.absolute
        : undefined;
  const description = typeof meta.description === "string" ? meta.description : undefined;
  const canonical = meta.alternates?.canonical;
  const url =
    typeof canonical === "string" || canonical instanceof URL
      ? canonical
      : canonical && typeof canonical === "object" && "url" in canonical
        ? canonical.url
        : undefined;

  return {
    ...meta,
    openGraph: {
      type: "website",
      siteName: "MyKavo",
      locale: "en_US",
      images: [SHARE_IMAGE],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(url ? { url } : {}),
      ...meta.openGraph,
    },
    twitter: {
      card: "summary_large_image",
      images: [SHARE_IMAGE],
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...meta.twitter,
    },
  };
}
