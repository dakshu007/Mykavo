export const site = {
  name: "MyKavo",
  tagline: "Know what changed. Fix what matters.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mykavo.app",
  description:
    "MyKavo continuously monitors websites for important visual, SEO, technical, performance, script, link, and conversion changes — then alerts users before small problems become expensive problems.",
  longDescription:
    "MyKavo is a website change detection and regression monitoring platform built for agencies, developers, SEO teams, and website owners managing important websites. MyKavo creates approved website baselines, automatically scans monitored pages, detects meaningful changes, shows clear before-and-after comparisons, and alerts users when important regressions require attention.",
  category: "Website Change & Regression Monitoring SaaS",
} as const;
