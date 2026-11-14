import { describe, expect, it } from "vitest";
import {
  clarityConsentState,
  consentFromCookies,
  CONSENT_REQUIRED_REGIONS,
  gtagConsentDefaults,
  gtagConsentState,
  isMeasurementCookie,
  parseConsent,
} from "./consent";

describe("cookie consent", () => {
  it("reads only known choices", () => {
    expect(parseConsent("all")).toBe("all");
    expect(parseConsent("essential")).toBe("essential");
    expect(parseConsent("yes")).toBeNull();
    expect(consentFromCookies("a=1; mk_consent=essential; b=2")).toBe("essential");
    expect(consentFromCookies("a=1")).toBeNull();
  });

  it("never grants ad storage", () => {
    for (const c of ["all", "essential"] as const) {
      const s = gtagConsentState(c);
      expect([s.ad_storage, s.ad_user_data, s.ad_personalization]).toEqual(["denied", "denied", "denied"]);
    }
    expect(gtagConsentState("all").analytics_storage).toBe("granted");
    expect(gtagConsentState("essential").analytics_storage).toBe("denied");
    expect(clarityConsentState("essential")).toEqual({ ad_Storage: "denied", analytics_Storage: "denied" });
  });

  it("defaults to denied where consent comes first, granted elsewhere", () => {
    const [regional, global] = gtagConsentDefaults(null);
    expect(regional.analytics_storage).toBe("denied");
    expect(regional.region).toBe(CONSENT_REQUIRED_REGIONS);
    expect(CONSENT_REQUIRED_REGIONS).toEqual(expect.arrayContaining(["DE", "FR", "GB", "CH", "NO"]));
    expect(CONSENT_REQUIRED_REGIONS).not.toContain("US");
    expect(global.analytics_storage).toBe("granted");
    expect(global.region).toBeUndefined();
  });

  it("applies a stored choice everywhere", () => {
    expect(gtagConsentDefaults("essential")).toEqual([gtagConsentState("essential")]);
    expect(gtagConsentDefaults("all")).toEqual([gtagConsentState("all")]);
  });

  it("knows which cookies only measure", () => {
    for (const n of ["_ga", "_ga_DQMWRHWFK8", "_gid", "_gat_UA1", "_clck", "_clsk", "mk_src", "mk_utm", "mk_cta"]) {
      expect(isMeasurementCookie(n)).toBe(true);
    }
    for (const n of ["mk_consent", "__Secure-better-auth.session_token", "better-auth.session_token", "mk_srcx"]) {
      expect(isMeasurementCookie(n)).toBe(false);
    }
  });
});
