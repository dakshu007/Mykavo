import { createServer, request, type Server } from "node:http";
import { connect, type AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UnsafeUrlError, type SafeHostResolver } from "@mykavo/shared";
import { parseAuthority, startEgressProxy, type EgressProxy } from "./egress-proxy";

// The real guard would (correctly) refuse 127.0.0.1, so the tests inject a
// resolver: "site.test" stands in for a vetted public host and is pinned to
// the local origin server; "internal.test" is what the guard refuses.
const resolver: SafeHostResolver = async (hostname) => {
  if (hostname === "site.test") return [{ address: "127.0.0.1", family: 4 }];
  throw new UnsafeUrlError("BLOCKED_IP", "This host resolves to a blocked address.");
};

let origin: Server;
let originPort: number;
let proxy: EgressProxy;
let proxyPort: number;

beforeAll(async () => {
  origin = createServer((req, res) => {
    res.end(`host=${req.headers.host} path=${req.url}`);
  });
  await new Promise<void>((ready) => origin.listen(0, "127.0.0.1", ready));
  originPort = (origin.address() as AddressInfo).port;
  proxy = await startEgressProxy({ resolver });
  proxyPort = Number(new URL(proxy.server).port);
});

afterAll(async () => {
  await proxy.close();
  await new Promise<void>((done) => origin.close(() => done()));
});

/** Send a CONNECT and return the proxy's status line. */
function tunnel(authority: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port: proxyPort });
    socket.once("error", reject);
    socket.once("data", (chunk) => {
      resolve(chunk.toString("latin1").split("\r\n")[0]);
      socket.destroy();
    });
    socket.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`);
  });
}

/** Plain-HTTP request through the proxy (absolute-form request target). */
function viaProxy(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      { host: "127.0.0.1", port: proxyPort, path: url, headers: { host: new URL(url).host } },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c: string) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("parseAuthority", () => {
  it("parses host:port and bracketed IPv6", () => {
    expect(parseAuthority("example.com:443")).toEqual({ host: "example.com", port: 443 });
    expect(parseAuthority("[2606:4700::1]:8443")).toEqual({ host: "2606:4700::1", port: 8443 });
  });

  it("rejects malformed authorities", () => {
    expect(parseAuthority("example.com")).toBeNull();
    expect(parseAuthority("example.com:0")).toBeNull();
    expect(parseAuthority("example.com:70000")).toBeNull();
    expect(parseAuthority("http://example.com:80")).toBeNull();
  });
});

describe("startEgressProxy", () => {
  it("tunnels CONNECT to a vetted host, pinned to the vetted address", async () => {
    expect(await tunnel(`site.test:${originPort}`)).toBe("HTTP/1.1 200 Connection Established");
  });

  it("refuses CONNECT to a host the guard blocks", async () => {
    expect(await tunnel("internal.test:443")).toBe("HTTP/1.1 403 Forbidden");
    expect(await tunnel("169.254.169.254:80")).toBe("HTTP/1.1 403 Forbidden");
  });

  it("forwards plain HTTP to a vetted host with the original Host header", async () => {
    const res = await viaProxy(`http://site.test:${originPort}/a?b=1`);
    expect(res.status).toBe(200);
    expect(res.body).toBe(`host=site.test:${originPort} path=/a?b=1`);
  });

  it("refuses plain HTTP to blocked hosts and non-http targets", async () => {
    expect((await viaProxy("http://internal.test/")).status).toBe(403);
    expect((await viaProxy("http://user:pw@site.test/")).status).toBe(403);
    expect(proxy.refusedCount).toBeGreaterThanOrEqual(3);
  });
});
