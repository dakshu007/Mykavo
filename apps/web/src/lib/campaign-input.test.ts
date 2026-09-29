import { describe, expect, it, vi } from "vitest";
import { campaignEmail, toBrevoTags } from "@mykavo/email";
import { campaignFormFromBrevo, relativeButtonUrl } from "./campaign-input";

vi.mock("@/lib/env", () => ({ env: { APP_URL: "https://mykavo.app" } }));

const lists = { all: 13, free: 14, paid: 15, no_website: 16 };

function brevoDraft(listIds: number[], buttonUrl = "https://mykavo.app/dashboard/websites/new") {
  return {
    id: 21,
    name: "Founder note - Sept",
    subject: toBrevoTags("A quick question, {firstName}"),
    previewText: "",
    status: "draft",
    htmlContent: campaignEmail(
      { heading: "Thanks for trying MyKavo", body: "Hi {firstName},\n\nJust reply.", buttonLabel: "Add my website", buttonUrl },
      { kind: "brevo" },
    ),
    listIds,
  };
}

describe("reopening a Brevo draft in the composer", () => {
  it("restores every field, the audience and an app-relative link", () => {
    expect(campaignFormFromBrevo(brevoDraft([16]), lists)).toEqual({
      name: "Founder note - Sept",
      subject: "A quick question, {firstName}",
      previewText: "",
      heading: "Thanks for trying MyKavo",
      body: "Hi {firstName},\n\nJust reply.",
      buttonLabel: "Add my website",
      buttonUrl: "/dashboard/websites/new",
      audience: "no_website",
    });
  });

  it("keeps outside links as they are", () => {
    expect(campaignFormFromBrevo(brevoDraft([13], "https://example.com/guide"), lists)?.buttonUrl).toBe("https://example.com/guide");
  });

  it("is null for a campaign MyKavo did not write", () => {
    expect(campaignFormFromBrevo({ ...brevoDraft([13]), htmlContent: "<p>hello</p>" }, lists)).toBeNull();
  });

  it("maps absolute app links back to paths", () => {
    expect(relativeButtonUrl("https://mykavo.app/pricing")).toBe("/pricing");
    expect(relativeButtonUrl("https://mykavo.app.evil.com/x")).toBe("https://mykavo.app.evil.com/x");
  });
});
