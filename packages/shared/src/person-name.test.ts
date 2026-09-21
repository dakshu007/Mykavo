import { describe, expect, it } from "vitest";
import {
  checkPersonName,
  displayPersonName,
  isPlausibleName,
  NAME_MAX_LENGTH,
  normalizeName,
} from "./person-name";

describe("isPlausibleName - what it must accept", () => {
  /**
   * The reason this is not "alphabetic characters only". Every name below is
   * a real one that the obvious /^[a-zA-Z ]+$/ would turn away at signup, and
   * MyKavo's market is global. Rejecting a paying customer over an accent is
   * a worse outcome than a junk row in an admin list.
   */
  it("accepts accented Latin names", () => {
    for (const name of ["José", "Müller", "Ångström", "Renée", "Łukasz"]) {
      expect(isPlausibleName(name)).toBe(true);
    }
  });

  it("accepts names in non-Latin scripts", () => {
    for (const name of ["李明", "Дмитрий", "محمد", "साहिल", "ᐊᓂᖅ"]) {
      expect(isPlausibleName(name)).toBe(true);
    }
  });

  it("accepts ordinary punctuation in ordinary names", () => {
    for (const name of ["Jean-Luc", "O'Brien", "J. R. Smith", "Mary Anne", "D'Angelo"]) {
      expect(isPlausibleName(name)).toBe(true);
    }
  });

  it("accepts a two-letter name", () => {
    expect(isPlausibleName("Bo")).toBe(true);
    expect(isPlausibleName("Li")).toBe(true);
  });
});

describe("isPlausibleName - what it must reject", () => {
  /** The row that prompted all this. */
  it("rejects a row of dashes", () => {
    expect(checkPersonName("------------------")).toEqual({
      ok: false,
      reason: "too-few-letters",
    });
  });

  it("rejects other all-symbol strings", () => {
    for (const junk of ["....", "___", "***", "!!!", "///", "123456"]) {
      expect(isPlausibleName(junk)).toBe(false);
    }
  });

  /**
   * The check a pure letter-count would miss: one letter buried in a row of
   * punctuation passes "has a letter" but is obviously not a name.
   */
  it("rejects symbols with a letter hidden in them", () => {
    expect(checkPersonName("----a----")).toEqual({ ok: false, reason: "too-few-letters" });
    expect(checkPersonName("--ab------------")).toEqual({
      ok: false,
      reason: "mostly-symbols",
    });
  });

  it("rejects a single letter", () => {
    // The "k" in the admin list. One letter is not a name anyone typed in
    // earnest, and two is a low enough bar to keep Bo and Li.
    expect(checkPersonName("k")).toEqual({ ok: false, reason: "too-few-letters" });
  });

  it("rejects empty and whitespace-only input", () => {
    for (const blank of ["", "   ", "\t\n"]) {
      expect(checkPersonName(blank)).toEqual({ ok: false, reason: "empty" });
    }
    expect(checkPersonName(null)).toEqual({ ok: false, reason: "empty" });
    expect(checkPersonName(undefined)).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects adverts posing as names", () => {
    for (const spam of [
      "Buy now https://example.com",
      "visit www.example.com today",
      "Cheap SEO HTTPS://spam.example",
    ]) {
      expect(checkPersonName(spam)).toEqual({ ok: false, reason: "forbidden" });
    }
  });

  it("rejects control characters", () => {
    expect(checkPersonName("Jo\u0000hn")).toEqual({ ok: false, reason: "forbidden" });
  });

  it("rejects something longer than a name", () => {
    expect(checkPersonName("a".repeat(NAME_MAX_LENGTH + 1))).toEqual({
      ok: false,
      reason: "too-long",
    });
    expect(isPlausibleName("a".repeat(NAME_MAX_LENGTH))).toBe(true);
  });
});

describe("normalizeName", () => {
  it("collapses whitespace and trims", () => {
    expect(normalizeName("  Mary   Anne  ")).toBe("Mary Anne");
    expect(normalizeName("Jean\tLuc\nPicard")).toBe("Jean Luc Picard");
  });

  it("judges the normalized form, so padded junk is still junk", () => {
    expect(isPlausibleName("   ---   ")).toBe(false);
    expect(isPlausibleName("   José   ")).toBe(true);
  });
});

describe("displayPersonName", () => {
  /**
   * Validation only binds accounts created after it ships. Rows already in
   * the database keep whatever was stored, so the admin list needs something
   * better to show than the junk itself.
   */
  it("uses the name when it is usable", () => {
    expect(displayPersonName("José Alvarez", "j@example.com")).toBe("José Alvarez");
  });

  it("falls back to the address for an existing junk row", () => {
    expect(displayPersonName("------------------", "rajeshaithala4153@gmail.com")).toBe(
      "rajeshaithala4153",
    );
    expect(displayPersonName("k", "ksb040816@gmail.com")).toBe("ksb040816");
  });

  it("humanises a dotted or underscored local part", () => {
    expect(displayPersonName("...", "first.last@example.com")).toBe("first last");
    expect(displayPersonName(null, "jane_doe@example.com")).toBe("jane doe");
  });

  it("says Unnamed rather than printing junk, when nothing is usable", () => {
    expect(displayPersonName("----", "1234@example.com")).toBe("Unnamed");
    expect(displayPersonName("", "@example.com")).toBe("Unnamed");
  });

  it("never returns the junk it was given", () => {
    const junk = "------------------";
    expect(displayPersonName(junk, "someone@example.com")).not.toBe(junk);
  });
});
