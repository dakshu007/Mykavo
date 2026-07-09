/**
 * LIGHTHOUSE_AUDIT job: runs an on-demand Lighthouse performance audit for one
 * PerformanceAudit row and persists the scores. Idempotent — a row already in a
 * terminal state is skipped. The URL is re-validated through the SSRF guard
 * immediately before auditing (spec §11) since Chrome will fetch it directly.
 */

import { prisma } from "@fluxen/database";
import { runLighthouse, LighthouseError } from "@fluxen/scanner";
import { assertSafeUrl, UnsafeUrlError } from "@fluxen/shared";
import { logger } from "./logger";

export async function runLighthouseAuditJob(auditId: string): Promise<void> {
  const audit = await prisma.performanceAudit.findUnique({ where: { id: auditId } });
  if (!audit) {
    logger.warn("audit not found — dropping job", { auditId });
    return;
  }
  if (audit.status === "COMPLETED" || audit.status === "FAILED") {
    logger.info("audit already finished — skipping", { auditId, status: audit.status });
    return;
  }

  const log = { auditId, websiteId: audit.websiteId };
  await prisma.performanceAudit.update({ where: { id: auditId }, data: { status: "RUNNING" } });

  // SSRF revalidation right before Chrome fetches the URL (spec §11).
  try {
    await assertSafeUrl(audit.url);
  } catch (err) {
    const code =
      err instanceof UnsafeUrlError && err.code === "DNS_FAILURE" ? "DNS_FAILURE" : "UNSAFE_URL";
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorCode: code,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Unsafe URL",
        completedAt: new Date(),
      },
    });
    logger.warn("audit URL rejected by SSRF guard", { ...log, code });
    return;
  }

  try {
    const result = await runLighthouse(audit.url);
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: { status: "COMPLETED", ...result, completedAt: new Date() },
    });
    logger.info("audit completed", { ...log, performance: result.performanceScore });
  } catch (err) {
    const code = err instanceof LighthouseError ? err.code : "AUDIT_FAILED";
    await prisma.performanceAudit.update({
      where: { id: auditId },
      data: {
        status: "FAILED",
        errorCode: code,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "Audit failed",
        completedAt: new Date(),
      },
    });
    logger.error("audit failed", { ...log, code }, err);
  }
}
