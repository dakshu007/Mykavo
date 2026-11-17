/**
 * "How to Update WordPress Safely (Ready for WordPress 7.2)" ->
 * { main: "How to Update WordPress Safely", aside: "(Ready for WordPress 7.2)" }.
 *
 * Headlines show a trailing bracketed part on its own line: wrapped wherever
 * it fell, it split mid-phrase ("(+ 12-" / "Point Checklist)") and looked
 * broken. Titles without one, or that are only a bracket, come back whole.
 */
export function splitTitle(title: string): { main: string; aside: string | null } {
  const m = /^(.*\S)\s*(\([^()]+\))\s*$/.exec(title.trim());
  if (!m || m[1]!.length < 8) return { main: title, aside: null };
  return { main: m[1]!, aside: m[2]! };
}

/** Hyphens that never break a line ("12-Point" stays together). */
export function noBreakHyphens(text: string): string {
  return text.replace(/-/g, "‑");
}
