import { describe, expect, it } from "vitest";
import { maskEmail, signupEmailLines, signupPushAlert } from "./admin-alerts";

describe("maskEmail", () => {
  /**
   * The rule this exists for: a signup push lands on a phone that may be
   * face-up on a desk, and the body shows before anyone unlocks it. The
   * domain plus a first character is enough for the operator to go looking,
   * without printing someone else's address in full on a lock screen.
   */
  it("keeps the domain and one character of the local part", () => {
    expect(maskEmail("daksheshbabu@gmail.com")).toBe("d******@gmail.com");
    expect(maskEmail("jo@example.org")).toBe("j*@example.org");
  });

  it("caps the mask so a long address does not blow up the line", () => {
    const masked = maskEmail("averyveryverylongaddressindeed@example.com");
    expect(masked).toBe("a******@example.com");
  });

  it("leaves a one-character local part alone rather than erasing it", () => {
    expect(maskEmail("a@example.com")).toBe("a@example.com");
  });

  it("does not mangle input that is not an address", () => {
    expect(maskEmail("not-an-address")).toBe("not-an-address");
    expect(maskEmail("@example.com")).toBe("@example.com");
  });

  it("splits on the LAST @, so a plus-tagged or quoted local part survives", () => {
    expect(maskEmail("first.last+mykavo@example.com")).toBe("f******@example.com");
  });

  it("trims surrounding whitespace", () => {
    expect(maskEmail("  dakshesh@gmail.com  ")).toBe("d******@gmail.com");
  });
});

describe("signupPushAlert", () => {
  it("names the person and says what happened", () => {
    const alert = signupPushAlert({ name: "Dakshesh Babu", email: "d@example.com" });
    expect(alert.title).toBe("New MyKavo signup");
    expect(alert.body).toContain("Dakshesh Babu");
    expect(alert.body).toContain("created an account");
  });

  it("falls back to the masked address when there is no name", () => {
    const alert = signupPushAlert({ name: null, email: "someone@example.com" });
    expect(alert.body).toContain("s******@example.com");
  });

  it("never carries a full address, named or not", () => {
    for (const name of ["Dakshesh Babu", null, "", "   "]) {
      const alert = signupPushAlert({ name, email: "daksheshbabu@gmail.com" });
      expect(alert.body).not.toContain("daksheshbabu@gmail.com");
    }
  });

  it("includes the running total when given one", () => {
    expect(signupPushAlert({ name: "Jo", email: "j@x.com", totalUsers: 42 }).body).toContain(
      "42 users",
    );
    expect(signupPushAlert({ name: "Jo", email: "j@x.com", totalUsers: 1 }).body).toContain(
      "1 user.",
    );
  });

  it("omits the total rather than printing a meaningless zero", () => {
    const alert = signupPushAlert({ name: "Jo", email: "j@x.com", totalUsers: 0 });
    expect(alert.body).toBe("Jo just created an account.");
  });

  /**
   * A signup is good news, not an incident. Sending it at a higher severity
   * would put it alongside a site being down, and the phone would treat it
   * the same way.
   */
  it("is informational, not an incident", () => {
    expect(signupPushAlert({ name: "Jo", email: "j@x.com" }).severity).toBe("INFO");
  });

  /**
   * Opens the app's Users screen. A relative path, because routeForNotification
   * in the app refuses anything that is not - an absolute URL must never
   * become a router target.
   */
  it("deep-links to the Users screen", () => {
    expect(signupPushAlert({ name: "Jo", email: "j@x.com" }).path).toBe("/users");
  });

  it("uses a path the app's router will accept", () => {
    const { path } = signupPushAlert({ name: "Jo", email: "j@x.com" });
    expect(path?.startsWith("/")).toBe(true);
    expect(path?.startsWith("//")).toBe(false);
  });
});

describe("signupEmailLines", () => {
  // Email is read on a screen the operator already unlocked, and is the copy
  // they would act on - so here the full address is the useful thing.
  it("uses the full address, unlike the push", () => {
    const mail = signupEmailLines({ name: "Dakshesh", email: "daksheshbabu@gmail.com" });
    expect(mail.subject).toBe("New MyKavo signup: Dakshesh");
    expect(mail.line).toContain("<daksheshbabu@gmail.com>");
  });

  it("falls back to the address when there is no name", () => {
    const mail = signupEmailLines({ name: "  ", email: "jo@example.com" });
    expect(mail.subject).toBe("New MyKavo signup: jo@example.com");
  });
});
