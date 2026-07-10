import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WEBHOOK_CHANNEL_TYPES,
  channelTargetUrl,
  dispatchChannelMessage,
  formatDiscordPayload,
  formatSlackPayload,
  formatWebhookPayload,
  isWebhookChannelType,
  maskChannelUrl,
  signWebhookBody,
  validateChannelUrl,
  type ChannelMessage,
} from "./channels";
import { assertSafeUrl, UnsafeUrlError } from "./ssrf";

const MESSAGE: ChannelMessage = {
  title: "3 changes detected on example.com — highest: HIGH",
  lines: ["1 HIGH · 2 MEDIUM", "[HIGH] Title changed — /pricing"],
  url: "https://fluxen.app/dashboard/scans/scan_1",
  severity: "HIGH",
};

describe("channel type constants", () => {
  it("lists the three webhook-based channel types", () => {
    expect(WEBHOOK_CHANNEL_TYPES).toEqual(["SLACK", "DISCORD", "WEBHOOK"]);
  });

  it("recognizes webhook channel types and rejects others", () => {
    expect(isWebhookChannelType("SLACK")).toBe(true);
    expect(isWebhookChannelType("DISCORD")).toBe(true);
    expect(isWebhookChannelType("WEBHOOK")).toBe(true);
    expect(isWebhookChannelType("EMAIL")).toBe(false);
    expect(isWebhookChannelType("MICROSOFT_TEAMS")).toBe(false);
  });
});

describe("validateChannelUrl", () => {
  it("accepts a valid Slack incoming-webhook URL", () => {
    const result = validateChannelUrl("SLACK", "https://hooks.slack.com/services/T0/B0/xyz");
    expect(result.ok).toBe(true);
  });

  it("rejects Slack URLs on other hosts", () => {
    expect(validateChannelUrl("SLACK", "https://evil.example.com/services/T0/B0/x").ok).toBe(false);
    // Prefix match is on the full href, so a lookalike host must fail too.
    expect(validateChannelUrl("SLACK", "https://hooks.slack.com.evil.io/services/x").ok).toBe(false);
  });

  it("accepts both Discord webhook hosts", () => {
    expect(validateChannelUrl("DISCORD", "https://discord.com/api/webhooks/1/token").ok).toBe(true);
    expect(validateChannelUrl("DISCORD", "https://discordapp.com/api/webhooks/1/token").ok).toBe(
      true,
    );
  });

  it("rejects Discord URLs outside the webhook path", () => {
    expect(validateChannelUrl("DISCORD", "https://discord.com/api/users/@me").ok).toBe(false);
    expect(validateChannelUrl("DISCORD", "https://example.com/api/webhooks/1/t").ok).toBe(false);
  });

  it("accepts any https URL for generic webhooks", () => {
    expect(validateChannelUrl("WEBHOOK", "https://ops.example.com/hooks/fluxen").ok).toBe(true);
  });

  it("rejects non-https schemes for every type", () => {
    for (const type of WEBHOOK_CHANNEL_TYPES) {
      expect(validateChannelUrl(type, "http://example.com/hook").ok).toBe(false);
      expect(validateChannelUrl(type, "ftp://example.com/hook").ok).toBe(false);
      expect(validateChannelUrl(type, "file:///etc/passwd").ok).toBe(false);
    }
  });

  it("rejects URLs with embedded credentials", () => {
    expect(validateChannelUrl("WEBHOOK", "https://user:pass@example.com/hook").ok).toBe(false);
    expect(validateChannelUrl("WEBHOOK", "https://user@example.com/hook").ok).toBe(false);
  });

  it("rejects unparseable input", () => {
    expect(validateChannelUrl("WEBHOOK", "not a url").ok).toBe(false);
    expect(validateChannelUrl("WEBHOOK", "").ok).toBe(false);
  });
});

