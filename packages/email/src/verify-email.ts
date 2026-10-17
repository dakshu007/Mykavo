/**
 * Email address verification. Transactional: sent on signup and when a
 * signed-in user asks for a new link, never on a schedule, so it carries no
 * unsubscribe headers. Plain on purpose - one sentence, one button, the raw
 * link for clients that strip buttons. Everything interpolated is escaped.
 */

export interface VerifyEmailData {
  /** The account holder's display name (may be empty). */
  name: string;
  /** Absolute Better Auth verification link (contains the signed token). */
  verifyUrl: string;
  /** Whole hours until the link expires. */
  expiresInHours: number;
  /** Days of Pro the account gets once verified, or null to leave it out. */
  trialDays: number | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same frame as every other MyKavo email (see shell() in templates.ts). */
function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#eceef4;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181d">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #e4e7ee">
      <span style="display:inline-block;font-size:17px;font-weight:600;letter-spacing:-0.01em">MyKavo</span>
    </div>
    <div style="padding:28px">${inner}</div>
    <div style="padding:20px 28px;border-top:1px solid #e4e7ee;font-size:12px;color:#9aa1b1">
      Know what changed. Fix what matters.
    </div>
  </div></body></html>`;
}

export const VERIFY_EMAIL_SUBJECT = "Confirm your email for MyKavo";

export function verifyEmailEmail(data: VerifyEmailData): { subject: string; html: string; text: string } {
  const firstName = data.name.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const hours = Math.max(1, Math.round(data.expiresInHours));
  const expiry = `This link expires in ${hours} hour${hours === 1 ? "" : "s"}.`;
  const trialLine =
    data.trialDays !== null
      ? `Confirming also starts your ${data.trialDays}-day Pro trial. No card needed.`
      : null;

  const inner = `
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#3556f4">Confirm your email</p>
    <h1 style="margin:0 0 6px;font-size:22px;font-weight:600;letter-spacing:-0.01em">${esc(greeting)}</h1>
    <p style="margin:0 0 ${trialLine ? "8px" : "20px"};font-size:14px;color:#5c6270">Confirm this address so MyKavo can send your change alerts to it.</p>
    ${trialLine ? `<p style="margin:0 0 20px;font-size:14px;color:#5c6270">${esc(trialLine)}</p>` : ""}
    <a href="${esc(data.verifyUrl)}" style="display:inline-block;background:#3556f4;color:#ffffff;text-decoration:none;font-weight:500;font-size:14px;padding:11px 22px;border-radius:9999px">Confirm email</a>
    <p style="margin:20px 0 0;font-size:12px;color:#9aa1b1">Button not working? Paste this link into your browser:<br/><span style="word-break:break-all">${esc(data.verifyUrl)}</span></p>
    <p style="margin:12px 0 0;font-size:12px;color:#9aa1b1">${esc(expiry)} If you did not create a MyKavo account, you can safely ignore this email.</p>
  `;

  const text =
    `${greeting}\n\n` +
    `Confirm this address so MyKavo can send your change alerts to it.\n` +
    (trialLine ? `${trialLine}\n` : "") +
    `\nConfirm: ${data.verifyUrl}\n\n` +
    `${expiry} If you did not create a MyKavo account, you can safely ignore this email.`;

  return { subject: VERIFY_EMAIL_SUBJECT, html: shell(inner), text };
}
