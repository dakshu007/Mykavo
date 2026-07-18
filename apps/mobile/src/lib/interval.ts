/**
 * Poll cadence helper: fast while something is in flight, relaxed when idle.
 * Matches the web dashboard (3-4s auto-refresh while scans run). Pure module
 * so it stays unit-testable without native imports.
 */
export function activeInterval(hasActivity: boolean, idleMs = 20000, activeMs = 3500): number {
  return hasActivity ? activeMs : idleMs;
}
