import { site } from "@/config/site";
import { CHANGELOG, CHANGELOG_PATH } from "@/config/changelog";
import { DOC_SECTIONS, type DocBlock } from "@/config/docs";
import { plans } from "@/config/plans";
import { ALTERNATIVES, VERIFIED_ON } from "@/config/alternatives";
import { COMPARISONS } from "@/config/comparisons";
import { PAGE_OVERVIEWS } from "@/config/page-overviews/pages";
import { TOOL_OVERVIEWS } from "@/config/page-overviews/tools";

/**
 * /llms-full.txt - the product reference (definition, pricing, comparisons,
 * page answers), the whole public documentation and the release notes as
 * one markdown file, for AI agents and answer engines that would rather read
 * one document than crawl forty pages. Generated from the same config the
 * pages render from, so it can never drift from what the site says.
 */

function blockToMarkdown(block: DocBlock): string {
  switch (block.type) {
    case "h2":
      return `### ${block.text}`;
    case "h3":
      return `#### ${block.text}`;
    case "p":
      return block.text;
    case "note":
      return `> ${block.text}`;
    case "ul":
      return block.items.map((item) => `- ${item}`).join("\n");
    case "code":
      return `\`\`\`${block.language.toLowerCase()}\n${block.text}\n\`\`\``;
    case "table":
      return [
        `| ${block.head.join(" | ")} |`,
        `| ${block.head.map(() => "---").join(" | ")} |`,
        ...block.rows.map((row) => `| ${row.join(" | ")} |`),
      ].join("\n");
    case "steps":
      return [
        `${block.name}:`,
        ...block.items.map(
          (step, i) => `${i + 1}. ${step.title}: ${step.text}`,
        ),
      ].join("\n");
  }
}

function qa(faqs: readonly { q: string; a: string }[]): string[] {
  if (faqs.length === 0) return [];
  const out = ["#### Questions"];
  for (const faq of faqs) out.push("", `Q: ${faq.q}`, `A: ${faq.a}`);
  out.push("");
  return out;
}

/**
 * Pricing, comparisons and the short answer on each key page, from the same
 * config those pages render, so the facts an AI engine reads here match the
 * site word for word.
 */
function productReference(): string[] {
  const parts: string[] = ["## Pricing", "", `Source: ${site.url}/pricing`, ""];
  for (const plan of plans) {
    parts.push(`### ${plan.name}: $${plan.priceMonthlyUsd}/month`, "", plan.headline, "");
    for (const feature of plan.features) parts.push(`- ${feature}`);
    parts.push("");
  }

  parts.push(
    "## MyKavo compared with specific tools",
    "",
    `Competitor facts were checked on ${VERIFIED_ON} against each vendor's own site; sources are listed on each page.`,
    "",
  );
  for (const alt of ALTERNATIVES) {
    parts.push(`### MyKavo vs ${alt.name}`, "", `Source: ${site.url}/alternatives/${alt.slug}`, "", alt.capsule, "", alt.whatItIs, "");
    for (const row of alt.rows) parts.push(`- ${row.capability}: ${alt.name}: ${row.them} MyKavo: ${row.us}`);
    parts.push("", `Where ${alt.name} is the better choice:`);
    for (const point of alt.whereTheyWin) parts.push(`- ${point}`);
    parts.push("", `Who should choose MyKavo: ${alt.bestFor}`, "", ...qa(alt.faqs));
  }

  parts.push("## MyKavo compared with other kinds of tool", "");
  for (const cmp of COMPARISONS) {
    parts.push(`### MyKavo vs ${cmp.name}`, "", `Source: ${site.url}/compare/${cmp.slug}`, "", cmp.capsule, "");
    for (const row of cmp.rows) parts.push(`- ${row.capability}: ${cmp.themLabel}: ${row.them} MyKavo: ${row.us}`);
    parts.push("", "Where they are the better choice:");
    for (const point of cmp.whereTheyWin) parts.push(`- ${point}`);
    parts.push("", `Who should choose MyKavo: ${cmp.bestFor}`, "", ...qa(cmp.faqs));
  }

  parts.push("## Short answers, page by page", "");
  for (const [path, overview] of Object.entries({ ...PAGE_OVERVIEWS, ...TOOL_OVERVIEWS })) {
    parts.push(`### ${site.url}${path}`, "", overview.answer, "");
    for (const t of overview.takeaways) parts.push(`- ${t}`);
    parts.push("");
  }
  return parts;
}

export function llmsFullText(): string {
  const parts: string[] = [
    "# MyKavo - full product reference, documentation and release notes",
    "",
    `> ${site.definition} Website: ${site.url}. The short summary is at ${site.url}/llms.txt; every blog post is available as Markdown by adding .md to its address.`,
    "",
    ...productReference(),
  ];

  for (const section of DOC_SECTIONS) {
    parts.push(`## ${section.title}`, "", section.description, "");
    for (const article of section.articles) {
      parts.push(
        `### ${article.title}`,
        "",
        `Source: ${site.url}/docs/${section.slug}/${article.slug}`,
        "",
        article.capsule,
        "",
      );
      for (const block of article.blocks)
        parts.push(blockToMarkdown(block), "");
      if (article.faqs?.length) {
        parts.push("#### Questions");
        for (const faq of article.faqs)
          parts.push("", `Q: ${faq.q}`, `A: ${faq.a}`);
        parts.push("");
      }
    }
  }

  parts.push(
    "## Release notes",
    "",
    `Source: ${site.url}${CHANGELOG_PATH}`,
    "",
  );
  for (const release of CHANGELOG) {
    parts.push(
      `### ${release.date} - ${release.title}`,
      "",
      release.summary,
      "",
    );
    for (const item of release.items) {
      const link = item.href ? ` (${site.url}${item.href})` : "";
      parts.push(`- ${item.kind.toUpperCase()}: ${item.text}${link}`);
    }
    parts.push("");
  }
  return parts.join("\n");
}
