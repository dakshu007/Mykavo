/**
 * Other products made by the team behind MyKavo. These are our own products,
 * not partners or integrations, and the copy says so.
 *
 * Descriptions are written only from what each product's own website says
 * (read October 2026). Keep them to one line, keep them factual, and do not
 * add user counts, ratings or features the product site does not state.
 *
 * Read by the /products page, the free tools hub and the Chrome extension
 * page, so a product is described the same way everywhere.
 */

export const OUR_PRODUCTS_PAGE_PATH = "/products";

/** Query parameter value that tells our other sites a visit came from MyKavo. */
export const OUR_PRODUCTS_REF = "mykavo";

export type OurProductKind = "app" | "extension";

export type OurProduct = {
  slug: string;
  name: string;
  kind: OurProductKind;
  /** Short platform label shown on the card, e.g. "Android app". */
  platform: string;
  /** One line, from the product's own site. */
  description: string;
  /** The product's homepage, untagged. Link through productHref(). */
  url: string;
};

export const OUR_PRODUCT_KINDS: Record<OurProductKind, { title: string; description: string }> = {
  app: {
    title: "Apps",
    description: "Standalone products for shops and everyday file work.",
  },
  extension: {
    title: "Chrome extensions",
    description: "Small, free tools for checking a page while you are on it.",
  },
};

export const OUR_PRODUCTS: readonly OurProduct[] = [
  {
    slug: "billzap",
    name: "BillZap",
    kind: "app",
    platform: "Android app",
    description:
      "A free GST billing app for shops in India that makes tax invoices offline, puts a UPI QR on every bill and shares the PDF on WhatsApp.",
    url: "https://billzap.app/",
  },
  {
    slug: "shrinkto",
    name: "ShrinkTo",
    kind: "app",
    platform: "Web app",
    description:
      "Compress JPG, PNG, WebP and AVIF images to an exact KB size in your browser with no upload or signup, plus a set of free PDF tools.",
    url: "https://shrinkto.com/",
  },
  {
    slug: "image-size-inspector",
    name: "Image Size Inspector",
    kind: "extension",
    platform: "Chrome extension",
    description:
      "Right-click any image to see its original and displayed dimensions, file size, format, color palette and alt text, with a screen color picker in the toolbar.",
    url: "https://imageinspect.netlify.app/",
  },
  {
    slug: "spacing-inspector",
    name: "Spacing Inspector",
    kind: "extension",
    platform: "Chrome extension",
    description:
      "Hover any element to see its margin and padding drawn on the page, with pixel values on all four sides.",
    url: "https://spacinginspector.netlify.app/",
  },
  {
    slug: "eeat-analyser",
    name: "EEAT Analyser",
    kind: "extension",
    platform: "Chrome extension",
    description:
      "Audit any page for Google's E-E-A-T signals in one click and get a ranked plan for fixing each gap.",
    url: "https://eeatanalyser.netlify.app/",
  },
];

export function ourProductsByKind(kind: OurProductKind): OurProduct[] {
  return OUR_PRODUCTS.filter((p) => p.kind === kind);
}

/**
 * The product URL tagged with ?ref=mykavo. Uses the URL API so any query the
 * product URL already carries is kept, and an existing ref is replaced rather
 * than duplicated.
 */
export function productHref(product: Pick<OurProduct, "url">): string {
  const url = new URL(product.url);
  url.searchParams.set("ref", OUR_PRODUCTS_REF);
  return url.toString();
}
