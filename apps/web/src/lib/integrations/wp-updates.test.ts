import { describe, expect, it } from "vitest";
import { NOTE_MAX, buildUpdateNote, updateEventSchema } from "./wp-updates";

describe("buildUpdateNote", () => {
  it("names a single plugin update with its versions", () => {
    expect(
      buildUpdateNote([{ type: "plugin", name: "WooCommerce", from: "8.1.0", to: "8.2.0" }], "manual"),
    ).toBe("Updated WooCommerce 8.1.0 → 8.2.0");
  });

  it("says when WordPress did it on its own", () => {
    expect(buildUpdateNote([{ type: "core", name: "core", from: "6.7", to: "6.8" }], "auto")).toBe(
      "Auto-updated WordPress 6.7 → 6.8",
    );
  });

  it("summarises a batch and never leads with translations", () => {
    expect(
      buildUpdateNote(
        [
          { type: "translation", name: "Yoast SEO" },
          { type: "theme", name: "Astra", from: "4.6", to: "4.7" },
          { type: "plugin", name: "Elementor", from: "3.20", to: "3.21" },
        ],
        "manual",
      ),
    ).toBe("Updated Astra 4.6 → 4.7 and 2 more");
  });

  it("names activations, deactivations and theme switches", () => {
    expect(buildUpdateNote([{ type: "plugin", name: "Rank Math", action: "activate" }], "manual")).toBe(
      "Activated Rank Math",
    );
    expect(
      buildUpdateNote(
        [
          { type: "plugin", name: "WP Rocket", action: "deactivate" },
          { type: "plugin", name: "Autoptimize", action: "deactivate" },
        ],
        "manual",
      ),
    ).toBe("Deactivated WP Rocket and 1 more");
    expect(buildUpdateNote([{ type: "theme", name: "Astra", action: "switch" }], "manual")).toBe(
      "Switched theme to Astra",
    );
    expect(
      buildUpdateNote([{ type: "plugin", name: "Forms", from: "1.0", to: "1.1", action: "update" }], "manual"),
    ).toBe("Updated Forms 1.0 → 1.1");
  });

  it("handles unknown versions and stays within the column", () => {
    expect(buildUpdateNote([{ type: "plugin", name: "Forms", to: null }], "manual")).toBe("Updated Forms");
    const long = buildUpdateNote([{ type: "plugin", name: "x".repeat(100), from: "1".repeat(40), to: "2".repeat(40) }], "auto");
    expect(long.length).toBeLessThanOrEqual(NOTE_MAX);
  });
});

describe("updateEventSchema", () => {
  it("rejects empty or oversized batches and unknown types", () => {
    expect(updateEventSchema.safeParse({ trigger: "manual", items: [] }).success).toBe(false);
    expect(
      updateEventSchema.safeParse({ trigger: "auto", items: [{ type: "mu-plugin", name: "x" }] }).success,
    ).toBe(false);
    expect(
      updateEventSchema.safeParse({
        trigger: "auto",
        items: Array.from({ length: 51 }, () => ({ type: "plugin", name: "x" })),
      }).success,
    ).toBe(false);
  });

  it("accepts the action field and stays compatible with plugins that omit it", () => {
    expect(
      updateEventSchema.safeParse({ trigger: "manual", items: [{ type: "plugin", name: "x", action: "activate" }] }).success,
    ).toBe(true);
    expect(updateEventSchema.safeParse({ trigger: "manual", items: [{ type: "plugin", name: "x" }] }).success).toBe(true);
    expect(
      updateEventSchema.safeParse({ trigger: "manual", items: [{ type: "plugin", name: "x", action: "delete" }] }).success,
    ).toBe(false);
  });
});
