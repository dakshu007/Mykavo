/**
 * Is this string a plausible person's name?
 *
 * WHY NOT "ALPHABETIC CHARACTERS ONLY"
 * -----------------------------------
 * The obvious rule - `/^[a-zA-Z ]+$/` - is the wrong one, and expensively so.
 * MyKavo's market is global (spec §1), and that rule turns away:
 *
 *   José, Müller, Ångström      accented Latin
 *   李明, Дмитрий, محمد          non-Latin scripts entirely
 *   Jean-Luc, O'Brien           ordinary punctuation in ordinary names
 *   J. R. Smith                 initials
 *
 * Rejecting a paying customer at signup because their name has an accent is a
 * worse outcome than a junk row in an admin list. So the rule is not "which
 * characters are allowed" but "does this look like a name at all":
 *
 *   - at least two letters, in ANY script
 *   - letters are at least half of what is there, ignoring spaces
 *   - nothing that belongs to a spam payload rather than a name
 *
 * That rejects `------------------` and `....` and `https://buy-now.example`,
 * and accepts every name above.
 */

/** Longest name stored. Long enough for a full legal name, short enough to render. */
export const NAME_MAX_LENGTH = 80;
const NAME_MIN_LETTERS = 2;

/** Control characters, and the two things that mean "this is an advert". */
const FORBIDDEN = /[\u0000-\u001f\u007f]|https?:\/\/|www\./i;

/** Collapse runs of whitespace and trim. Applied before every other check. */
export function normalizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

function letterCount(value: string): number {
  return (value.match(/\p{L}/gu) ?? []).length;
}

export type NameRejection =
  | "empty"
  | "too-long"
  | "too-few-letters"
  | "mostly-symbols"
  | "forbidden";

export interface NameCheck {
  ok: boolean;
  /** Present only when ok is false. */
  reason?: NameRejection;
}

export function checkPersonName(raw: string | null | undefined): NameCheck {
  const name = normalizeName(raw ?? "");
  if (name.length === 0) return { ok: false, reason: "empty" };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, reason: "too-long" };
  if (FORBIDDEN.test(name)) return { ok: false, reason: "forbidden" };

  const letters = letterCount(name);
  if (letters < NAME_MIN_LETTERS) return { ok: false, reason: "too-few-letters" };

  // Ignoring spaces, letters must carry their weight. "Jean-Luc" is 8 letters
  // in 9 characters; "----a----" is 1 in 9. This is the check that catches a
  // row of dashes with a stray letter hidden in it.
  const significant = name.replace(/\s/g, "").length;
  if (letters * 2 < significant) return { ok: false, reason: "mostly-symbols" };

  return { ok: true };
}

export function isPlausibleName(raw: string | null | undefined): boolean {
  return checkPersonName(raw).ok;
}

/** What to tell someone whose name was rejected at signup. */
export const NAME_REJECTION_MESSAGES: Record<NameRejection, string> = {
  empty: "Please enter your name.",
  "too-long": `Please use ${NAME_MAX_LENGTH} characters or fewer.`,
  "too-few-letters": "Please enter your real name - at least two letters.",
  "mostly-symbols": "Please enter your real name, not symbols.",
  forbidden: "Please enter your name, without links.",
};

/**
 * The best label available for an EXISTING row.
 *
 * Validation only binds accounts created after it ships; rows already in the
 * database keep whatever was stored. Rather than print `------------------` in
 * the admin list, fall back to the part of the address before the @, which is
 * always something a human chose and is usually their actual name.
 */
export function displayPersonName(
  name: string | null | undefined,
  email: string,
): string {
  const normalized = normalizeName(name ?? "");
  if (isPlausibleName(normalized)) return normalized;

  const local = email.split("@")[0] ?? "";
  // Address local parts are commonly "first.last" or "first_last".
  const humanised = normalizeName(local.replace(/[._-]+/g, " "));

  // Deliberately a LOOSER test than isPlausibleName. That one guards what
  // people may store; this one only decides what to print for a row already
  // stored. "ksb040816" fails the letters-carry-their-weight rule - three
  // letters in nine characters - but it is what that person calls themselves,
  // and digits in an address handle are ordinary rather than suspicious.
  // Printing their handle beats printing "Unnamed".
  if (letterCount(humanised) >= NAME_MIN_LETTERS && !FORBIDDEN.test(humanised)) {
    return humanised;
  }

  return "Unnamed";
}
