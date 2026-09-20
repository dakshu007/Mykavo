import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import {
  breadcrumbList,
  faqPage,
  howTo,
  jsonLdScript,
  techArticle,
} from "@/lib/seo/structured-data";
import {
  DOCS_PUBLISHED_ISO,
  DOCS_UPDATED,
  type DocArticle,
  type DocBlock,
  type DocSection,
} from "@/config/docs";

/**
 * Renderer for a documentation page.
 *
 * The structured blocks exist so that an ordered procedure can be marked up as
 * HowTo automatically: answer engines lift steps out of HowTo far more readily
 * than out of prose, and questions of the form "how do I monitor a website for
 * changes" are exactly the ones this product wants to be the cited answer to.
 * Only genuine, complete procedures get that markup - a feature list dressed
 * up as steps is the kind of thing that earns a manual action.
 */
function Block({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "h2":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "p":
      return <p>{block.text}</p>;
    case "ul":
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "note":
      return (
        <aside className="not-prose my-6 rounded-xl border-l-4 border-[#FFD400] bg-[#F3F1E6] px-5 py-4 text-[14.5px] leading-6 text-[#151515]/90">
          {block.text}
        </aside>
      );
    case "table":
      return (
        <div className="not-prose my-8 overflow-x-auto rounded-xl border border-black/15">
          <table className="w-full min-w-140 border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-black/15 bg-[#F3F1E6]">
                {block.head.map((cell) => (
                  <th key={cell} scope="col" className="px-4 py-3 font-semibold text-[#151515]">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-b border-black/10 last:border-b-0">
                  {row.map((cell, index) => (
                    <td
                      key={cell + index}
                      className={
                        index === 0
                          ? "px-4 py-3 align-top font-medium text-[#151515]"
                          : "px-4 py-3 align-top text-[#6B6B60]"
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "steps":
      return (
        <ol className="not-prose my-8 space-y-5">
          {block.items.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#FFD400] text-[13px] font-semibold text-[#151515]"
              >
                {index + 1}
              </span>
              <div>
                <p className="text-[15.5px] font-semibold leading-6 text-[#151515]">
                  {step.title}
                </p>
                <p className="mt-1 text-[14.5px] leading-6 text-[#6B6B60]">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export function DocArticlePage({
  section,
  article,
  siblings,
}: {
  section: DocSection;
  article: DocArticle;
  siblings: DocArticle[];
}) {
  const path = `/docs/${section.slug}/${article.slug}`;
  const steps = article.blocks.find((b) => b.type === "steps");

  return (
    <MarketingPageShell
      eyebrowText={`docs / ${section.title.toLowerCase()}`}
      title={article.title}
      intro={article.capsule}
      updated={DOCS_UPDATED}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            techArticle({
              headline: article.title,
              description: article.description,
              path,
              datePublished: DOCS_PUBLISHED_ISO,
              dateModified: DOCS_PUBLISHED_ISO,
            }),
          ),
        }}
      />
      {steps && steps.type === "steps" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(
              howTo({
                name: steps.name,
                description: steps.description,
                path,
                steps: steps.items,
              }),
            ),
          }}
        />
      )}
      {article.faqs && article.faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(article.faqs)) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Docs", path: "/docs" },
              { name: section.title, path: `/docs/${section.slug}` },
              { name: article.title, path },
            ]),
          ),
        }}
      />

      {article.blocks.map((block, index) => (
        <Block key={`${block.type}-${index}`} block={block} />
      ))}

      {article.faqs && article.faqs.length > 0 && (
        <>
          <h2>Frequently asked questions</h2>
          {article.faqs.map((faq) => (
            <div key={faq.q}>
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </>
      )}

      <SeoPageCta heading="Know what changed. Fix what matters." />

      <h2>More in {section.title.toLowerCase()}</h2>
      <ul>
        {siblings
          .filter((a) => a.slug !== article.slug)
          .map((a) => (
            <li key={a.slug}>
              <Link href={`/docs/${section.slug}/${a.slug}`}>{a.title}</Link>
            </li>
          ))}
        <li>
          <Link href="/docs">All documentation</Link>
        </li>
      </ul>
    </MarketingPageShell>
  );
}
