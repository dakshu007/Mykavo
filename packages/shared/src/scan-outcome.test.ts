import { describe, expect, it } from "vitest";
import { resolveScanOutcome, scanErrorMessage, type StageFailure } from "./scan-outcome";

const clean = { pagesScanned: 5, pagesFailed: 0, failures: [] as StageFailure[] };

describe("resolveScanOutcome - page capture", () => {
  it("is COMPLETED when every page scanned and every stage ran", () => {
    expect(resolveScanOutcome(clean)).toEqual({
      status: "COMPLETED",
      errorCode: null,
      errorMessage: null,
      verdictMissing: false,
    });
  });

  it("is PARTIAL when some pages failed but others succeeded", () => {
    const out = resolveScanOutcome({ ...clean, pagesScanned: 4, pagesFailed: 1 });
    expect(out.status).toBe("PARTIAL");
    expect(out.errorCode).toBeNull();
  });

  it("is FAILED when nothing could be captured", () => {
    const out = resolveScanOutcome({ pagesScanned: 0, pagesFailed: 3, failures: [] });
    expect(out.status).toBe("FAILED");
    expect(out.errorCode).toBe("ALL_PAGES_FAILED");
    expect(out.verdictMissing).toBe(false);
  });

  it("does not invent a failure for a scan with no pages requested", () => {
    const out = resolveScanOutcome({ pagesScanned: 0, pagesFailed: 0, failures: [] });
    expect(out.status).toBe("COMPLETED");
    expect(out.errorCode).toBeNull();
  });
});

describe("resolveScanOutcome - the silent-verdict bug", () => {
  // The regression this module exists for: every page captured cleanly, the
  // comparison stage threw, and the scan was still stored as COMPLETED with
  // changesDetected 0 - reading exactly like "we checked, nothing changed".
  it("never reports COMPLETED when the comparison did not finish", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [{ stage: "COMPARISON", code: "COMPARISON_FAILED" }],
    });
    expect(out.status).toBe("PARTIAL");
    expect(out.errorCode).toBe("COMPARISON_FAILED");
    expect(out.verdictMissing).toBe(true);
  });

  it("flags a partially-compared scan so missing changes are visible", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [{ stage: "COMPARISON", code: "COMPARISON_INCOMPLETE" }],
    });
    expect(out.status).toBe("PARTIAL");
    expect(out.verdictMissing).toBe(true);
  });

  it("never reports COMPLETED when baselines could not be saved", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [{ stage: "BASELINE", code: "BASELINE_FAILED" }],
    });
    expect(out.status).toBe("PARTIAL");
    expect(out.verdictMissing).toBe(true);
  });

  it("stores a user-facing message, not the raw error detail", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [
        { stage: "COMPARISON", code: "COMPARISON_FAILED", detail: "EMAXCONNSESSION: too many" },
      ],
    });
    expect(out.errorMessage).toBe(scanErrorMessage("COMPARISON_FAILED"));
    expect(out.errorMessage).not.toContain("EMAXCONNSESSION");
  });
});

describe("resolveScanOutcome - degraded but trustworthy stages", () => {
  // A link check that fell over does not invalidate the change verdict, so it
  // is recorded without pretending the whole scan is partial.
  it("records a link-check failure without demoting a clean scan", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [{ stage: "LINK_CHECK", code: "LINK_CHECK_FAILED" }],
    });
    expect(out.status).toBe("COMPLETED");
    expect(out.errorCode).toBe("LINK_CHECK_FAILED");
    expect(out.verdictMissing).toBe(false);
  });

  it("records a site-meta failure without demoting a clean scan", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [{ stage: "SITE_META", code: "SITE_META_FAILED" }],
    });
    expect(out.status).toBe("COMPLETED");
    expect(out.errorCode).toBe("SITE_META_FAILED");
  });

  it("keeps the capture-level PARTIAL when only a soft stage failed", () => {
    const out = resolveScanOutcome({
      pagesScanned: 4,
      pagesFailed: 1,
      failures: [{ stage: "SITE_META", code: "SITE_META_FAILED" }],
    });
    expect(out.status).toBe("PARTIAL");
  });
});

describe("resolveScanOutcome - reporting the worst failure", () => {
  it("reports the comparison failure over a link-check failure", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [
        { stage: "SITE_META", code: "SITE_META_FAILED" },
        { stage: "LINK_CHECK", code: "LINK_CHECK_FAILED" },
        { stage: "COMPARISON", code: "COMPARISON_FAILED" },
      ],
    });
    expect(out.errorCode).toBe("COMPARISON_FAILED");
    expect(out.verdictMissing).toBe(true);
  });

  it("prefers a link-check failure over a site-meta one", () => {
    const out = resolveScanOutcome({
      ...clean,
      failures: [
        { stage: "SITE_META", code: "SITE_META_FAILED" },
        { stage: "LINK_CHECK", code: "LINK_CHECK_FAILED" },
      ],
    });
    expect(out.errorCode).toBe("LINK_CHECK_FAILED");
  });

  it("ignores post-capture stages entirely when nothing was captured", () => {
    const out = resolveScanOutcome({
      pagesScanned: 0,
      pagesFailed: 2,
      failures: [{ stage: "COMPARISON", code: "COMPARISON_FAILED" }],
    });
    expect(out.errorCode).toBe("ALL_PAGES_FAILED");
  });
});

describe("scanErrorMessage", () => {
  it("gives every code a message that says what the user lost", () => {
    for (const code of [
      "ALL_PAGES_FAILED",
      "BASELINE_FAILED",
      "COMPARISON_FAILED",
      "COMPARISON_INCOMPLETE",
      "LINK_CHECK_FAILED",
      "SITE_META_FAILED",
    ] as const) {
      expect(scanErrorMessage(code).length).toBeGreaterThan(20);
    }
  });
});
