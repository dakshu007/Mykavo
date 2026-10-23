import Link from "next/link";
import { Check } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import { WpPluginInstall } from "@/components/landing/wp-plugin-download";
import { TRIAL_DAYS } from "@mykavo/shared/plan-tier";
import { WP_PLUGIN_PAGE_PATH, WP_PLUGIN_REQUIRES } from "@/config/wordpress-plugin";
import { cn } from "@/lib/utils";
import { parsePost, withMidpointSlot, type FaqItem, type PostHeading, type SegmentOrSlot } from "./blocks";
import { BlogMarkdown } from "./markdown";

/**
 * Renders a post's markdown plus its shortcode blocks ({{cta}}, {{cta-wordpress}}, {{toc}},
 * {{faq}}…{{/faq}}) in author order. Used by both the public post page and
 * the editor live preview, so the preview shows exactly what readers see.
 */
export function PostContent({ content, midpoint }: { content: string; midpoint?: React.ReactNode }) {
  const { segments: parsed } = parsePost(content);
  // An in-article block (the post's free tool) goes between sections, mid-read.
  const segments: SegmentOrSlot[] = midpoint ? withMidpointSlot(parsed) : parsed;
  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
          case "slot":
            return <div key={index}>{midpoint}</div>;
          case "markdown":
            return (
              <BlogMarkdown
                key={index}
                content={segment.content}
                headingIds={segment.headingIds}
              />
            );
          case "cta":
            return <CtaBlock key={index} />;
          case "cta-wordpress":
            return <WordpressCtaBlock key={index} />;
          case "toc":
            // Superseded by the automatic table of contents; see TocBlock.
            return null;
          case "faq":
            return <FaqBlock key={index} items={segment.items} />;
        }
      })}
    </>
  );
}

/**
 * {{cta}} - inline "Try MyKavo" card, placed mid-article by the author.
 * Built to stop a skimming reader: dark, high-contrast, a concrete example of
 * what an alert looks like, the three reasons to start and one clear action.
 * Fixed colors (not theme tokens) so it reads the same on the public page and
 * in the editor preview's dark theme. The example alert is labelled as one.
 */
const CTA_POINTS = [
  "Titles, canonicals, noindex, scripts, links and buy buttons checked on every scan",
  "Before-and-after proof, ranked by severity",
  "Email, Slack and push alerts the day it happens",
];