// The full SSRF guard (assertSafeUrl) resolves DNS for hostnames, so these
// cases stick to literal IPs and denylisted hostnames, which are rejected
// before any DNS lookup happens.
describe("SSRF guard on channel targets (DNS-free cases)", () => {
  it("rejects private and metadata IP literals", async () => {
    for (const target of [
      "https://127.0.0.1/hook",
      "https://10.0.0.8/hook",
      "https://172.16.0.1/hook",
      "https://192.168.1.1/hook",
      "https://169.254.169.254/latest/meta-data/",
      "https://[::1]/hook",
      "https://[fd00:ec2::254]/hook",
    ]) {
      await expect(assertSafeUrl(target)).rejects.toThrow(UnsafeUrlError);
    }
  });

  it("rejects localhost and internal hostnames", async () => {
    await expect(assertSafeUrl("https://localhost/hook")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("https://ci.internal/hook")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("https://intranet/hook")).rejects.toThrow(UnsafeUrlError);
  });

  it("allows public IP literals", async () => {
    await expect(assertSafeUrl("https://8.8.8.8/hook")).resolves.toBeInstanceOf(URL);
  });
});

describe("maskChannelUrl", () => {
  it("shows only scheme, host, and an ellipsis", () => {
    expect(maskChannelUrl("https://hooks.slack.com/services/T0/B0/secret")).toBe(
      "https://hooks.slack.com/…",
    );
    expect(maskChannelUrl("https://ops.example.com:8443/hooks/x?token=abc")).toBe(
      "https://ops.example.com:8443/…",
    );
  });

  it("degrades safely on invalid input", () => {
    expect(maskChannelUrl("not a url")).toBe("…");
  });
});

describe("channelTargetUrl", () => {
  it("reads webhookUrl for Slack and Discord, url for webhooks", () => {
    expect(channelTargetUrl("SLACK", { webhookUrl: "https://hooks.slack.com/x" })).toBe(
      "https://hooks.slack.com/x",
    );
    expect(channelTargetUrl("DISCORD", { webhookUrl: "https://discord.com/api/webhooks/1/t" })).toBe(
      "https://discord.com/api/webhooks/1/t",
    );
    expect(channelTargetUrl("WEBHOOK", { url: "https://example.com/hook" })).toBe(
      "https://example.com/hook",
    );
  });

  it("returns null for malformed configurations", () => {
    expect(channelTargetUrl("SLACK", null)).toBeNull();
    expect(channelTargetUrl("SLACK", "https://hooks.slack.com/x")).toBeNull();
    expect(channelTargetUrl("WEBHOOK", { webhookUrl: "https://example.com" })).toBeNull();
    expect(channelTargetUrl("WEBHOOK", { url: 42 })).toBeNull();
    expect(channelTargetUrl("WEBHOOK", { url: "" })).toBeNull();
  });
});

describe("formatSlackPayload", () => {
  it("produces mrkdwn text with bold title, bullets, and link", () => {
    expect(formatSlackPayload(MESSAGE)).toEqual({
      text: [
        "*3 changes detected on example.com — highest: HIGH*",
        "• 1 HIGH · 2 MEDIUM",
        "• [HIGH] Title changed — /pricing",
        "<https://fluxen.app/dashboard/scans/scan_1|View in Fluxen>",
      ].join("\n"),
    });
  });

  it("omits the link line when no url is set", () => {
    expect(formatSlackPayload({ title: "Scan failed", lines: [] })).toEqual({
      text: "*Scan failed*",
    });
  });
});

describe("formatDiscordPayload", () => {
  it("produces markdown content with bold title, bullets, and link", () => {
    expect(formatDiscordPayload(MESSAGE)).toEqual({
      content: [
        "**3 changes detected on example.com — highest: HIGH**",
        "- 1 HIGH · 2 MEDIUM",
        "- [HIGH] Title changed — /pricing",
        "https://fluxen.app/dashboard/scans/scan_1",
      ].join("\n"),
    });
  });
});

describe("formatWebhookPayload", () => {
  it("produces the structured alert payload", () => {
    const sentAt = new Date("2026-07-10T12:00:00.000Z");
    expect(formatWebhookPayload(MESSAGE, sentAt)).toEqual({
      event: "fluxen.alert",
      title: MESSAGE.title,
      lines: MESSAGE.lines,
      url: MESSAGE.url,
      severity: "HIGH",
      sentAt: "2026-07-10T12:00:00.000Z",
    });
  });

  it("omits url and severity keys when absent", () => {
    const payload = formatWebhookPayload({ title: "t", lines: [] }, new Date(0));
    expect(payload).toEqual({ event: "fluxen.alert", title: "t", lines: [], sentAt: "1970-01-01T00:00:00.000Z" });
    expect("url" in payload).toBe(false);
    expect("severity" in payload).toBe(false);
  });
});

