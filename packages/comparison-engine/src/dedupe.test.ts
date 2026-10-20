import { describe, expect, it } from "vitest";
import { changeConditionKey, KNOWN_CHANGE_STATUSES, KNOWN_PAGE_CHANGE_STATUSES } from "./dedupe";

const title = (currentValue: string) => ({
  changeType: "title_changed",
  category: "SEO",
  severity: "MEDIUM",
  currentValue,
});

describe("changeConditionKey", () => {
  it("treats the same change seen again as a repeat", () => {
    expect(changeConditionKey(title("New title"))).toBe(changeConditionKey(title("New title")));
  });

  it("treats a different new value as a new change", () => {
    expect(changeConditionKey(title("New title"))).not.toBe(changeConditionKey(title("Newer title")));
  });

  it("ignores the drifting percentage of a visual change", () => {
    const visual = (currentValue: string, severity = "MEDIUM") => ({
      changeType: "visual_difference",
      category: "VISUAL",
      severity,
      currentValue,
    });
    expect(changeConditionKey(visual("6.1% changed"))).toBe(changeConditionKey(visual("6.4% changed")));
    // ...but a page that got visibly worse is reported again.
    expect(changeConditionKey(visual("6.1% changed"))).not.toBe(changeConditionKey(visual("31% changed", "CRITICAL")));
  });

  it("ignores the drifting value of a performance change, not its severity", () => {
    const weight = (currentValue: string, severity = "HIGH") => ({
      changeType: "page_weight_increased",
      category: "PERFORMANCE",
      severity,
      currentValue,
    });
    expect(changeConditionKey(weight("3084 KB"))).toBe(changeConditionKey(weight("3091 KB")));
    expect(changeConditionKey(weight("2400 KB", "MEDIUM"))).not.toBe(changeConditionKey(weight("3084 KB")));
  });
});

describe("known statuses", () => {
  it("counts approved page changes as known, but not site-wide ones", () => {
    expect(KNOWN_PAGE_CHANGE_STATUSES).toContain("APPROVED");
    expect(KNOWN_CHANGE_STATUSES).not.toContain("APPROVED");
    expect(KNOWN_PAGE_CHANGE_STATUSES).not.toContain("RESOLVED");
  });
});
