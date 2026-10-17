import { describe, expect, it } from "vitest";
import { clientKey } from "./rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("https://mykavo.app/api/waitlist", { headers });
}

describe("clientKey", () => {
  it("prefers Netlify's connection IP over anything the client can send", () => {
    expect(
      clientKey(
        req({
          "x-nf-client-connection-ip": "203.0.113.7",
          "x-real-ip": "198.51.100.1",
          "x-forwarded-for": "10.0.0.1, 203.0.113.7",
        }),
      ),
    ).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(req({ "x-real-ip": " 198.51.100.1 ", "x-forwarded-for": "10.0.0.1" }))).toBe(
      "198.51.100.1",
    );
  });

  it("falls back to the first x-forwarded-for entry", () => {
    expect(clientKey(req({ "x-forwarded-for": " 192.0.2.4 , 10.0.0.1" }))).toBe("192.0.2.4");
  });

  it("is 'unknown' with no usable header", () => {
    expect(clientKey(req({}))).toBe("unknown");
    expect(clientKey(req({ "x-forwarded-for": " , " }))).toBe("unknown");
  });
});
