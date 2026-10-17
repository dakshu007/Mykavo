import type { LookupAddress, LookupOptions } from "node:dns";
import { beforeEach, describe, expect, it, vi } from "vitest";

// DNS is fully controlled: no test here touches the network.
const dns = vi.hoisted(() => ({
  answers: new Map<string, Array<{ address: string; family: number }>>(),
  calls: [] as string[],
}));
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async (hostname: string) => {
    dns.calls.push(hostname);
    const answer = dns.answers.get(hostname);
    if (!answer) throw Object.assign(new Error("ENOTFOUND"), { code: "ENOTFOUND" });
    return answer;
  }),
}));

import {
  assertSafeUrl,
  createSafeHostResolver,
  isBlockedIp,
  parseIpv6,
  pinnedLookup,
  resolveSafeHost,
  safeFetch,
  UnsafeUrlError,
} from "./ssrf";

beforeEach(() => {
  dns.answers.clear();
  dns.calls.length = 0;
});

describe("isBlockedIp - IPv4", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "192.88.99.1",
    "224.0.0.1",
    "255.255.255.255",
  ])("blocks %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "93.184.216.34", "172.32.0.1", "11.0.0.1"])("allows %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });
});

describe("isBlockedIp - IPv6", () => {
  it.each([
    ["::", "unspecified"],
    ["::1", "loopback"],
    ["::ffff:127.0.0.1", "IPv4-mapped loopback, dotted"],
    ["::ffff:7f00:1", "IPv4-mapped loopback, hex"],
    ["::ffff:a9fe:a9fe", "IPv4-mapped metadata 169.254.169.254, hex"],
    ["::ffff:c0a8:101", "IPv4-mapped 192.168.1.1, hex"],
    ["0:0:0:0:0:ffff:0a00:0001", "IPv4-mapped 10.0.0.1, uncompressed"],
    ["::7f00:1", "IPv4-compatible loopback"],
    ["::127.0.0.1", "IPv4-compatible loopback, dotted"],
    ["::8.8.8.8", "IPv4-compatible (deprecated), even public"],
    ["64:ff9b::7f00:1", "NAT64 well-known prefix"],
    ["64:ff9b::a9fe:a9fe", "NAT64 to metadata"],
    ["64:ff9b:1::a00:1", "NAT64 local-use prefix"],
    ["2002:7f00:1::1", "6to4 embedding 127.0.0.1"],
    ["2002:808:808::1", "6to4 even with a public IPv4"],
    ["2001::1", "Teredo"],
    ["2001:0:4136:e378:8000:63bf:3fff:fdd2", "Teredo, full form"],
    ["2001:db8::1", "documentation"],
    ["3fff::1", "documentation (RFC 9637)"],
    ["100::1", "discard-only"],
    ["fc00::1", "ULA"],
    ["fd00:ec2::254", "AWS metadata (ULA)"],
    ["fe80::1", "link-local"],
    ["fe80::1%eth0", "link-local with zone id"],
    ["ff02::1", "multicast"],
  ])("blocks %s (%s)", (ip) => {
    expect(isBlockedIp(ip)).toBe(true);
  });

  it.each([
    "2606:4700:4700::1111", // Cloudflare DNS
    "2001:4860:4860::8888", // Google DNS (2001:4860::/32 is outside 2001::/23)
    "2a00:1450:4001:82a::200e",
    "::ffff:8.8.8.8", // mapped public IPv4 is judged by the IPv4
    "::ffff:808:808",
  ])("allows public %s", (ip) => {
    expect(isBlockedIp(ip)).toBe(false);
  });

  it("blocks non-IP input", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("")).toBe(true);
  });
});

describe("parseIpv6", () => {
  it("expands compressed and dotted forms to the same bytes", () => {
    expect(parseIpv6("::ffff:127.0.0.1")).toEqual(parseIpv6("::ffff:7f00:1"));
    expect(parseIpv6("0:0:0:0:0:0:0:1")).toEqual(parseIpv6("::1"));
    expect(Array.from(parseIpv6("2001:db8::ff00:42:8329") ?? [])).toEqual([
      0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0xff, 0x00, 0x00, 0x42, 0x83, 0x29,
    ]);
  });

  it("returns null for non-IPv6 input", () => {
    expect(parseIpv6("127.0.0.1")).toBeNull();
    expect(parseIpv6("1::2::3")).toBeNull();
    expect(parseIpv6("example.com")).toBeNull();
  });
});

