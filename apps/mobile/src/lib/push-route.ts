/**
 * Where a tapped notification should take the user.
 *
 * Deliberately free of native imports so it is unit-testable: the rest of
 * push.ts needs expo-notifications and react-native, which a node test
 * environment cannot load.
 */

/**
 * The in-app route for a notification's data payload. Falls back to the
 * website when only an id came through, and returns null when the payload
 * carries nothing navigable - never a guess, which would land the user on the
 * wrong page and read as a broken app.
 *
 * The payload arrives from our own backend, but it is still remote input: an
 * absolute URL must never become a router target.
 */
export function routeForNotification(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const payload = data as Record<string, unknown>;
  if (
    typeof payload.path === "string" &&
    payload.path.startsWith("/") &&
    // "//host" is protocol-relative - still off-app.
    !payload.path.startsWith("//")
  ) {
    return payload.path;
  }
  if (typeof payload.changeId === "string") return `/change/${payload.changeId}`;
  if (typeof payload.websiteId === "string") return `/website/${payload.websiteId}`;
  return null;
}