describe("signWebhookBody", () => {
  it("computes sha256= HMAC of the exact body", () => {
    const body = JSON.stringify({ event: "fluxen.alert", title: "t" });
    const expected = `sha256=${createHmac("sha256", "s3cret").update(body, "utf8").digest("hex")}`;
    expect(signWebhookBody(body, "s3cret")).toBe(expected);
  });

  it("matches a known vector", () => {
    // echo -n 'hello' | openssl dgst -sha256 -hmac 'key'
    expect(signWebhookBody("hello", "key")).toBe(
      "sha256=9307b3b915efb5171ff14d8cb55fbcc798c6c0ef1456d66ded1a6aa723a58b7b",
    );
  });
});

// Dispatch tests use a WEBHOOK channel pointed at a public IP literal so the
// SSRF guard passes without a DNS lookup; fetch is always mocked. Slack and
// Discord dispatch paths require DNS (hooks.slack.com / discord.com), so
// their payloads are covered by the formatter tests above instead.
describe("dispatchChannelMessage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockFetch(response: Response): ReturnType<typeof vi.fn> {
    const fn = vi.fn().mockResolvedValue(response);
    vi.stubGlobal("fetch", fn);
    return fn;
  }

  it("POSTs the signed payload and reports success on 2xx", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    const result = await dispatchChannelMessage(
      { type: "WEBHOOK", configuration: { url: "https://8.8.8.8/hook", secret: "s3cret" } },
      MESSAGE,
    );
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://8.8.8.8/hook");
    expect(init.method).toBe("POST");
    expect(init.redirect).toBe("manual");

    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
    const body = init.body as string;
    expect(headers["x-fluxen-signature"]).toBe(signWebhookBody(body, "s3cret"));

    const parsed = JSON.parse(body) as Record<string, unknown>;
    expect(parsed.event).toBe("fluxen.alert");
    expect(parsed.title).toBe(MESSAGE.title);
    expect(parsed.lines).toEqual(MESSAGE.lines);
    expect(parsed.severity).toBe("HIGH");
  });

  it("omits the signature header without a secret", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 204 }));
    const result = await dispatchChannelMessage(
      { type: "WEBHOOK", configuration: { url: "https://8.8.8.8/hook" } },
      MESSAGE,
    );
    expect(result.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["x-fluxen-signature"]).toBeUndefined();
  });

  it("treats non-2xx (including redirects) as failure", async () => {
    for (const status of [301, 400, 500]) {
      const fetchMock = mockFetch(new Response(null, { status }));
      const result = await dispatchChannelMessage(
        { type: "WEBHOOK", configuration: { url: "https://8.8.8.8/hook" } },
        MESSAGE,
      );
      expect(result.ok).toBe(false);
      expect(result.error).toContain(String(status));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      vi.unstubAllGlobals();
    }
  });

  it("returns an error instead of throwing when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network down")));
    const result = await dispatchChannelMessage(
      { type: "WEBHOOK", configuration: { url: "https://8.8.8.8/hook" } },
      MESSAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("blocks SSRF targets before any fetch happens", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    for (const url of ["https://169.254.169.254/hook", "https://127.0.0.1/hook", "https://[::1]/hook"]) {
      const result = await dispatchChannelMessage(
        { type: "WEBHOOK", configuration: { url } },
        MESSAGE,
      );
      expect(result.ok).toBe(false);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects bad configuration and unsupported types without fetching", async () => {
    const fetchMock = mockFetch(new Response(null, { status: 200 }));
    expect(
      (await dispatchChannelMessage({ type: "WEBHOOK", configuration: null }, MESSAGE)).ok,
    ).toBe(false);
    expect(
      (await dispatchChannelMessage({ type: "WEBHOOK", configuration: { url: "http://a.com" } }, MESSAGE)).ok,
    ).toBe(false);
    expect(
      (await dispatchChannelMessage({ type: "EMAIL", configuration: {} }, MESSAGE)).ok,
    ).toBe(false);
    expect(
      (
        await dispatchChannelMessage(
          { type: "SLACK", configuration: { webhookUrl: "https://not-slack.example.com/x" } },
          MESSAGE,
        )
      ).ok,
    ).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