describe("assertSafeUrl", () => {
  async function expectCode(url: string, code: UnsafeUrlError["code"]) {
    await expect(assertSafeUrl(url)).rejects.toMatchObject({ code });
  }

  it("rejects non-http(s) schemes and credentials", async () => {
    await expectCode("file:///etc/passwd", "SCHEME_NOT_ALLOWED");
    await expectCode("ws://example.com/", "SCHEME_NOT_ALLOWED");
    await expectCode("https://user:pass@example.com/", "CREDENTIALS_IN_URL");
    await expectCode("http://[bad", "INVALID_URL");
  });

  it("rejects internal hostnames without resolving them", async () => {
    await expectCode("http://localhost:3000/", "BLOCKED_HOST");
    await expectCode("http://db.internal/", "BLOCKED_HOST");
    await expectCode("http://intranet/", "BLOCKED_HOST");
    expect(dns.calls).toEqual([]);
  });

  it.each([
    "http://[::ffff:7f00:1]/",
    "http://[::ffff:127.0.0.1]/", // the URL parser rewrites this to the hex form
    "http://[::ffff:a9fe:a9fe]/latest/meta-data/",
    "http://[::7f00:1]/",
    "http://[64:ff9b::a9fe:a9fe]/",
    "http://[64:ff9b:1::a00:1]/",
    "http://[2002:7f00:1::1]/",
    "http://[2001::1]/",
    "http://[fd00:ec2::254]/",
    "http://169.254.169.254/",
    "http://2130706433/", // 127.0.0.1 as a decimal integer
    "http://0x7f.1/",
  ])("rejects the IP literal in %s", async (url) => {
    await expectCode(url, "BLOCKED_IP");
  });

  it("accepts public literals", async () => {
    expect((await assertSafeUrl("http://93.184.216.34/")).hostname).toBe("93.184.216.34");
    expect((await assertSafeUrl("https://[2606:4700:4700::1111]/")).hostname).toBe("[2606:4700:4700::1111]");
  });

  it("rejects a host when ANY resolved address is blocked", async () => {
    dns.answers.set("mixed.example.com", [
      { address: "93.184.216.34", family: 4 },
      { address: "::ffff:a9fe:a9fe", family: 6 },
    ]);
    await expectCode("https://mixed.example.com/", "BLOCKED_IP");
  });

  it("accepts a host that resolves only to public addresses", async () => {
    dns.answers.set("public.example.com", [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    await expect(assertSafeUrl("https://public.example.com/")).resolves.toBeInstanceOf(URL);
  });

  it("reports DNS failures distinctly", async () => {
    await expectCode("https://nxdomain.example.com/", "DNS_FAILURE");
  });
});

describe("resolveSafeHost / createSafeHostResolver", () => {
  it("returns the vetted addresses with their family", async () => {
    dns.answers.set("public.example.com", [
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    expect(await resolveSafeHost("PUBLIC.example.com.")).toEqual([
      { address: "93.184.216.34", family: 4 },
      { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
    ]);
    expect(await resolveSafeHost("[2606:4700:4700::1111]")).toEqual([
      { address: "2606:4700:4700::1111", family: 6 },
    ]);
  });

  it("caches answers and failures per host", async () => {
    dns.answers.set("cached.example.com", [{ address: "93.184.216.34", family: 4 }]);
    dns.answers.set("evil.example.com", [{ address: "10.0.0.5", family: 4 }]);
    const resolve = createSafeHostResolver();
    await resolve("cached.example.com");
    await resolve("CACHED.example.com");
    await expect(resolve("evil.example.com")).rejects.toMatchObject({ code: "BLOCKED_IP" });
    await expect(resolve("evil.example.com")).rejects.toMatchObject({ code: "BLOCKED_IP" });
    expect(dns.calls).toEqual(["cached.example.com", "evil.example.com"]);
  });

  it("re-resolves after the TTL", async () => {
    vi.useFakeTimers();
    try {
      dns.answers.set("ttl.example.com", [{ address: "93.184.216.34", family: 4 }]);
      const resolve = createSafeHostResolver({ ttlMs: 1_000 });
      await resolve("ttl.example.com");
      vi.advanceTimersByTime(1_001);
      dns.answers.set("ttl.example.com", [{ address: "127.0.0.1", family: 4 }]);
      await expect(resolve("ttl.example.com")).rejects.toMatchObject({ code: "BLOCKED_IP" });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("pinnedLookup", () => {
  const vetted = [
    { address: "93.184.216.34", family: 4 as const },
    { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 as const },
  ];

  function run(options: LookupOptions): Promise<{ err: NodeJS.ErrnoException | null; address: string | LookupAddress[]; family?: number }> {
    return new Promise((resolve) => {
      pinnedLookup(vetted)("anything.example.com", options, (err, address, family) =>
        resolve({ err, address, family }),
      );
    });
  }

  it("answers only with the vetted addresses, whatever hostname is asked", async () => {
    expect(await run({ all: true })).toMatchObject({ err: null, address: vetted });
    expect(await run({})).toMatchObject({ err: null, address: "93.184.216.34", family: 4 });
    expect(await run({ family: 6 })).toMatchObject({ address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 });
  });

  it("fails rather than falling back to real DNS when no vetted address fits", async () => {
    const result = await new Promise<NodeJS.ErrnoException | null>((resolve) => {
      pinnedLookup([vetted[0]])("x.example.com", { family: 6 }, (err) => resolve(err));
    });
    expect(result?.code).toBe("ENOTFOUND");
    expect(dns.calls).toEqual([]);
  });
});

describe("safeFetch", () => {
  it.each([
    ["http://127.0.0.1/", "BLOCKED_IP"],
    ["http://[::ffff:7f00:1]/", "BLOCKED_IP"],
    ["http://[64:ff9b::a9fe:a9fe]/", "BLOCKED_IP"],
    ["http://localhost/", "BLOCKED_HOST"],
    ["ftp://example.com/", "SCHEME_NOT_ALLOWED"],
  ])("refuses %s before connecting", async (url, code) => {
    await expect(safeFetch(url)).rejects.toMatchObject({ code });
  });

  it("refuses a hostname that resolves to a private address", async () => {
    dns.answers.set("rebind.example.com", [{ address: "192.168.0.10", family: 4 }]);
    await expect(safeFetch("https://rebind.example.com/")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
