/**
 * Loopback egress proxy for every Chromium the worker launches (spec §11).
 *
 * Playwright's context.route sees most requests, but Chromium still does its
 * own DNS after the route check (a rebinding window), and route never sees
 * some traffic at all: WebSockets opened from workers, Lighthouse's Chrome,
 * preconnects. Pointing the browser at this proxy (--proxy-server) moves the
 * last hop into our code: for every CONNECT tunnel and plain-HTTP request the
 * proxy resolves the host through the shared guard and connects the socket to
 * a vetted address only (pinnedLookup). TLS stays end to end between the
 * browser and the site - the proxy only sees host:port for https.
 *
 * Listens on 127.0.0.1 only. Anything it refuses gets a 403 and the browser
 * reports a failed request; the scan never sees an internal response.
 */

import { createServer, request as httpRequest, type IncomingMessage, type ServerResponse } from "node:http";
import { connect, type AddressInfo, type Socket } from "node:net";
import type { Duplex } from "node:stream";
import {
  createSafeHostResolver,
  pinnedLookup,
  UnsafeUrlError,
  type SafeAddress,
  type SafeHostResolver,
} from "@mykavo/shared";

/** How long a vetted DNS answer is reused across requests. */
const DNS_CACHE_TTL_MS = 60_000;
const CONNECT_TIMEOUT_MS = 15_000;
/** Idle tunnels are torn down; a scan never needs one this long. */
const IDLE_TIMEOUT_MS = 120_000;

/** Request headers that describe the hop to the proxy, not the request. */
const HOP_HEADERS = ["proxy-connection", "proxy-authorization", "connection", "keep-alive"];

export interface EgressProxy {
  /** e.g. "http://127.0.0.1:41234" - pass as the browser's proxy server. */
  readonly server: string;
  /** Requests refused by the guard since start (for logs/metrics). */
  readonly refusedCount: number;
  close(): Promise<void>;
}

export interface EgressProxyOptions {
  /** Override the resolver (tests). Defaults to a cached resolveSafeHost. */
  resolver?: SafeHostResolver;
}

/** "host:port" or "[v6]:port" from a CONNECT request line. */
export function parseAuthority(authority: string): { host: string; port: number } | null {
  const match = /^(\[[0-9a-fA-F:.%]+\]|[^:[\]\s]+):(\d{1,5})$/.exec(authority);
  if (!match) return null;
  const port = Number(match[2]);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) return null;
  return { host: match[1].replace(/^\[|\]$/g, ""), port };
}

function connectPinned(host: string, port: number, addresses: SafeAddress[]): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, lookup: pinnedLookup(addresses) });
    const fail = (err: Error) => {
      socket.destroy();
      reject(err);
    };
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => fail(new Error("Upstream connect timed out.")));
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.removeListener("error", fail);
      socket.setTimeout(IDLE_TIMEOUT_MS);
      resolve(socket);
    });
  });
}

function refuseTunnel(client: Duplex, status: 400 | 403 | 502): void {
  const reason = status === 403 ? "Forbidden" : status === 400 ? "Bad Request" : "Bad Gateway";
  client.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

export async function startEgressProxy(options: EgressProxyOptions = {}): Promise<EgressProxy> {
  const resolve = options.resolver ?? createSafeHostResolver({ ttlMs: DNS_CACHE_TTL_MS });
  let refused = 0;

  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Plain-HTTP proxying: the request line carries an absolute URL.
    let target: URL;
    try {
      target = new URL(req.url ?? "");
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (target.protocol !== "http:" || target.username || target.password) {
      refused++;
      res.writeHead(403).end();
      return;
    }

    resolve(target.hostname)
      .then((addresses) => {
        const headers = { ...req.headers, host: target.host };
        for (const name of HOP_HEADERS) delete headers[name];
        const upstream = httpRequest(
          target,
          { method: req.method, headers, agent: false, lookup: pinnedLookup(addresses), timeout: CONNECT_TIMEOUT_MS },
          (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.rawHeaders);
            upstreamRes.pipe(res);
            upstreamRes.on("error", () => res.destroy());
          },
        );
        upstream.on("timeout", () => upstream.destroy(new Error("Upstream timed out.")));
        upstream.on("error", () => {
          if (!res.headersSent) res.writeHead(502).end();
          else res.destroy();
        });
        req.pipe(upstream);
      })
      .catch((err: unknown) => {
        if (err instanceof UnsafeUrlError) refused++;
        res.writeHead(err instanceof UnsafeUrlError ? 403 : 502).end();
      });
  });

  // HTTPS and WebSockets arrive as CONNECT tunnels.
  server.on("connect", (req: IncomingMessage, client: Duplex, head: Buffer) => {
    client.on("error", () => client.destroy());
    const target = parseAuthority(req.url ?? "");
    if (!target) {
      refuseTunnel(client, 400);
      return;
    }
    resolve(target.host)
      .then((addresses) => connectPinned(target.host, target.port, addresses))
      .then((upstream) => {
        upstream.on("error", () => client.destroy());
        upstream.on("timeout", () => upstream.destroy());
        upstream.on("close", () => client.destroy());
        client.on("close", () => upstream.destroy());
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length > 0) upstream.write(head);
        upstream.pipe(client);
        client.pipe(upstream);
      })
      .catch((err: unknown) => {
        if (err instanceof UnsafeUrlError) refused++;
        refuseTunnel(client, err instanceof UnsafeUrlError ? 403 : 502);
      });
  });

  // An Upgrade over plain HTTP (instead of CONNECT) is not supported.
  server.on("upgrade", (_req: IncomingMessage, client: Duplex) => {
    refuseTunnel(client, 400);
  });
  server.on("clientError", (_err: Error, client: Duplex) => {
    client.destroy();
  });

  await new Promise<void>((ready, failed) => {
    server.once("error", failed);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", failed);
      ready();
    });
  });
  const { port } = server.address() as AddressInfo;

  return {
    server: `http://127.0.0.1:${port}`,
    get refusedCount() {
      return refused;
    },
    close: () =>
      new Promise<void>((done) => {
        server.closeAllConnections();
        server.close(() => done());
      }),
  };
}
