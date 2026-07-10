import { z } from "zod";

/**
 * Validation for POST /api/profile. The client downscales avatars to a
 * 256×256 JPEG before upload, but the server never trusts that: photos must
 * be inline JPEG/PNG data URLs under the length cap. SVG (script-capable)
 * and remote URLs are rejected outright.
 */

export const PROFILE_NAME_MAX_LENGTH = 80;

/** Data-URL length cap. Base64 inflates ~4/3, so this is ~100 KB decoded. */
export const PROFILE_IMAGE_MAX_LENGTH = 140_000;

const IMAGE_DATA_URL_PATTERN = /^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(PROFILE_NAME_MAX_LENGTH),
  /**
   * Omitted = keep the current photo; null = remove it; string = replace it
   * with an inline JPEG or PNG data URL.
   */
  image: z
    .union([
      z
        .string()
        .max(PROFILE_IMAGE_MAX_LENGTH)
        .regex(IMAGE_DATA_URL_PATTERN, "Photo must be an inline JPEG or PNG."),
      z.null(),
    ])
    .optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
