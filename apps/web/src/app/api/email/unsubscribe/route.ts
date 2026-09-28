import { NextResponse } from "next/server";
import { optOutByNotificationId } from "@/lib/email-opt-out";
import { appBaseUrl } from "@/lib/app-url";

/**
 * POST /api/email/unsubscribe?n=<notification id>
 *
 * Two callers:
 *  - Mail clients doing RFC 8058 one-click unsubscribe: they POST the body
 *    "List-Unsubscribe=One-Click" to the List-Unsubscribe URL and expect a
 *    2xx, no page, no confirmation.
 *  - The confirm button on /unsubscribe, which gets redirected back to that
 *    page with the outcome.
 *
 * GET is deliberately not supported: link scanners and prefetchers follow
 * GET links in email, and would unsubscribe people who never clicked.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const id = url.searchParams.get("n") ?? (form?.get("n") as string | null) ?? null;
  const oneClick = form?.get("List-Unsubscribe") === "One-Click";

  const result = await optOutByNotificationId(id, oneClick ? "one_click" : "unsubscribe_link");

  if (oneClick) {
    // Answer 200 for an unknown id too: the result is nobody else's business.
    return new NextResponse(null, { status: result === "error" ? 500 : 200 });
  }
  const back = new URL(`${appBaseUrl()}/unsubscribe`);
  if (id) back.searchParams.set("n", id);
  back.searchParams.set(result === "ok" ? "done" : "error", "1");
  return NextResponse.redirect(back, 303);
}
