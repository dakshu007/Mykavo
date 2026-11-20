/**
 * The links and scripts a scan saw on one page, as stored in object storage
 * (key: scanHistoryKey). Postgres keeps only counts and the broken internal
 * links on the snapshot row; the full lists are read whole, one snapshot at a
 * time, by the worker's comparison and link check - so they live where reads
 * cost no database egress.
 *
 * This module is the format only (encode to JSON text, decode with
 * validation). Compression and storage are the worker's job, so this stays
 * free of Node APIs.
 */

export const SCAN_HISTORY_VERSION = 1;

export type HistoryLinkType = "INTERNAL" | "EXTERNAL";

export interface HistoryLink {
  url: string;
  normalizedUrl: string;
  linkType: HistoryLinkType;
  /** HTTP status from the scan's link check; null when not checked or unknown. */
  statusCode: number | null;
}

export interface HistoryScript {
  src: string;
  domain: string;
  isThirdParty: boolean;
}

export interface ScanHistory {
  links: HistoryLink[];
  scripts: HistoryScript[];
}

/** A broken internal link as kept on the snapshot row for the dashboard. */
export interface BrokenLinkEntry {
  normalizedUrl: string;
  statusCode: number;
}

export class ScanHistoryFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScanHistoryFormatError";
  }
}

export function encodeScanHistory(history: ScanHistory): string {
  return JSON.stringify({ v: SCAN_HISTORY_VERSION, ...history });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLink(value: unknown): HistoryLink {
  if (!isRecord(value)) throw new ScanHistoryFormatError("link is not an object");
  const { url, normalizedUrl, linkType, statusCode } = value;
  if (typeof url !== "string" || typeof normalizedUrl !== "string") {
    throw new ScanHistoryFormatError("link url missing");
  }
  if (linkType !== "INTERNAL" && linkType !== "EXTERNAL") {
    throw new ScanHistoryFormatError("link type invalid");
  }
  if (statusCode !== null && (typeof statusCode !== "number" || !Number.isInteger(statusCode))) {
    throw new ScanHistoryFormatError("link status invalid");
  }
  return { url, normalizedUrl, linkType, statusCode };
}

function parseScript(value: unknown): HistoryScript {
  if (!isRecord(value)) throw new ScanHistoryFormatError("script is not an object");
  const { src, domain, isThirdParty } = value;
  if (typeof src !== "string" || typeof domain !== "string" || typeof isThirdParty !== "boolean") {
    throw new ScanHistoryFormatError("script fields invalid");
  }
  return { src, domain, isThirdParty };
}

/** Parses and validates a stored file. Throws ScanHistoryFormatError on anything unexpected. */
export function decodeScanHistory(text: string): ScanHistory {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ScanHistoryFormatError("not JSON");
  }
  if (!isRecord(raw)) throw new ScanHistoryFormatError("not an object");
  if (raw.v !== SCAN_HISTORY_VERSION) throw new ScanHistoryFormatError(`unknown version ${String(raw.v)}`);
  if (!Array.isArray(raw.links) || !Array.isArray(raw.scripts)) {
    throw new ScanHistoryFormatError("links or scripts missing");
  }
  return { links: raw.links.map(parseLink), scripts: raw.scripts.map(parseScript) };
}

/**
 * Reads the broken-links column back. Anything malformed reads as no broken
 * links rather than failing a dashboard page.
 */
export function parseBrokenLinks(value: unknown): BrokenLinkEntry[] {
  if (!Array.isArray(value)) return [];
  const out: BrokenLinkEntry[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const { normalizedUrl, statusCode } = item;
    if (typeof normalizedUrl === "string" && typeof statusCode === "number") {
      out.push({ normalizedUrl, statusCode });
    }
  }
  return out;
}
