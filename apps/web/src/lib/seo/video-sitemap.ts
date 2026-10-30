// Helpers for the video:video entries in app/sitemap.ts. Next writes sitemap
// video fields into the XML verbatim, so text must be escaped before it.

/** Escape text for an XML element body. */
export function xmlEscape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** A video sitemap description: never empty, at most 2,048 characters. */
export function videoSitemapDescription(title: string, description: string): string {
  const text = description.replace(/\s+/g, " ").trim() || title;
  return text.length <= 2048 ? text : `${text.slice(0, 2045).trimEnd()}...`;
}
