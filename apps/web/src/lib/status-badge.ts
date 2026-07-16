/**
 * Embeddable uptime status badge - a shields.io-style SVG shield rendered by
 * the public /api/badge/[token] route. Pure functions only: no I/O, no
 * user-controlled strings - the badge contains fixed words and formatted
 * numbers exclusively (the website name never appears; tokens are shareable
 * but anonymous).
 */

export type BadgeStatus = "up" | "down" | "unknown";

export interface StatusBadgeInput {
  status: BadgeStatus;
  /** 7-day uptime percentage (0–100); null when there are no checks. */
  uptimePercent: number | null;
}

/** Right-segment fill per status. Green/red/gray, shields-style. */
const STATUS_COLOR: Record<BadgeStatus, string> = {
  up: "#2da44e",
  down: "#cf222e",
  unknown: "#9f9f9f",
};

/** "100%" or one decimal ("99.9%"); values that round to 100 show "100%". */
export function formatUptimePercent(percent: number): string {
  const fixed = percent.toFixed(1);
  return fixed === "100.0" ? "100%" : `${fixed}%`;
}

/** The right-segment text: "up · 99.9%", "up", "down", or "unknown". */
export function badgeLabel(input: StatusBadgeInput): string {
  if (input.status === "up") {
    return input.uptimePercent === null
      ? "up"
      : `up · ${formatUptimePercent(input.uptimePercent)}`;
  }
  return input.status;
}

/** Approximate Verdana 11px text width - keeps the generator pure. */
function textWidth(text: string): number {
  return Math.round(text.length * 6.5);
}

/**
 * Render the badge as a standalone SVG string (~150×20 for the up variant).
 * Left segment: dark "uptime". Right segment: colored status label.
 */
export function renderStatusBadge(input: StatusBadgeInput): string {
  const label = badgeLabel(input);
  const color = STATUS_COLOR[input.status];

  const leftText = "uptime";
  const leftWidth = textWidth(leftText) + 12;
  const rightWidth = textWidth(label) + 12;
  const width = leftWidth + rightWidth;
  const leftCenter = leftWidth / 2;
  const rightCenter = leftWidth + rightWidth / 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${leftText}: ${label}">`,
    `<title>${leftText}: ${label}</title>`,
    `<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>`,
    `<clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>`,
    `<g clip-path="url(#r)">`,
    `<rect width="${leftWidth}" height="20" fill="#555"/>`,
    `<rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>`,
    `<rect width="${width}" height="20" fill="url(#s)"/>`,
    `</g>`,
    `<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">`,
    `<text x="${leftCenter}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>`,
    `<text x="${leftCenter}" y="14">${leftText}</text>`,
    `<text x="${rightCenter}" y="15" fill="#010101" fill-opacity=".3">${label}</text>`,
    `<text x="${rightCenter}" y="14">${label}</text>`,
    `</g>`,
    `</svg>`,
  ].join("");
}
