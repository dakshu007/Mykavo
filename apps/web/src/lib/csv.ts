/**
 * Minimal RFC 4180-style CSV serialization for exports. Fields containing a
 * quote, comma, or line break are quoted, with embedded quotes doubled.
 */

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Serialize rows (header included by the caller) to CRLF-delimited CSV. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n") + "\r\n";
}
