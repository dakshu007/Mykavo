/**
 * Pluggable email sender (spec §8: Resend). Zero-budget: the "console"
 * provider logs emails in development so the whole notification pipeline
 * works with no account. Set RESEND_API_KEY to send real email via Resend's
 * free tier - no SDK, just their REST API.
 */

export interface EmailMessage {
  to: string[];
  subject: string;
  html: string;
  text?: string;
}

export interface SendResult {
  ok: boolean;
  provider: "console" | "resend" | "noop";
  id?: string;
  error?: string;
}

function resolveProvider(): "console" | "resend" | "noop" {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.EMAIL_PROVIDER === "console" || process.env.NODE_ENV !== "production") {
    return "console";
  }
  return "noop";
}

const FROM = process.env.EMAIL_FROM ?? "MyKavo <onboarding@resend.dev>";

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const provider = resolveProvider();

  if (provider === "console") {
    console.log(
      JSON.stringify({
        level: "info",
        app: "email",
        msg: "email (console provider)",
        to: message.to,
        subject: message.subject,
        htmlBytes: message.html.length,
      }),
    );
    return { ok: true, provider };
  }

  if (provider === "noop") {
    return { ok: true, provider };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, provider, error: `Resend ${res.status}: ${detail.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, provider, id: data.id };
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err instanceof Error ? err.message : "Email send failed",
    };
  }
}
