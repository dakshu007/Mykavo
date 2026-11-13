import type { Metadata } from "next";
import { Suspense } from "react";
import { Clarity } from "@/components/analytics/clarity";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { AttributionCapture } from "@/components/analytics/attribution-capture";
import { SmoothScroll } from "@/components/smooth-scroll";
import { NavigationProgress } from "@/components/navigation-progress";
import { DM_Sans, Geist_Mono, Poppins } from "next/font/google";
import { site } from "@/config/site";
import { campaignsForYear } from "@/config/campaign";
import "lenis/dist/lenis.css";
import "./globals.css";

// Google Analytics 4 property for mykavo.app - loaded in production only so
// dev sessions never pollute the data.
const GA_MEASUREMENT_ID = "G-DQMWRHWFK8";

// Site-wide body font: "Google Sans" is Google's proprietary font (not
// distributable), so the --font-sans stack in globals.css prefers a locally
// installed "Google Sans" and falls back to DM Sans - the closest free
// Google-Fonts match - which this loads for everyone.
const appSans = DM_Sans({
  variable: "--font-app-sans",
  subsets: ["latin"],
});

// Heading font: every h1/h2 site-wide renders in Poppins (globals.css base
// rule); the landing/blog display style shares this variable.
//
// Only the weights headings actually use. Every weight and style here is a
// separate preloaded file, and on a phone those preloads compete with first
// paint: 400 and the four italic files cost five extra downloads on every
// page for a handful of italic words, which the browser can slant instead.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
});

// Mono is only for small labels (eyebrows, the offer countdown), so it is
// not preloaded: it no longer competes with the page and the heading font
// for the first moments of a phone's connection. It still loads with the
// stylesheet, and the size-matched fallback keeps labels from shifting.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - Website Monitoring and AI Keyword & Blog Writer`,
    template: `%s - ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  // Primary + secondary target keywords (spec §48). The OG image lives at
  // src/app/opengraph-image.png (Next serves it site-wide automatically).
  keywords: [
    "site monitoring tools",
    "best site monitoring tools",
    "website monitoring tool",
    "site monitoring tool",
    "website change detection",
    "website change monitoring",
    "monitor website changes",
    "web page change detection",
    "website regression monitoring",
    "visual website monitoring",
    "website screenshot comparison",
    "SEO change monitoring",
    "meta tag monitoring",
    "broken link monitoring",
    "website uptime monitoring",
    "website monitoring for agencies",
    "website monitoring software",
    "ai blog writer",
    "ai seo blog post writer",
    "ai keyword research tool",
    "striking distance keywords",
    "search console keyword ideas",
  ],
  // Site-wide social defaults. No url here: an inherited og:url made every
  // page share as the homepage. Pages fill title/description/url from their
  // own metadata via withSocial() (lib/social-metadata.ts).
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
  category: "technology",
};

// Stamps the persisted theme choice on <html> before first paint (no FOUC).
// Absent/invalid values mean "follow the system" - CSS handles that via
// prefers-color-scheme, so only explicit choices are stamped. Keep in sync
// with THEME_STORAGE_KEY + applyThemePreference in src/lib/theme.ts.
const themeBootScript = `try{var t=localStorage.getItem("mykavo-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

// Reserves the seasonal offer bar's height before first paint while an
// offer's calendar window is open (config/campaign.ts), so the page never
// jumps when the bar arrives. The bar itself then checks the code with Dodo
// and gives the space back if the code isn't live.
// The attribute's value is the offer's theme, so the reserved strip can be
// painted in that offer's colour (globals.css) before the bar mounts.
const promoWindows = (() => {
  const year = new Date().getUTCFullYear();
  const out: [number, number, string][] = [];
  for (let y = year - 1; y < year + 10; y++) {
    for (const c of campaignsForYear(y)) out.push([c.startsAt.getTime(), c.endsAt.getTime(), c.theme]);
  }
  return out;
})();
const promoBootScript = `try{var n=Date.now(),w=${JSON.stringify(promoWindows)};for(var i=0;i<w.length;i++)if(n>=w[i][0]&&n<w[i][1]){document.documentElement.setAttribute("data-promo",w[i][2]);break}}catch(e){}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The boot script mutates <html> before React hydrates.
      suppressHydrationWarning
      className={`${appSans.variable} ${poppins.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: promoBootScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        {/* Site-wide, including the dashboard. Self-disables for
            prefers-reduced-motion and on touch; inner scroll containers opt
            out with data-lenis-prevent. */}
        <SmoothScroll />
        {/* Instant feedback on every internal link click, site-wide. */}
        <NavigationProgress />
        {/* Where a visitor first landed, for signup attribution (lib/attribution). */}
        <AttributionCapture />
        {children}
        {/* Google tag (gtag.js) - production only.
            Analytics waits for the visitor's first interaction (or a few
            seconds after load), so it never competes with the page loading.
            Page URLs are redacted before gtag sees them: private pages
            (/r/, /status/, /invite/, /unsubscribe, /connect/, /dashboard,
            sign-in) carry tokens in the path or query - see
            components/analytics/google-analytics.tsx. Google signals and ad
            personalisation are off: they add doubleclick.net third-party
            cookies (a Lighthouse best-practices failure and a privacy cost)
            for advertising features MyKavo does not use. Suspense: the
            component reads the query string, which must not opt the whole
            page out of prerendering. */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Suspense fallback={null}>
              <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
            </Suspense>
            {/* Microsoft Clarity: public pages only - see components/analytics/clarity.tsx. */}
            <Clarity />
          </>
        )}
      </body>
    </html>
  );
}
