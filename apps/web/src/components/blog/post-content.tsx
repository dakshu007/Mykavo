import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { parsePost, type FaqItem, type PostHeading } from "./blocks";
import { BlogMarkdown } from "./markdown";

/**
 * Renders a post's markdown plus its shortcode blocks ({{cta}}, {{toc}},
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
          case "toc":
            return <TocBlock key={index} headings={headings} />;
          case "faq":
            return <FaqBlock key={index} items={segment.items} />;
        }
      })}
    </>
  );
}

/** {{cta}} — inline "Try MyKavo" card. */
function CtaBlock() {
  return (
    <aside className="my-8 rounded-tile border border-primary/15 bg-primary-soft/50 px-6 py-8 text-center sm:px-8">
      <p className="text-xl font-semibold tracking-tight text-ink">
        Know what changed. Fix what matters.
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">
        MyKavo watches your websites for visual, SEO, link, script, and
        performance changes — and alerts you before your customers notice.
      </p>
      <div className="mt-5">
        <ButtonLink href="/signup">Start Monitoring Free</ButtonLink>
      </div>
      <p className="mt-3 text-[12px] text-ink-faint">No credit card required</p>
    </aside>
  );
}

/** {{faq}} — accessible accordion; the page also emits FAQPage JSON-LD. */
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

/** {{toc}} — inline table-of-contents card, placed where the author put it. */
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
export function PostTocRail({ headings }: { headings: PostHeading[] }) {
  return (
    <nav
      aria-label="Table of contents"
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-card bg-card p-6 shadow-card"
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
            className="group flex items-baseline gap-2 text-sm leading-5 text-ink-secondary transition-colors hover:text-primary"
          >
            {number !== undefined && (
              <span className="w-4 shrink-0 font-mono text-[11px] font-medium text-ink-faint group-hover:text-primary">
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
