import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Gauge,
  HeartPulse,
  Lock,
  MousePointerClick,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { WpPluginInstall, WpPluginRepoLink } from "@/components/landing/wp-plugin-download";
import { WpUpdateAnimation } from "@/components/landing/wp-update-animation";
import { PartnerLockup } from "@/components/landing/partner-lockup";
import { TrackOnView } from "@/components/track-on-view";
import { plans } from "@/config/plans";
import { site } from "@/config/site";
import {
  WP_PLUGIN_DIRECTORY_URL,
  WP_PLUGIN_DIRECTORY_ZIP_URL,
  WP_PLUGIN_PAGE_PATH,
  WP_PLUGIN_REQUIRES,
  WP_PLUGIN_VERSION,
} from "@/config/wordpress-plugin";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "WordPress Plugin - Check Your Site After Every Update",
  description:
    "The free MyKavo WordPress plugin checks your pages after every plugin, theme and WordPress update, names the update that broke something, and shows before-and-after screenshots in wp-admin. Nothing added to your public pages.",
  keywords: [
    "WordPress update broke my site",
    "WordPress plugin update checker",
    "WordPress visual regression plugin",
    "WordPress change monitoring plugin",
    "safe WordPress updates",
    "WordPress site monitoring plugin",
    "WooCommerce checkout monitoring",
  ],
  alternates: { canonical: WP_PLUGIN_PAGE_PATH },
  openGraph: {
    title: "MyKavo for WordPress - update without fear",
    description:
      "A check after every plugin, theme and WordPress update, with the update named if something broke. Free plugin, zero front-end impact.",
    url: WP_PLUGIN_PAGE_PATH,
    images: [{ url: "/wordpress/safe-updates.webp", width: 1440, height: 1100 }],
  },
};

const zeroCost = [
  { value: "0", label: "scripts or styles on your public pages" },
  { value: "0", label: "database queries when visitors load a page" },
  { value: "0", label: "autoloaded options" },
  { value: "0", label: "cron jobs or custom tables" },
];

const safeUpdatePoints = [
  "Every plugin, theme, WordPress and translation update is checked - including automatic updates that run overnight.",
  "Switching a plugin on or off, or changing the theme, is checked too. Those break sites as often as updates.",
  "A plain verdict: “Verified - nothing changed”, or “3 changes found after this update” with the evidence one click away.",
  "Every change found afterwards is labelled with the update it appeared after, so you know where to look.",
  "The Plugins screen warns you before you update a plugin whose last update changed your site.",
];

const features: Array<{
  icon: typeof Bell;
  title: string;
  desc: string;
}> = [
  {
    icon: MousePointerClick,
    title: "One-click decisions",
    desc: "Accept an intentional change as the new baseline, mark it fixed, or ignore it, without leaving WordPress.",
  },
  {
    icon: PlugZap,
    title: "Monitor with MyKavo",
    desc: "A link under every published page and post adds it to monitoring. Or paste any address on the Pages tab.",
  },
  {
    icon: HeartPulse,
    title: "Site Health",
    desc: "MyKavo's status appears in Tools → Site Health, with a MyKavo section in the Info tab for support requests.",
  },
  {
    icon: Bell,
    title: "Badge and dashboard widget",
    desc: "The admin menu shows how many important changes are waiting. A small Dashboard widget shows the status.",
  },
  {
    icon: RefreshCw,
    title: "Scan on demand",
    desc: "Run a scan from wp-admin and watch the progress live. Manual scans come with Pro and Agency.",
  },
  {
    icon: Gauge,
    title: "Uptime, speed and SSL",
    desc: "Uptime over 24 hours and 7 days, average response time and days until the certificate expires, at a glance.",
  },
];

const cliLines: Array<{ kind: "cmd" | "out" | "ok"; text: string }> = [
  { kind: "cmd", text: "wp plugin update --all" },
  { kind: "out", text: "Success: Updated 3 of 3 plugins." },
  { kind: "cmd", text: "wp mykavo scan --wait" },
  { kind: "out", text: "Scan scn_8f3k2 started." },
  { kind: "out", text: "  5 of 12 pages checked..." },
  { kind: "ok", text: "Success: Verified - nothing changed." },
];

const cliCommands = [
  ["wp mykavo status", "Status, open changes and next scan"],
  ["wp mykavo changes", "Changes as a table, JSON or CSV"],
  ["wp mykavo scan --wait", "Scan now; exits with an error if something important changed"],
  ["wp mykavo monitor <url>", "Start monitoring pages"],
  ["wp mykavo updates", "Recent updates and their verdicts"],
];

