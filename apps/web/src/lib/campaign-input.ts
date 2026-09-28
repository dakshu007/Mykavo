import { z } from "zod";
import { AUDIENCE_KEYS, campaignEmail, type AudienceKey } from "@mykavo/email";
import { isSafeButtonUrl } from "@mykavo/shared";
import { env } from "@/lib/env";

/**
 * A campaign as the admin composer sends it, validated. Plain text only -
 * the template escapes it - and the button link must be an app path or an
 * https:// address.
 */

const oneLine = (max: number) => z.string().trim().max(max).refine((v) => !v.includes("\n"), "One line only.");

export const campaignSchema = z.object({
  name: oneLine(100).min(1, "Give it an internal name."),
  subject: oneLine(150).min(1, "Add a subject."),
  previewText: oneLine(150).default(""),
  heading: oneLine(120).min(1, "Add a heading."),
  body: z.string().trim().max(5000).min(1, "Write the message."),
  buttonLabel: oneLine(40).default(""),
  buttonUrl: z.string().trim().max(500).default("/dashboard"),
  audience: z.enum(AUDIENCE_KEYS as [AudienceKey, ...AudienceKey[]]),
});

export type CampaignInput = z.infer<typeof campaignSchema>;

export function parseCampaign(body: unknown): { ok: true; input: CampaignInput } | { ok: false; errors: Record<string, string> } {
  const r = campaignSchema.safeParse(body);
  if (!r.success) {
    const errors: Record<string, string> = {};
    for (const i of r.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, errors };
  }
  if (r.data.buttonLabel && !isSafeButtonUrl(r.data.buttonUrl)) {
    return { ok: false, errors: { buttonUrl: 'Use a path like "/dashboard" or an https:// address.' } };
  }
  return { ok: true, input: r.data };
}

const appBase = () => (env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");

export function absoluteButtonUrl(url: string): string {
  return url.startsWith("/") ? `${appBase()}${url}` : url;
}

export function renderCampaign(input: CampaignInput, mode: Parameters<typeof campaignEmail>[1]): string {
  return campaignEmail(
    { heading: input.heading, body: input.body, buttonLabel: input.buttonLabel, buttonUrl: absoluteButtonUrl(input.buttonUrl) },
    mode,
  );
}
