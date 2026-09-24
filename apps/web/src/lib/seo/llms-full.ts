import { site } from "@/config/site";
import { CHANGELOG, CHANGELOG_PATH } from "@/config/changelog";
import { DOC_SECTIONS, type DocBlock } from "@/config/docs";

/**
 * /llms-full.txt - the whole public documentation and the release notes as
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

export function llmsFullText(): string {
  const parts: string[] = [
    "# MyKavo - full documentation and release notes",
    "",
    `> MyKavo (${site.url}) is a website change detection and regression monitoring tool. It keeps an approved baseline of every monitored page, re-scans on a schedule, and sends severity-ranked alerts with before-and-after evidence when something important changes or breaks. The short summary is at ${site.url}/llms.txt.`,
    "",
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
