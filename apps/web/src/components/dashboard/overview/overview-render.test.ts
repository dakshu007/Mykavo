import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildAttention, type AttentionInput } from "./attention";
import { deriveSetupGuide } from "./setup-guide-steps";
import { NeedsAttention } from "./needs-attention";
import { SetupGuide } from "./setup-guide";
import { AllClear } from "./all-clear";
import { SummaryRow } from "./summary-row";
import { WebsitesList } from "./websites-list";

const now = new Date(Date.UTC(2026, 9, 17, 12));
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

const baseInput: AttentionInput = {
  websites: [
    { id: "w1", name: "Acme Store", url: "https://acme.example.com", status: "ACTIVE" },
    { id: "w2", name: "Blog", url: "https://blog.example.com", status: "ERROR" },
  ],
  openChanges: [
    {
      id: "c1",
      websiteId: "w1",
      title: "Page now returns 404",
      severity: "CRITICAL",
      detectedAt: hoursAgo(2),
      pageUrl: "https://acme.example.com/pricing",
    },
  ],
  openAttentionTotals: new Map([["w1", 1]]),
  latestScans: new Map(),
  autoPause: new Map(),
  down: new Map(),
};

const health = { healthy: 1, needsAttention: 0, settingUp: 0, paused: 0 };

/** No en or em dashes in user-facing copy. */
const noDashes = (html: string) => expect(html).not.toMatch(/[–—]/);

describe("NeedsAttention", () => {
  it("renders grouped rows with a single Review action per change", () => {
    const html = renderToStaticMarkup(
      createElement(NeedsAttention, { attention: buildAttention(baseInput), now }),
    );
    expect(html).toContain("Needs your attention");
    expect(html).toContain("Page now returns 404");
    expect(html).toContain('href="/dashboard/changes/c1"');
    expect(html).toContain("Critical");
    expect(html).toContain("/pricing");
    expect(html).toContain("2h ago");
    expect(html).toContain("Monitoring stopped because of an error");
    expect(html).toContain('href="/dashboard/changes?website=all"');
    // The action names what it acts on for screen readers.
    expect(html).toContain('aria-label="Review: Page now returns 404 on Acme Store"');
    noDashes(html);
  });

  it("renders nothing when the list is empty", () => {
    const html = renderToStaticMarkup(
      createElement(NeedsAttention, {
        attention: buildAttention({ ...baseInput, websites: [], openChanges: [] }),
        now,
      }),
    );
    expect(html).toBe("");
  });
});

describe("SetupGuide", () => {
  it("shows progress, expands the current step and marks done steps", () => {
    const guide = deriveSetupGuide({
      websites: 1,
      firstWebsiteId: "w1",
      activeBaselines: 0,
      baselineInProgress: false,
      enabledAlertChannels: 0,
      defaultAlertEmail: "owner@example.com",
      wordpressDetected: false,
      wordpressConnected: false,
      extensionConnected: false,
      members: 1,
      pendingInvites: 0,
    });
    const html = renderToStaticMarkup(createElement(SetupGuide, { guide }));
    expect(html).toContain("1 of 3 done");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="1"');
    expect(html).toContain("Done: </span>Add a website");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('href="/dashboard/websites/w1"');
    expect(html).toContain("Optional");
    expect(html).not.toContain("Dismiss");
    noDashes(html);
  });
});

describe("AllClear", () => {
  it("says nothing needs attention, with last and next scan times", () => {
    const html = renderToStaticMarkup(
      createElement(AllClear, {
        health,
        lastScan: { at: hoursAgo(3), websiteName: "Acme Store" },
        nextScan: { at: new Date(now.getTime() + 5 * 3_600_000), websiteName: "Acme Store" },
        lowerPriorityOpen: 2,
        now,
      }),
    );
    expect(html).toContain("Nothing needs your attention");
    expect(html).toContain("3h ago");
    expect(html).toContain("in 5h");
    expect(html).toContain("2 lower-priority changes");
    noDashes(html);
  });

  it("explains a baseline in progress instead of claiming all is well", () => {
    const html = renderToStaticMarkup(
      createElement(AllClear, {
        health: { healthy: 0, needsAttention: 0, settingUp: 1, paused: 0 },
        lastScan: null,
        nextScan: null,
        lowerPriorityOpen: 0,
        now,
      }),
    );
    expect(html).toContain("Your baseline is on its way");
    expect(html).not.toContain("Nothing needs your attention");
  });
});

describe("SummaryRow and WebsitesList", () => {
  it("renders the four numbers", () => {
    const html = renderToStaticMarkup(
      createElement(SummaryRow, {
        websites: 3,
        monitoredPages: 12,
        health: { healthy: 2, needsAttention: 1, settingUp: 0, paused: 0 },
        scansLast7Days: 21,
        changesLast30Days: 7,
      }),
    );
    for (const text of ["Websites monitored", "12 pages watched", "Healthy", "1 needs attention", "Scans completed", "21", "Changes caught", "7"]) {
      expect(html).toContain(text);
    }
    noDashes(html);
  });

  it("lists websites with uptime and status", () => {
    const html = renderToStaticMarkup(
      createElement(WebsitesList, {
        websites: [
          {
            id: "w1",
            name: "Acme Store",
            url: "https://acme.example.com",
            status: "ACTIVE",
            lastScanAt: null,
            nextScanAt: null,
            monitoredPages: 1,
            up: false,
          },
        ],
      }),
    );
    expect(html).toContain("acme.example.com · 1 page");
    expect(html).toContain('aria-label="Down"');
    expect(html).toContain("Monitoring");
  });
});
