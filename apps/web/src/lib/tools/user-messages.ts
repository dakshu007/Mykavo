import type { UnsafeUrlError } from "@/lib/security/ssrf";

/** User-safe messages for every SSRF-guard error code - never leak internals. */
export const SAFE_FETCH_USER_MESSAGES: Record<UnsafeUrlError["code"], string> = {
  INVALID_URL: "That doesn't look like a valid URL.",
  SCHEME_NOT_ALLOWED: "Only http:// and https:// URLs can be checked.",
  CREDENTIALS_IN_URL: "URLs containing credentials are not supported.",
  BLOCKED_HOST: "This host can't be checked.",
  BLOCKED_IP: "This host can't be checked.",
  DNS_FAILURE: "We couldn't resolve that hostname. Check the spelling and try again.",
  TOO_MANY_REDIRECTS: "The page redirected too many times.",
  RESPONSE_TOO_LARGE: "The page is too large to check with the free tool (2 MB limit).",
  TIMEOUT: "The website took too long to respond.",
  FETCH_FAILED: "We couldn't reach that website. It may be down or blocking requests.",
};