const performance = [
  "On a visitor's request the plugin only registers hooks. Nothing loads until WordPress updates something, switches a plugin, or an administrator opens a MyKavo screen.",
  "Assets load on the MyKavo screen alone, built on scripts WordPress already ships.",
  "Remote calls happen only while an administrator is looking, cached and time-limited - or once, right after an update.",
  "Screenshots load from MyKavo straight into your browser through signed, expiring links, never through your server.",
  "Scanning runs on MyKavo's servers, the same way a visitor loads your pages.",
];

const security = [
  "Connecting uses an OAuth-style approval with PKCE. You approve on mykavo.app; nothing to copy and paste.",
  "Your site receives a key that works for that one website only. The key stays on your server - the browser never sees it.",
  "Only administrators can see or act on monitoring.",
  "Disconnect at any time, from WordPress or from your MyKavo account. Deleting the plugin removes everything it stored.",
  "Nothing about your visitors is ever collected or sent.",
];

const steps = [
  {
    step: "01",
    title: "Install",
    desc: "In WordPress go to Plugins → Add New, search for MyKavo, then install and activate it.",
  },
  {
    step: "02",
    title: "Connect",
    desc: "Open MyKavo in the admin menu and press Connect. Sign in or create a free account, choose the website, approve.",
  },
  {
    step: "03",
    title: "Update without fear",
    desc: "The next update is checked automatically. The verdict shows in WordPress, and by email or Slack if you switch those alerts on.",
  },
];

const faqs = [
  {
    q: "Will the plugin slow down my website?",
    a: "No. It adds nothing to the pages your visitors load: no scripts, no styles, no database queries and no remote requests. It stores no autoloaded options and runs no cron jobs. Everything it does happens inside wp-admin or right after WordPress updates something, and the scanning itself runs on MyKavo's servers.",
  },
  {
    q: "Is the plugin free?",
    a: "Yes. The plugin is free on every plan, and MyKavo has a free plan: one website, five monitored pages and weekly scans, with no card required. Safe Updates - the automatic check after every update - and on-demand scans are part of the Pro ($20/month) and Agency ($49/month) plans. On Free, every update is still listed so you know what changed and when.",
  },
  {
    q: "How does it know which update broke something?",
    a: "WordPress tells the plugin what it is updating and the versions before and after. The plugin sends that list to MyKavo when the update finishes, and MyKavo scans your monitored pages against their approved baseline right away. Anything that changed is recorded with that update attached, so each change says which update it appeared after.",
  },
  {
    q: "Does it work with WooCommerce, Elementor and my theme?",
    a: "Yes. MyKavo checks the rendered pages your visitors see, so it works with any theme, page builder or plugin. With WooCommerce active, the plugin also shows whether your Shop, Cart, Checkout and My account pages are monitored and adds the missing ones in one click.",
  },
  {
    q: "Is it on WordPress.org?",
    a: "Yes. MyKavo is in the WordPress.org plugin directory, so you can install it from Plugins → Add New and get updates like any other plugin. The listing is at wordpress.org/plugins/mykavo, where you can also download the zip and upload it under Plugins → Add New → Upload Plugin. It is released under the GPL.",
  },
  {
    q: "What does the plugin send to MyKavo?",
    a: "Only what it needs: your site's address when you connect, the names and version numbers of what was updated or switched on or off, the addresses of pages you choose to monitor, and the actions you take in the MyKavo screen. Nothing about your visitors is ever sent.",
  },
  {
    q: "Can I use it from the command line?",
    a: "Yes. With WP-CLI, `wp mykavo scan --wait` runs a scan and waits for the verdict, exiting with an error if something important changed - handy right after `wp plugin update --all`. Other commands show the status, list changes, add pages and list recent updates.",
  },
  {
    q: "What versions of WordPress and PHP does it support?",
    a: `WordPress ${WP_PLUGIN_REQUIRES.wordpress} or newer, tested up to ${WP_PLUGIN_REQUIRES.testedUpTo}, on PHP ${WP_PLUGIN_REQUIRES.php} or newer. Each site in a multisite network connects on its own.`,
  },
];

const pluginJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "SoftwareApplication",
      "@id": `${site.url}${WP_PLUGIN_PAGE_PATH}#plugin`,
      name: "MyKavo for WordPress",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "WordPress plugin",
      operatingSystem: `WordPress ${WP_PLUGIN_REQUIRES.wordpress}+`,
      softwareVersion: WP_PLUGIN_VERSION,
      downloadUrl: WP_PLUGIN_DIRECTORY_ZIP_URL,
      installUrl: WP_PLUGIN_DIRECTORY_URL,
      sameAs: [WP_PLUGIN_DIRECTORY_URL],
      url: `${site.url}${WP_PLUGIN_PAGE_PATH}`,
      license: "https://www.gnu.org/licenses/gpl-2.0.html",
      description: metadata.description,
      screenshot: `${site.url}/wordpress/safe-updates.webp`,
      publisher: { "@id": ORGANIZATION_ID },
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: String(plan.priceMonthlyUsd),
        priceCurrency: "USD",
        url: `${site.url}/pricing`,
      })),
    },
  ],
};

function Shot({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#151515] bg-white ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#F3F1E6] px-3 py-2" aria-hidden>
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="ml-2 truncate rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] text-[#6B6B60]">
          your-site.com/wp-admin/admin.php?page=mykavo
        </span>
      </div>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-7 text-[#151515]/90">
      <CheckCircle2 className="mt-1 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export default function WordPressPluginPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(pluginJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "WordPress plugin", path: WP_PLUGIN_PAGE_PATH }])),
        }}
      />
      <TrackOnView event="wp_plugin_viewed" />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <PartnerLockup partner="wordpress" className="mb-7" />
            <p className={`${eyebrow} mb-4`}>{"// mykavo for wordpress //"}</p>
            <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}>
              Update WordPress
              <br />
              <span className="relative inline-block whitespace-nowrap">
                <span
                  aria-hidden
                  className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
                />
                <span className="relative">without fear.</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#6B6B60]">
              The MyKavo plugin checks your pages after every plugin, theme and WordPress update -
              and whenever a plugin is switched on or off - then tells you whether anything broke,
              and exactly which change did it. All inside wp-admin, with nothing added to the pages
              your visitors load.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <WpPluginInstall placement="hero" />
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#F3F1E6]"
              >
                Create a free account
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-5 text-[#151515]">
              <WpPluginRepoLink placement="hero" />
            </div>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
              Free plugin · WordPress {WP_PLUGIN_REQUIRES.wordpress} to {WP_PLUGIN_REQUIRES.testedUpTo} · PHP{" "}
              {WP_PLUGIN_REQUIRES.php}+ · GPL
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            <Shot
              src="/wordpress/overview.webp"
              alt="The MyKavo screen in wp-admin: overall status, uptime, response time, SSL, and the changes that need attention first"
              width={1440}
              height={1000}
              priority
              className="shadow-[10px_10px_0_#FFD400,10px_10px_0_1px_#151515]"
            />
          </div>
        </section>

        {/* Zero front-end cost */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// built to never slow your site down //"}</p>
            <h2 className={`${fontDisplay} text-center text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              Plugins get deleted for being slow.
              <br />
              <span className="text-[#FFD400]">This one costs your visitors nothing.</span>
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {zeroCost.map((z) => (
                <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                  <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                  <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Safe Updates */}
        <section id="safe-updates" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// safe updates //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                Know which update
                <br />
                <span className="text-[#6B6B60]">broke it.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Updates are the most common way a WordPress site breaks, and the hardest part is
                working out which one did it. Safe Updates answers that the moment the update
                finishes.
              </p>
              <ul className="mt-8 space-y-3.5">
                {safeUpdatePoints.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
              <p className="mt-7 text-sm text-[#6B6B60]">
                Automatic checks come with Pro and Agency. On Free, every update is still listed.
              </p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-[18px] border-2 border-[#151515] bg-[#FBFAF6] shadow-[10px_10px_0_#FFD400]">
              <WpUpdateAnimation />
            </div>
          </div>
          <div className="mx-auto mt-16 max-w-4xl">
            <p className={`${eyebrow} mb-4 text-center`}>{"// the update history, in wp-admin //"}</p>
            <Shot
              src="/wordpress/safe-updates.webp"
              alt="Safe Updates history in WordPress: each update, plugin switch and theme change with a verdict such as Verified - nothing changed, or 2 changes found"
              width={1440}
              height={1100}
              className="shadow-[8px_8px_0_#151515]"
            />
          </div>
          <div className="mt-10 overflow-hidden rounded-2xl border border-black/10 bg-white p-5">
            <p className={`${eyebrow} mb-3`}>{"// on the plugins screen //"}</p>
            <div className="overflow-x-auto rounded-lg border border-black/10 bg-white px-4 py-3">
              <Image
                src="/wordpress/plugins-screen.webp"
                alt="On the Plugins screen, next to a plugin with an update waiting: MyKavo: last time this plugin updated (8.1.0 to 8.2.0), 2 things changed on your site."
                width={1384}
                height={40}
                sizes="692px"
                className="h-auto w-[692px] max-w-none"
              />
            </div>
          </div>
        </section>

        {/* Evidence */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// the evidence //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              See exactly what changed.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
              Every change is ranked Critical to Info, with the old and new version side by side -
              the screenshots, and the exact values: title, meta description, robots tag, canonical,
              button text and more.
            </p>
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              <figure>
                <Shot
                  src="/wordpress/before-after.webp"
                  alt="A change in WordPress with a before-and-after slider across the page screenshots"
                  width={1440}
                  height={1000}
                />
                <figcaption className="mt-3 text-sm text-[#6B6B60]">
                  Drag across the old and new page, or switch to the highlighted differences.
                </figcaption>
              </figure>
              <figure>
                <Shot
                  src="/wordpress/values.webp"
                  alt="A change showing the old and new values side by side"
                  width={1440}
                  height={1000}
                />
                <figcaption className="mt-3 text-sm text-[#6B6B60]">
                  Old and new values side by side, from robots tags to button text.
                </figcaption>
              </figure>
            </div>
          </div>
        </section>

        {/* WooCommerce */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div className="order-2 flex justify-center lg:order-1">
              <Image
                src="/wordpress/store-card.webp"
                alt="Protect your store: WooCommerce Shop, Cart, Checkout and My account pages, each marked as not monitored, with a button to monitor all four"
                width={862}
                height={772}
                sizes="(min-width: 1024px) 431px, 90vw"
                className="h-auto w-full max-w-[431px] rounded-2xl border border-[#151515] shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className={`${eyebrow} mb-4`}>{"// for woocommerce stores //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                A broken checkout
                <br />
                <span className="text-[#6B6B60]">costs sales every minute.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                With WooCommerce active, the plugin shows whether your Shop, Cart, Checkout and My
                account pages are monitored, and adds the missing ones in one click. If an update
                hides the checkout button or breaks the cart, you hear about it first.
              </p>
            </div>
          </div>
        </section>

        {/* Everything else */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// in wp-admin //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Everything in the dashboard,
              <br />
              <span className="text-[#6B6B60]">right where you work.</span>
            </h2>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="bg-white p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400]">
                    <f.icon className="size-5 text-[#151515]" aria-hidden />
                  </span>
                  <h3 className={`${fontDisplay} mt-5 text-[20px] text-[#151515]`}>{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-6.5 text-[#6B6B60]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* WP-CLI */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// wp-cli //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                Update everything.
                <br />
                <span className="text-[#6B6B60]">Wait for the verdict.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                For agencies that script their maintenance runs. <code className="font-mono text-[13px]">wp mykavo scan --wait</code>{" "}
                exits with an error when something important changed, so a broken update stops the
                run instead of reaching the client.
              </p>
              <dl className="mt-7 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
                {cliCommands.map(([cmd, what]) => (
                  <div key={cmd} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <dt className="font-mono text-[13px] text-[#151515]">{cmd}</dt>
                    <dd className="text-[13px] text-[#6B6B60]">{what}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#151515] bg-[#151515] shadow-[8px_8px_0_#FFD400]">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                <Terminal className="size-4 text-[#9C9E93]" aria-hidden />
                <span className="font-mono text-[11px] text-[#9C9E93]">ssh client-site</span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-7">
                {cliLines.map((l, i) => (
                  <div
                    key={i}
                    className={l.kind === "cmd" ? "text-[#E9EBDF]" : l.kind === "ok" ? "text-[#FFD400]" : "text-[#9C9E93]"}
                  >
                    {l.kind === "cmd" ? <span className="text-[#FFD400]">$ </span> : null}
                    {l.text}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </section>

        {/* Performance + security */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto grid max-w-6xl gap-6 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div className="rounded-2xl border border-black/10 bg-white p-8">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400]">
                <Gauge className="size-5 text-[#151515]" aria-hidden />
              </span>
              <h2 className={`${fontDisplay} mt-5 text-3xl text-[#151515]`}>The performance contract</h2>
              <ul className="mt-6 space-y-3.5">
                {performance.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-8">
              <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400]">
                <Lock className="size-5 text-[#151515]" aria-hidden />
              </span>
              <h2 className={`${fontDisplay} mt-5 text-3xl text-[#151515]`}>Secure by design</h2>
              <ul className="mt-6 space-y-3.5">
                {security.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Install */}
        <section id="install" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// set up in two minutes //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
            Install. Connect. <span className="text-[#6B6B60]">Done.</span>
          </h2>
          <div className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-3">
            <div aria-hidden className="absolute left-0 right-0 top-[22px] hidden border-t-2 border-dashed border-[#151515]/15 sm:block" />
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <span className="relative inline-flex items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] px-4 py-2 font-mono text-[13px] font-bold text-[#151515] shadow-[3px_3px_0_#151515]">
                  {s.step}
                </span>
                <h3 className={`${fontDisplay} mt-5 text-[22px] leading-snug text-[#151515]`}>{s.title}</h3>
                <p className="mt-2.5 text-[14px] leading-6.5 text-[#6B6B60]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center gap-4 text-[#151515]">
            <WpPluginInstall placement="install" />
            <WpPluginRepoLink placement="install" />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// pricing //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              The plugin is free. <span className="text-[#6B6B60]">So is MyKavo, to start.</span>
            </h2>
            <div className="mx-auto mt-14 grid max-w-5xl gap-6 lg:grid-cols-3">
              {plans.map((plan) => {
                const pro = plan.highlighted;
                const rows: Array<[string, boolean | string]> = [
                  ["WordPress plugin", true],
                  ["Websites", String(plan.limits.websites)],
                  ["Pages per website", String(plan.limits.pagesPerWebsite)],
                  ["Scans", plan.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly"],
                  ["Safe Updates checks", plan.limits.deployChecks],
                  ["Scan from WordPress", plan.limits.manualScans],
                  ["White-label client reports", plan.limits.whiteLabelReports],
                ];
                return (
                  <div
                    key={plan.id}
                    className={`flex flex-col rounded-2xl border p-7 ${
                      pro ? "border-[#151515] bg-[#FFD400] shadow-[7px_7px_0_#151515]" : "border-black/10 bg-white"
                    }`}
                  >
                    <h3 className={`${fontDisplay} text-2xl text-[#151515]`}>{plan.name}</h3>
                    <p className="mt-3">
                      <span className={`${fontDisplay} text-4xl text-[#151515]`}>${plan.priceMonthlyUsd}</span>
                      <span className="text-sm text-[#151515]/70"> / month</span>
                    </p>
                    <dl className="mt-6 flex-1 space-y-2.5">
                      {rows.map(([label, v]) => (
                        <div key={label} className="flex items-center justify-between gap-3 text-[14px]">
                          <dt className="text-[#151515]/80">{label}</dt>
                          <dd className="font-semibold text-[#151515]">
                            {typeof v === "boolean" ? (
                              v ? (
                                <CheckCircle2 className="size-4.5" aria-label="Included" />
                              ) : (
                                <span className="text-[#151515]/35" aria-label="Not included">
                                  -
                                </span>
                              )
                            ) : (
                              v
                            )}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <Link
                      href="/signup"
                      className="mt-7 rounded-full border border-[#151515] bg-[#151515] px-6 py-3 text-center text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
                    >
                      {plan.priceMonthlyUsd === 0 ? "Start free" : `Start with ${plan.name}`}
                    </Link>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-center text-sm text-[#6B6B60]">
              Every plan, side by side, on the{" "}
              <Link
                href="/pricing"
                className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                pricing page
              </Link>
              .
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-5 py-20 lg:py-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}>
            Plugin questions.
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-black/10 bg-white px-6 py-5 transition-colors open:border-[#151515] open:pb-6 open:shadow-[4px_4px_0_#FFD400]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-[#6B6B60] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-24 lg:px-8">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-16 text-center shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <ShieldCheck className="mx-auto size-10 text-[#FFD400]" aria-hidden />
            <h2 className={`${fontDisplay} mx-auto mt-5 max-w-xl text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              The next update is <span className="text-[#FFD400]">already on its way.</span>
            </h2>
            <p className="mx-auto mb-8 mt-3 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              Install the plugin before it lands, and find out what it changed the moment it does.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <WpPluginInstall placement="footer_cta" />
              <Link
                href="/website-monitoring-for-wordpress"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-[#E9EBDF] transition-colors hover:border-[#FFD400]"
              >
                Why WordPress sites need monitoring
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
