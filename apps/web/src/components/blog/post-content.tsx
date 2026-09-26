import Link from "next/link";
import { Check } from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import { WpPluginInstall } from "@/components/landing/wp-plugin-download";
import { WP_PLUGIN_PAGE_PATH, WP_PLUGIN_REQUIRES } from "@/config/wordpress-plugin";
import { cn } from "@/lib/utils";
import { parsePost, type FaqItem, type PostHeading } from "./blocks";
import { BlogMarkdown } from "./markdown";

/**
 * Renders a post's markdown plus its shortcode blocks ({{cta}}, {{cta-wordpress}}, {{toc}},
 * {{faq}}…{{/faq}}) in author order. Used by both the public post page and
 * the editor live preview, so the preview shows exactly what readers see.
 */
export function PostContent({ content }: { content: string }) {
  const { segments, headings } = parsePost(content);
  return (
    <>
      {segments.map((segment, index) => {
        switch (segment.type) {
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
            return <TocBlock key={index} headings={headings} />;
          case "faq":
            return <FaqBlock key={index} items={segment.items} />;
        }
      })}
    </>
  );
}

/**
 * {{cta}} - inline "Try MyKavo" card. The button is fixed brand gold (ink
 * text) so it reads the same on the light public page and in the editor
 * preview's dark theme; the surrounding text stays theme-tokened.
 */
function CtaBlock() {
  return (
    <aside className="my-8 rounded-tile border border-[#FFD400]/60 bg-[#FFD400]/10 px-6 py-8 text-center sm:px-8">
      <p className="text-2xl font-semibold leading-tight tracking-tight text-ink">
        Website monitoring,
        <br />
        page by page.
      </p>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-secondary">
        MyKavo checks every page that matters for visual, SEO, link, script and
        performance changes - and shows you exactly what changed, before your
        customers notice.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <GoogleButton size="md" />
        <Link href="/signup" className="text-[12.5px] text-ink-secondary underline underline-offset-4 hover:text-ink">
          or sign up with email
        </Link>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">Free plan, no credit card required</p>
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

/** {{toc}} - inline table-of-contents card, placed where the author put it. */
function TocBlock({ headings }: { headings: PostHeading[] }) {
  if (headings.length === 0) return null;
  return (
    <nav
      aria-label="Table of contents"
      className="my-8 rounded-tile border border-line bg-surface px-6 py-5"
    >
      <p className="label-micro">Table of contents</p>
      <TocList headings={headings} className="mt-3" />
    </nav>
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
