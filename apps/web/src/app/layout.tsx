import type { Metadata } from "next";
import Script from "next/script";
import { DM_Sans, Geist_Mono, Poppins } from "next/font/google";
import { site } from "@/config/site";
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
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} - Website Monitoring Tool for Change & Regression Detection`,
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
  ],
  openGraph: {
    type: "website",
    siteName: site.name,
    title: `${site.name} - ${site.tagline}`,
    description: site.description,
    url: site.url,
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
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        {/* Google tag (gtag.js) - production only */}
        {process.env.NODE_ENV === "production" && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga-gtag" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
