import type { ToolFaq } from "@/components/landing/tool-faq";

/** House rules: see the top of src/config/tool-faqs.ts. */
export const PAGE_SIZE_CHECKER_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I check the size of a web page?",
    a: "Enter the page URL and the checker downloads the HTML, lists every script, stylesheet, image, preloaded font and iframe it references, and downloads up to 40 of those files to measure them. It reports the HTML size, the total measured weight, a breakdown by file type and the 10 heaviest files.",
  },
  {
    q: "Why is the request count lower than in browser DevTools?",
    a: "Because this tool reads the HTML instead of running the page in a browser. Fonts and background images loaded from CSS, and anything JavaScript fetches after the page loads, never appear in the HTML, so they aren't counted. DevTools shows every request the browser actually made, which is usually more.",
  },
  {
    q: "Are the sizes compressed or uncompressed?",
    a: "The file sizes are uncompressed. Text files such as HTML, JavaScript and CSS are usually sent compressed with gzip or Brotli, so fewer bytes travel over the network than shown. When the server reports a compressed size for the HTML document, the checker shows that transfer size too. Images and fonts are already compressed, so their sizes are close to what is transferred.",
  },
  {
    q: "How big should a web page be?",
    a: "There is no official limit, so this tool uses rules of thumb rather than Google rules: an HTML document under about 100 KB, a total page weight under about 3 MB, fewer than about 80 requests, and no single file over 1 MB. Smaller is generally faster, especially on mobile connections, and images are usually the largest share of the weight.",
  },
];
