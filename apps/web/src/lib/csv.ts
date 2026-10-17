/**
 * Minimal RFC 4180-style CSV serialization for exports. Fields containing a
 * quote, comma, or line break are quoted, with embedded quotes doubled.
 *
 * Formula injection: exported values include text taken from scanned
 * websites (titles, URLs, change descriptions). A field starting with
 * = + - @, a tab or a carriage return is run as a formula by Excel, Sheets
 * and LibreOffice, so it is prefixed with a single quote and shows as text.
 * Plain numbers ("-12", "+3.5") are left alone: they can't be formulas.
 */

const FORMULA_START = /^[=+\-@\t\r]/;
const PLAIN_NUMBER = /^[+-]?\d+(\.\d+)?$/;

function neutralizeFormula(value: string): string {
  return FORMULA_START.test(value) && !PLAIN_NUMBER.test(value) ? `'${value}` : value;
}

function escapeField(raw: string): string {
  const value = neutralizeFormula(raw);
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

/** Serialize rows (header included by the caller) to CRLF-delimited CSV. */
export function toCsv(rows: ReadonlyArray<ReadonlyArray<string>>): string {
  return rows.map((row) => row.map(escapeField).join(",")).join("\r\n") + "\r\n";
}
