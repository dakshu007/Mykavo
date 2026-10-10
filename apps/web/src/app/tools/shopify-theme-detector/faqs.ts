import type { ToolFaq } from "@/components/landing/tool-faq";

/** FAQ for the Shopify Theme & App Detector. House rules: top of config/tool-faqs.ts. */
export const SHOPIFY_DETECTOR_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I find out what Shopify theme a store is using?",
    a: "Enter the store's URL. Every Shopify storefront publishes a small Shopify.theme object in its HTML, and the detector reads it: the theme the store was built from (such as Dawn), its version, the name the merchant gave it, and whether it came from the Shopify Theme Store.",
  },
  {
    q: "Why is the theme name different from the theme it shows as the original?",
    a: "Merchants can rename a theme in their theme library, so a store running Dawn might call it \"Main 2025\". The detector shows both: the original theme from the theme's schema, and the renamed version when the two differ. A theme with no Theme Store ID was built custom or bought outside the Theme Store.",
  },
  {
    q: "Can it see every app a Shopify store uses?",
    a: "No tool working from outside the store can. It finds apps that load scripts, styles or theme app extensions on the page you checked, and names well-known ones such as Klaviyo, Judge.me and Recharge. Apps that work only in the Shopify admin, like inventory or reporting tools, and apps that load only on other pages leave nothing on that page to detect.",
  },
  {
    q: "Can a theme update or a new app break a Shopify store?",
    a: "Yes, and usually without any error: the store still loads while an app script disappears, a section changes, or an add-to-cart button is hidden. MyKavo monitors storefront pages from the outside with nothing to install, and alerts you when scripts, SEO tags, or buttons you choose to watch change.",
  },
];