function CtaBlock() {
  return (
    <aside className="my-10 overflow-hidden rounded-[24px] border border-[#151515] bg-[#151515] text-left shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <div className="grid gap-8 px-6 py-8 sm:px-9 sm:py-10 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:items-center">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD400]">
            Stop finding out from customers
          </p>
          <p className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-tight text-[#F4F5EE] sm:text-[32px]">
            Know the moment your site breaks.{" "}
            <span className="text-[#FFD400]">Not weeks later.</span>
          </p>
          <ul className="mt-5 space-y-2.5">
            {CTA_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-[14px] leading-6 text-[#D9DBD0]">
                <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <GoogleButton size="md" from="blog:inline" />
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#FFD400] px-6 text-[14px] font-semibold text-[#151515] transition-colors hover:bg-[#FFE14D]"
            >
              Start free with email
            </Link>
          </div>
          <p className="mt-4 text-[12.5px] text-[#9C9E93]">
            Free plan · {TRIAL_DAYS}-day Pro trial · No credit card required
          </p>
        </div>
        <div aria-hidden className="hidden min-w-0 md:block">
          <div className="rounded-2xl border border-white/10 bg-[#1F2023] p-4">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#9C9E93]">Example alert</p>
            <div className="mt-3 rounded-xl bg-white p-4 text-[#151515]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FDE2E1] px-2.5 py-1 text-[12px] font-semibold text-[#B42318]">
                  <span className="size-1.5 rounded-full bg-current" />
                  Critical
                </span>
                <span className="font-mono text-[11px] text-[#6B6B60]">2 min ago</span>
              </div>
              <p className="mt-2.5 text-[15px] font-semibold leading-snug">&quot;Add to cart&quot; is missing</p>
              <p className="mt-1 font-mono text-[11.5px] text-[#6B6B60]">yourstore.com/products/coffee</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
                <div className="rounded-lg bg-[#F1F2EC] px-2.5 py-2">
                  <p className="font-semibold text-[#6B6B60]">Baseline</p>
                  <p className="mt-0.5">Button visible</p>
                </div>
                <div className="rounded-lg bg-[#FDE2E1] px-2.5 py-2">
                  <p className="font-semibold text-[#B42318]">Current</p>
                  <p className="mt-0.5">Not found</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const WP_CTA_POINTS = [
  "A check after every plugin, theme and WordPress update",
  "The update named when something broke",
  "Nothing added to the pages your visitors load",
];

/**
 * {{cta-wordpress}} - "Try the WordPress plugin" card for posts about
 * WordPress. Theme-tokened like {{cta}} so it reads in the editor preview's
 * dark theme too; the download button counts clicks with placement "blog".
 */
function WordpressCtaBlock() {
  return (
    <aside className="my-8 overflow-hidden rounded-tile border border-[#151515] bg-card text-left shadow-[5px_5px_0_#FFD400]">
      <div className="px-6 py-7 sm:px-8">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-secondary">
          Free WordPress plugin
        </p>
        <p className="mt-2 text-2xl font-semibold leading-tight tracking-tight text-ink">
          Update WordPress without fear.
        </p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-secondary">
          Try the MyKavo WordPress plugin: it checks your pages after every update and shows
          exactly what changed, with before-and-after screenshots, right inside wp-admin.
        </p>
        <ul className="mt-4 space-y-2">
          {WP_CTA_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-sm text-ink">
              <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <WpPluginInstall placement="blog" />
          <Link
            href={WP_PLUGIN_PAGE_PATH}
            className="inline-flex items-center justify-center rounded-full border border-line px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-[12px] text-ink-faint">
          WordPress {WP_PLUGIN_REQUIRES.wordpress}+ · PHP {WP_PLUGIN_REQUIRES.php}+ · GPL · Free on every MyKavo plan
        </p>
      </div>
    </aside>
  );
}

/** {{faq}} - accessible accordion; the page also emits FAQPage JSON-LD. */
function FaqBlock({ items }: { items: FaqItem[] }) {
  return (
    <section className="my-8">
      <h2 className="text-xl font-semibold tracking-tight text-ink">
        Frequently asked questions
      </h2>
      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <details
            key={index}
            className="group rounded-tile border border-line bg-card px-5 py-4"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
              {item.question}
              <span
                aria-hidden
                className="shrink-0 text-ink-faint transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="mt-3 border-t border-line pt-3">
              <BlogMarkdown content={item.answer} className="text-sm" />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * Collapsible table of contents for screens without the right rail (below
 * lg). It replaces the old inline {{toc}} card, which duplicated the rail on
 * desktop; {{toc}} tokens left in older posts now render nothing.
 */
export function PostTocMobile({ headings, className }: { headings: PostHeading[]; className?: string }) {
  return (
    <details className={cn("group rounded-card bg-card px-5 py-4 shadow-card lg:hidden", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
        On this page
        <span aria-hidden className="text-ink-faint transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <nav aria-label="Table of contents" className="mt-3 border-t border-line pt-3">
        <TocList headings={headings} />
      </nav>
    </details>
  );
}

/**
 * Sticky right-rail ToC card for the public post page (hidden below lg by
 * the caller; only shown when the post has at least two headings).
 */
export function PostTocRail({
  headings,
  sticky = true,
}: {
  headings: PostHeading[];
  /** False when the caller already wraps the rail in its own sticky column. */
  sticky?: boolean;
}) {
  return (
    <nav
      aria-label="Table of contents"
      data-lenis-prevent
      className={cn(
        "overflow-y-auto rounded-card bg-card p-6 shadow-card",
        sticky ? "sticky top-24 max-h-[calc(100vh-8rem)]" : "max-h-[calc(100vh-24rem)]",
      )}
    >
      <p className="label-micro">Table of contents</p>
      <TocList headings={headings} className="mt-3" />
    </nav>
  );
}

/** Numbered h2 entries with indented h3 sub-entries linking to anchors. */
function TocList({ headings, className }: { headings: PostHeading[]; className?: string }) {
  const entries = headings.map((heading, index) => ({
    heading,
    number:
      heading.depth === 2
        ? headings.slice(0, index + 1).filter((h) => h.depth === 2).length
        : undefined,
  }));
  return (
    <ol className={cn("space-y-2", className)}>
      {entries.map(({ heading, number }) => (
        <li key={heading.id} className={heading.depth === 3 ? "pl-6" : undefined}>
          <a
            href={`#${heading.id}`}
            className="group flex items-baseline gap-2 text-sm leading-5 text-ink-secondary transition-colors hover:text-accent"
          >
            {number !== undefined && (
              <span className="w-4 shrink-0 font-mono text-[11px] font-medium text-ink-faint group-hover:text-accent">
                {number}.
              </span>
            )}
            <span className="min-w-0">{heading.text}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
