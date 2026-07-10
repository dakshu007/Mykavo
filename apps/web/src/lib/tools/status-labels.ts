/**
 * HTTP status → human label + tone. Pure, client-safe (used to render
 * colored status badges — always color AND text, never color alone).
 */

export type StatusTone = "success" | "redirect" | "clientError" | "serverError" | "info";

const REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  303: "See Other",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  410: "Gone",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export function statusLabel(status: number): { text: string; tone: StatusTone } {
  const reason =
    REASONS[status] ??
    (status >= 500
      ? "Server Error"
      : status >= 400
        ? "Client Error"
        : status >= 300
          ? "Redirect"
          : status >= 200
            ? "Success"
            : "Informational");
  const tone: StatusTone =
    status >= 500
      ? "serverError"
      : status >= 400
        ? "clientError"
        : status >= 300
          ? "redirect"
          : status >= 200
            ? "success"
            : "info";
  return { text: `${status} ${reason}`, tone };
}

/** Permanent vs temporary classification for redirect statuses. */
export function redirectTypeLabel(status: number): string {
  if (status === 301 || status === 308) return "Permanent redirect";
  if (status === 302 || status === 303 || status === 307) return "Temporary redirect";
  return "Redirect";
}
