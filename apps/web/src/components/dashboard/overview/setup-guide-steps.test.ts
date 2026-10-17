import { describe, expect, it } from "vitest";
import { deriveSetupGuide, type SetupGuideInput } from "./setup-guide-steps";

const fresh: SetupGuideInput = {
  websites: 0,
  firstWebsiteId: null,
  activeBaselines: 0,
  baselineInProgress: false,
  enabledAlertChannels: 0,
  defaultAlertEmail: "owner@example.com",
  wordpressDetected: false,
  wordpressConnected: false,
  extensionConnected: false,
  members: 1,
  pendingInvites: 0,
};

describe("deriveSetupGuide", () => {
  it("starts a brand-new account at Add a website, with three required steps", () => {
    const guide = deriveSetupGuide(fresh);
    expect(guide.steps.map((s) => s.id)).toEqual([
      "add-website",
      "approve-baseline",
      "set-up-alerts",
      "add-chrome-extension",
      "invite-teammate",
    ]);
    expect(guide).toMatchObject({
      requiredDone: 0,
      requiredCount: 3,
      complete: false,
      currentStepId: "add-website",
    });
    expect(guide.steps.find((s) => s.id === "add-chrome-extension")?.optional).toBe(true);
    expect(guide.steps.find((s) => s.id === "invite-teammate")?.optional).toBe(true);
  });

  it("links the baseline step to the first website and says when it is running", () => {
    const guide = deriveSetupGuide({
      ...fresh,
      websites: 1,
      firstWebsiteId: "w1",
      baselineInProgress: true,
    });
    const step = guide.steps.find((s) => s.id === "approve-baseline");
    expect(step).toMatchObject({ href: "/dashboard/websites/w1", done: false, actionLabel: "View progress" });
    expect(step?.description).toContain("running");
    expect(guide.currentStepId).toBe("approve-baseline");
  });

  it("names where alerts go today", () => {
    const step = deriveSetupGuide(fresh).steps.find((s) => s.id === "set-up-alerts");
    expect(step?.description).toContain("owner@example.com");
    expect(step?.href).toBe("/dashboard/notifications");
  });

  it("makes the WordPress plugin a required step on a WordPress site, replacing the extension", () => {
    const guide = deriveSetupGuide({
      ...fresh,
      websites: 1,
      firstWebsiteId: "w1",
      activeBaselines: 3,
      enabledAlertChannels: 1,
      wordpressDetected: true,
    });
    const ids = guide.steps.map((s) => s.id);
    expect(ids).toContain("install-wordpress-plugin");
    expect(ids).not.toContain("add-chrome-extension");
    expect(guide).toMatchObject({
      requiredDone: 3,
      requiredCount: 4,
      complete: false,
      currentStepId: "install-wordpress-plugin",
    });
  });

  it("is complete once the required steps are done, optional ones notwithstanding", () => {
    const guide = deriveSetupGuide({
      ...fresh,
      websites: 2,
      firstWebsiteId: "w1",
      activeBaselines: 4,
      enabledAlertChannels: 1,
    });
    expect(guide.complete).toBe(true);
    // Nothing required left: the next thing offered is the first optional step.
    expect(guide.currentStepId).toBe("add-chrome-extension");
  });

  it("counts a pending invite or a second member as inviting a teammate", () => {
    const invited = deriveSetupGuide({ ...fresh, pendingInvites: 1 });
    const joined = deriveSetupGuide({ ...fresh, members: 2 });
    expect(invited.steps.find((s) => s.id === "invite-teammate")?.done).toBe(true);
    expect(joined.steps.find((s) => s.id === "invite-teammate")?.done).toBe(true);
  });

  it("completes a WordPress site once the plugin is connected", () => {
    const guide = deriveSetupGuide({
      ...fresh,
      websites: 1,
      firstWebsiteId: "w1",
      activeBaselines: 1,
      enabledAlertChannels: 2,
      wordpressDetected: true,
      wordpressConnected: true,
    });
    expect(guide.complete).toBe(true);
  });
});
