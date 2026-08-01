import { z } from "zod";
import { isValidBrandColor } from "@/lib/client-report";

export const BRAND_NAME_MAX_LENGTH = 60;

/** ~200 KB of base64 - logos are small; the client downscales first. */
export const BRAND_LOGO_MAX_LENGTH = 280_000;

/**
 * Workspace branding for white-label client reports. `logo` mirrors the
 * profile avatar contract: a data URL replaces, null removes, omitted keeps.
 */
export const brandingUpdateSchema = z.object({
  brandName: z.string().trim().min(1).max(BRAND_NAME_MAX_LENGTH).nullable(),
  brandColor: z
    .string()
    .refine(isValidBrandColor, "Use a #rrggbb color.")
    .nullable(),
  logo: z
    .string()
    .regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Unsupported image format.")
    .max(BRAND_LOGO_MAX_LENGTH)
    .nullable()
    .optional(),
});
