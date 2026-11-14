import { config } from "zod";

/**
 * Runs in the browser before the app becomes interactive.
 *
 * Zod 4 probes for `new Function` support the first time it validates, to
 * decide whether it may compile fast validators. The production CSP
 * (lib/security-headers.ts) forbids eval, so the probe is refused: Zod falls
 * back correctly, but every refusal is a CSP violation report. jitless skips
 * the probe and uses the same non-eval path from the start.
 */
config({ jitless: true });
