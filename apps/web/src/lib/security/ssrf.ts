/**
 * Re-export of the SSRF protection pipeline.
 * Canonical implementation lives in packages/shared (used by web, worker,
 * and scanner alike). See docs/SECURITY_MODEL.md.
 */
export * from "@mykavo/shared/ssrf";
