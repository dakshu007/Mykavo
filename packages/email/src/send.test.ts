import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/** send.ts reads env at module load, so each case needs a fresh import. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return await import("./send");
}

const ORIGINAL = { ...process.env };

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("sendEmail provider selection", () => {
  it("logs instead of sending in development", async () => {
    const { sendEmail } = await load({
      NODE_ENV: "development",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    const res = await sendEmail({ to: ["a@b.com"], subject: "hi", html: "<p>hi</p>" });
    expect(res).toEqual({ ok: true, provider: "console" });
  });

  // The regression: production with no API key used to answer ok:true, so the
  // caller stored "sent" for an email that was never even composed into a
  // request. Silence that reads as success is the failure mode this repo has
  // been chasing all day.
  it("reports failure - not success - when RESEND_API_KEY is missing in production", async () => {
    const { sendEmail } = await load({
      NODE_ENV: "production",
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await sendEmail({ to: ["a@b.com"], subject: "hi", html: "<p>hi</p>" });
    expect(res.ok).toBe(false);
    expect(res.provider).toBe("noop");
    expect(res.error).toContain("RESEND_API_KEY");
    expect(err).toHaveBeenCalled();
  });

  it("warns once when still sending from Resend's sandbox address", async () => {
    const { sendEmail } = await load({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: undefined,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "1" }), { status: 200 })),
    );
    await sendEmail({ to: ["a@b.com"], subject: "one", html: "x" });
    await sendEmail({ to: ["a@b.com"], subject: "two", html: "x" });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("sandbox sender");
  });

  it("does not warn once EMAIL_FROM is a verified domain address", async () => {
    const { sendEmail } = await load({
      NODE_ENV: "production",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "MyKavo <alerts@mykavo.app>",
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "1" }), { status: 200 })),
    );
    const res = await sendEmail({ to: ["a@b.com"], subject: "hi", html: "x" });
    expect(res.ok).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });
});
