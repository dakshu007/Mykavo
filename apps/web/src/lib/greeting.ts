/**
 * Time-of-day greeting that follows the VISITOR's clock, not the server's.
 * Netlify functions run in UTC - using the server clock greets an Indian
 * user with "Good morning" at 9 PM. Server render makes a best guess from
 * Netlify's geo header; the client corrects from the real local clock.
 */

export type Greeting = "Good morning" | "Good afternoon" | "Good evening";

export function greetingForHour(hour: number): Greeting {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Current hour (0–23) in an IANA timezone; null when the zone is invalid. */
export function hourInTimeZone(timeZone: string, now: Date = new Date()): number | null {
  try {
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now);
    const parsed = Number.parseInt(hour, 10);
    return Number.isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

/**
 * Netlify forwards request geolocation as the `x-nf-geo` header - base64
 * JSON including an IANA `timezone`. Returns null on any malformed input.
 */
export function timezoneFromNetlifyGeo(headerValue: string | null): string | null {
  if (!headerValue) return null;
  try {
    const geo = JSON.parse(Buffer.from(headerValue, "base64").toString("utf-8")) as {
      timezone?: unknown;
    };
    return typeof geo.timezone === "string" && geo.timezone.length > 0 ? geo.timezone : null;
  } catch {
    return null;
  }
}
