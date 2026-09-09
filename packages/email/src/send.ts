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

const SANDBOX_FROM = "MyKavo <onboarding@resend.dev>";
/**
 * Resend's sandbox sender delivers ONLY to the Resend account owner - mail to
 * anyone else is accepted and dropped. Fine for a first smoke test, useless
 * for customers, and indistinguishable from working unless you happen to be
 * the owner. Set EMAIL_FROM to an address on a verified domain.
 */
const FROM = process.env.EMAIL_FROM ?? SANDBOX_FROM;

let warnedSandbox = false;

export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const provider = resolveProvider();

  if (provider === "resend" && FROM === SANDBOX_FROM && !warnedSandbox) {
    warnedSandbox = true;
    console.warn(
      JSON.stringify({
        level: "warn",
        app: "email",
        msg: "EMAIL_FROM is Resend's sandbox sender - only the Resend account owner will receive mail",
      }),
    );
  }

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

  // Production with no RESEND_API_KEY. This used to return ok:true, so every
  // caller recorded a successful send for an email that was never written,
  // let alone delivered - the notification pipeline reporting success for
  // work it had not done. It is always a misconfiguration, never a valid
  // state, so it is reported as the failure it is and named loudly enough
  // to be found in a log.
  if (provider === "noop") {
    console.error(
      JSON.stringify({
        level: "error",
        app: "email",
        msg: "email NOT sent - RESEND_API_KEY is unset in production",
        subject: message.subject,
        recipients: message.to.length,
      }),
    );
    return {
      ok: false,
      provider,
      error: "RESEND_API_KEY is not configured - no email was sent",
    };
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
