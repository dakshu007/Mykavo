import { parse, type HTMLElement, type Node, NodeType } from "node-html-parser";

/**
 * Post HTML safety. Everything the writer returns, and everything a user saves
 * from the editor, passes through sanitizePostHtml before it is stored: an
 * allow-list of structural tags, no attributes except a vetted href, and links
 * only to the site's own known pages (no invented URLs, spec round 3).
 */

const ALLOWED = new Set([
  "h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "a", "blockquote", "br", "code",
]);
/** Removed with everything inside them. */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math", "form", "input",
  "button", "select", "textarea", "head", "title", "meta", "link",
]);
const VOID = new Set(["br"]);
/** Headings outside h2..h4 are mapped in, so their text stays a heading. */
const HEADING_MAP: Record<string, string> = { h1: "h2", h5: "h4", h6: "h4" };

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(text: string): string {
  return escapeText(text).replace(/"/g, "&quot;");
}

/** Lower-case, no fragment, no trailing slash: how links are compared. */
export function linkKey(href: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return `${url.host.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return null;
  }
}

export interface SanitizeOptions {
  /** The only URLs links may point to (the site's real pages). */
  allowedLinks: string[];
}

function render(node: Node, allowed: Set<string>, out: string[]): void {
  if (node.nodeType === NodeType.TEXT_NODE) {
    // node-html-parser keeps entities as written; decode via rawText and re-escape.
    out.push(escapeText((node as unknown as { text: string }).text));
    return;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const raw = el.rawTagName?.toLowerCase() ?? "";
  const tag = HEADING_MAP[raw] ?? raw;
  if (DROP_WITH_CONTENT.has(tag)) return;
  if (!ALLOWED.has(tag)) {
    // Unknown wrapper (div, span, h1...): keep its children, drop the tag.
    for (const child of el.childNodes) render(child, allowed, out);
    return;
  }
  if (tag === "a") {
    const href = el.getAttribute("href") ?? "";
    const key = linkKey(href);
    if (!key || !allowed.has(key)) {
      for (const child of el.childNodes) render(child, allowed, out);
      return;
    }
    out.push(`<a href="${escapeAttr(href)}">`);
    for (const child of el.childNodes) render(child, allowed, out);
    out.push("</a>");
    return;
  }
  if (VOID.has(tag)) {
    out.push(`<${tag}>`);
    return;
  }
  out.push(`<${tag}>`);
  for (const child of el.childNodes) render(child, allowed, out);
  out.push(`</${tag}>`);
}

export function sanitizePostHtml(html: string, options: SanitizeOptions): string {
  const allowed = new Set(options.allowedLinks.map(linkKey).filter((k): k is string => k !== null));
  const root = parse(html, { comment: false, blockTextElements: { script: false, style: false, noscript: false, pre: true } });
  const out: string[] = [];
  for (const child of root.childNodes) render(child, allowed, out);
  return out
    .join("")
    .replace(/<(p|li|h2|h3|h4|blockquote)>\s*<\/\1>/g, "")
    .trim();
}

/** Plain text of a post, for word counts and checks. */
export function htmlToText(html: string): string {
  return parse(html).text.replace(/\s+/g, " ").trim();
}

function mdInline(node: Node): string {
  if (node.nodeType === NodeType.TEXT_NODE) {
    return (node as unknown as { text: string }).text.replace(/\s+/g, " ");
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  const tag = el.rawTagName?.toLowerCase() ?? "";
  const inner = el.childNodes.map(mdInline).join("");
  switch (tag) {
    case "strong":
    case "b":
      return inner.trim() ? `**${inner.trim()}**` : "";
    case "em":
    case "i":
      return inner.trim() ? `*${inner.trim()}*` : "";
    case "code":
      return `\`${inner}\``;
    case "a":
      return `[${inner.trim()}](${el.getAttribute("href") ?? ""})`;
    case "br":
      return "  \n";
    default:
      return inner;
  }
}

function mdBlock(node: Node, lines: string[]): void {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const text = mdInline(node).trim();
    if (text) lines.push(text, "");
    return;
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.rawTagName?.toLowerCase() ?? "";
  const inline = () => el.childNodes.map(mdInline).join("").trim();
  if (tag === "h2" || tag === "h3" || tag === "h4") {
    lines.push(`${"#".repeat(Number(tag[1]))} ${inline()}`, "");
  } else if (tag === "p") {
    lines.push(inline(), "");
  } else if (tag === "blockquote") {
    lines.push(`> ${inline()}`, "");
  } else if (tag === "ul" || tag === "ol") {
    let n = 1;
    for (const li of el.childNodes) {
      if (li.nodeType !== NodeType.ELEMENT_NODE) continue;
      const text = (li as HTMLElement).childNodes.map(mdInline).join("").trim();
      lines.push(tag === "ol" ? `${n++}. ${text}` : `- ${text}`);
    }
    lines.push("");
  } else {
    for (const child of el.childNodes) mdBlock(child, lines);
  }
}

/** Markdown for "Copy as Markdown". Expects sanitised HTML. */
export function htmlToMarkdown(html: string): string {
  const lines: string[] = [];
  for (const child of parse(html).childNodes) mdBlock(child, lines);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** A URL path segment from a title: lower case, ascii, hyphens, at most 70 chars. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}
