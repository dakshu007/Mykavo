import { describe, expect, it } from "vitest";
import {
  PROFILE_IMAGE_MAX_LENGTH,
  PROFILE_NAME_MAX_LENGTH,
  profileUpdateSchema,
} from "./schema";

const jpegDataUrl = (payload = "aGVsbG8=") => `data:image/jpeg;base64,${payload}`;
const pngDataUrl = (payload = "aGVsbG8=") => `data:image/png;base64,${payload}`;

describe("profileUpdateSchema", () => {
  it("accepts a name with the image field omitted (photo unchanged)", () => {
    const result = profileUpdateSchema.safeParse({ name: "Dakshu" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.image).toBeUndefined();
  });

  it("trims surrounding whitespace from the name", () => {
    const result = profileUpdateSchema.safeParse({ name: "  Dakshu  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Dakshu");
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(profileUpdateSchema.safeParse({ name: "" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a missing name", () => {
    expect(profileUpdateSchema.safeParse({ image: null }).success).toBe(false);
  });

  it("enforces the name length cap", () => {
    const max = "a".repeat(PROFILE_NAME_MAX_LENGTH);
    expect(profileUpdateSchema.safeParse({ name: max }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ name: `${max}a` }).success).toBe(false);
  });

  it("accepts inline JPEG and PNG data URLs", () => {
    expect(
      profileUpdateSchema.safeParse({ name: "D", image: jpegDataUrl() }).success,
    ).toBe(true);
    expect(
      profileUpdateSchema.safeParse({ name: "D", image: pngDataUrl() }).success,
    ).toBe(true);
  });

  it("accepts null image (remove photo)", () => {
    const result = profileUpdateSchema.safeParse({ name: "D", image: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.image).toBeNull();
  });

  it("rejects remote URLs - only inline data URLs are allowed", () => {
    for (const image of [
      "https://example.com/avatar.jpg",
      "http://example.com/a.png",
      "//example.com/a.png",
    ]) {
      expect(profileUpdateSchema.safeParse({ name: "D", image }).success).toBe(false);
    }
  });

  it("rejects script-capable and unsupported image formats", () => {
    for (const image of [
      "data:image/svg+xml;base64,aGVsbG8=",
      "data:image/gif;base64,aGVsbG8=",
      "data:image/webp;base64,aGVsbG8=",
      "data:text/html;base64,aGVsbG8=",
    ]) {
      expect(profileUpdateSchema.safeParse({ name: "D", image }).success).toBe(false);
    }
  });

  it("rejects data URLs with an invalid base64 payload", () => {
    for (const image of [
      "data:image/jpeg;base64,", // empty payload
      "data:image/jpeg;base64,<script>alert(1)</script>",
      "data:image/jpeg;base64,aGVs bG8=", // whitespace
      "data:image/jpeg;base64,aGVsbG8===", // over-padded
    ]) {
      expect(profileUpdateSchema.safeParse({ name: "D", image }).success).toBe(false);
    }
  });

  it("enforces the image length cap", () => {
    const headroom = "data:image/jpeg;base64,".length;
    const atCap = jpegDataUrl("A".repeat(PROFILE_IMAGE_MAX_LENGTH - headroom));
    expect(atCap.length).toBe(PROFILE_IMAGE_MAX_LENGTH);
    expect(profileUpdateSchema.safeParse({ name: "D", image: atCap }).success).toBe(
      true,
    );

    const overCap = jpegDataUrl("A".repeat(PROFILE_IMAGE_MAX_LENGTH - headroom + 1));
    expect(profileUpdateSchema.safeParse({ name: "D", image: overCap }).success).toBe(
      false,
    );
  });

  it("rejects non-string, non-null image values", () => {
    for (const image of [42, true, ["data:image/jpeg;base64,aGVsbG8="], {}]) {
      expect(profileUpdateSchema.safeParse({ name: "D", image }).success).toBe(false);
    }
  });
});
