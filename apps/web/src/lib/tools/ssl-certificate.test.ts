import { describe, expect, it } from "vitest";
import { daysUntil, expiryStatus, issuerChain, nameCovers, parseSubjectAltNames, summarizeCertificate, trustErrorText } from "./ssl-certificate";

describe("ssl certificate", () => {
  const now = new Date("2026-10-10T00:00:00Z");

  it("counts days left and grades expiry", () => {
    expect(daysUntil(new Date("2026-10-20T12:00:00Z"), now)).toBe(10);
    expect(expiryStatus(-1)).toBe("expired");
    expect(expiryStatus(3)).toBe("critical");
    expect(expiryStatus(14)).toBe("warning");
    expect(expiryStatus(60)).toBe("ok");
  });

  it("parses SANs and matches wildcards to exactly one label", () => {
    expect(parseSubjectAltNames("DNS:example.com, DNS:*.example.com, IP Address:1.2.3.4")).toEqual(["example.com", "*.example.com"]);
    expect(nameCovers("*.example.com", "www.example.com")).toBe(true);
    expect(nameCovers("*.example.com", "example.com")).toBe(false);
    expect(nameCovers("*.example.com", "a.b.example.com")).toBe(false);
    expect(nameCovers("example.com", "EXAMPLE.com.")).toBe(true);
  });

  it("summarizes a certificate and walks the issuer chain", () => {
    const root = { subject: { CN: "ISRG Root X1" }, issuer: { CN: "ISRG Root X1", O: "Internet Security Research Group" }, valid_from: "2015-06-04", valid_to: "2035-06-04" } as const;
    const inter = { subject: { CN: "R11" }, issuer: { CN: "ISRG Root X1", O: "Internet Security Research Group" }, valid_from: "2024-03-13", valid_to: "2027-03-12", issuerCertificate: root };
    const leaf = {
      subject: { CN: "example.com" },
      issuer: { CN: "R11", O: "Let's Encrypt" },
      valid_from: "Sep  1 00:00:00 2026 GMT",
      valid_to: "Nov 30 00:00:00 2026 GMT",
      subjectaltname: "DNS:example.com, DNS:www.example.com",
      issuerCertificate: inter,
    };
    const s = summarizeCertificate(leaf, "www.example.com", now);
    expect(s).toMatchObject({ subject: "example.com", issuer: "R11 (Let's Encrypt)", daysLeft: 51, status: "ok", coversHostname: true, lifetimeDays: 90 });
    expect(summarizeCertificate(leaf, "shop.example.com", now).coversHostname).toBe(false);
    expect(issuerChain(leaf)).toEqual(["R11 (Let's Encrypt)", "ISRG Root X1 (Internet Security Research Group)"]);
  });

  it("explains trust errors in plain English", () => {
    expect(trustErrorText(null)).toBeNull();
    expect(trustErrorText("CERT_HAS_EXPIRED")).toContain("expired");
    expect(trustErrorText("SOMETHING_ELSE")).toContain("SOMETHING_ELSE");
  });
});
