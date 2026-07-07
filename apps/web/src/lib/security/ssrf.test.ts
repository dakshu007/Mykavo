import { describe, expect, it } from "vitest";
import { assertSafeUrl, isBlockedIp, UnsafeUrlError } from "./ssrf";

describe("isBlockedIp", () => {
  it.each([
    "127.0.0.1",
    "127.255.255.254",
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "192.168.255.255",
    "169.254.169.254", // cloud metadata
    "169.254.0.1",
    "0.0.0.0",
    "100.64.0.1", // CGNAT
    "198.18.0.1", // benchmarking
    "224.0.0.1", // multicast
    "255.255.255.255",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "11.0.0.1"])(
    "allows public %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(false);
    },
  );

  it.each(["::1", "::", "fc00::1", "fd00:ec2::254", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:192.168.1.1"])(
    "blocks IPv6 %s",
    (ip) => {
      expect(isBlockedIp(ip)).toBe(true);
    },
  );

  it("allows public IPv6", () => {
    expect(isBlockedIp("2606:4700:4700::1111")).toBe(false);
  });

  it("blocks non-IP input", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
  });
});

describe("assertSafeUrl", () => {
  async function expectCode(url: string, code: UnsafeUrlError["code"]) {
    await expect(assertSafeUrl(url)).rejects.toMatchObject({ code });
  }

  it("rejects non-http(s) schemes", async () => {
    await expectCode("file:///etc/passwd", "SCHEME_NOT_ALLOWED");
    await expectCode("ftp://example.com/", "SCHEME_NOT_ALLOWED");
    await expectCode("gopher://example.com/", "SCHEME_NOT_ALLOWED");
  });

  it("rejects credentials in URLs", async () => {
    await expectCode("https://user:pass@example.com/", "CREDENTIALS_IN_URL");
  });

  it("rejects localhost and internal hostnames", async () => {
    await expectCode("http://localhost/", "BLOCKED_HOST");
    await expectCode("http://localhost:3000/admin", "BLOCKED_HOST");
    await expectCode("http://router.local/", "BLOCKED_HOST");
    await expectCode("http://db.internal/", "BLOCKED_HOST");
    await expectCode("http://intranet/", "BLOCKED_HOST");
    await expectCode("http://metadata.google.internal/", "BLOCKED_HOST");
  });

  it("rejects literal blocked IPs without DNS", async () => {
    await expectCode("http://127.0.0.1/", "BLOCKED_IP");
    await expectCode("http://169.254.169.254/latest/meta-data/", "BLOCKED_IP");
    await expectCode("http://192.168.1.1/", "BLOCKED_IP");
    await expectCode("http://[::1]/", "BLOCKED_IP");
    await expectCode("http://[fd00:ec2::254]/", "BLOCKED_IP");
  });

  it("rejects unparseable input", async () => {
    await expectCode("http://[bad", "INVALID_URL");
  });

  it("accepts a literal public IP", async () => {
    const url = await assertSafeUrl("http://93.184.216.34/");
    expect(url.hostname).toBe("93.184.216.34");
  });
});
