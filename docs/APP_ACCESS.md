# Android app access

> Ask → approve → download. A guest list, not a lock.

The Android app is not on a store yet, so access is granted by hand. A visitor
asks from the homepage, the operator approves, an email goes out, and the
download appears in that person's dashboard. It doubles as a marketing list:
every request is a name and an address that wanted the app.

## Deploying this the first time

**The migration must run BEFORE the web deploy.** Without the table, the public
"Request the Android app" button answers `500` to every visitor — it is the one
route in this feature that unauthenticated strangers can reach.

```bash
cd packages/database
DATABASE_URL='<session-pooler-url>' pnpm exec prisma migrate deploy

# The migration enables RLS itself, but re-run the sweep so nothing is missed:
cd ../../apps/worker
DATABASE_URL='<session-pooler-url>' pnpm exec tsx src/scripts/enable-rls.ts
```

Session pooler is port **5432** (not the web app's 6543). Only then merge to
`main`.

## The flow

```
homepage → Request the Android app → name + email
                                        ↓
                              app_access_request (PENDING)
                                        ↓
     /dashboard/app-requests  or  app → Settings → Admin → App requests
                                        ↓
                                    Approve
                                        ↓
              email: "Your MyKavo Android app is ready to download"
                                        ↓
              link → /login?next=/dashboard/app?download=1  (if signed out)
                                        ↓
                    /dashboard/app — download starts by itself
                                        ↓
                        GET /api/app-access/download → 302 → APK
```

## Decisions worth keeping

**Keyed by email, not by user.** People ask before they have an account, so the
address is the only thing that can link a request to a login later. This is why
the form, the email and the dashboard all insist on *the same address as your
MyKavo account* — getting it wrong fails silently, and silence gets blamed on
the product.

**PENDING and DECLINED are indistinguishable.** Both simply have no download
and no nav entry. Somebody turned down should not meet a "declined" badge every
time they open the dashboard, and somebody still waiting hears by email rather
than from a permanent grey panel. `/dashboard/app` answers `notFound()` for
both, same as it does for a customer who never asked.

**Re-submitting the form never resets a decision.** The upsert updates only the
name. If it wrote `status: PENDING`, an approved user could revoke their own
access by filling the form again and a declined one could rejoin the queue on
demand.

**The public endpoint answers the same thing to everyone.** First request,
repeat request, already approved — one message. Anything else is a membership
oracle for an anonymous caller, and telling somebody their second submission
was a duplicate only makes them wonder whether the first worked.

**Approving is two steps, on purpose.** The decision is written, then the email
is sent — not in one transaction. A transaction spanning an HTTP call to a mail
provider holds a row lock for the length of somebody else's outage. Of the two
possible failures, *approved but the email failed* is recoverable (the queue
shows `email failed — approve again to retry`), while *emailed but the approval
rolled back* leaves somebody holding a link that shows them nothing.

**What the gate protects.** The APK is a PUBLIC GitHub release, so the bytes
are not secret and anybody who has seen that URL can fetch it forever. The gate
controls who is ever shown or emailed the link, and records who followed it. A
guest list, not a lock — worth saying plainly rather than implying a protection
that is not there. The download route is a 302 rather than a proxy for the same
reason: streaming ~60MB through a function per install would burn the bandwidth
budget this whole scheme exists to protect, and would gain nothing.

## Email validation

`validateSignupEmail` — structure, a disposable-provider blocklist, then an MX
lookup so the domain must actually accept mail. DNS *infrastructure* failures
fail open; a definitive NXDOMAIN fails closed.

This is not proof of ownership, and nothing short of a confirmation email is.
In practice the approval email *is* that proof: somebody who typed an address
they do not control never receives the link.

## Where things are

| Piece | Path |
|---|---|
| Rules (approval, re-send, labels) | `packages/shared/src/app-access.ts` |
| Approval email | `packages/email/src/templates.ts` — `appAccessApprovedEmail` |
| Queries | `apps/web/src/lib/app-access.ts` |
| Public request | `apps/web/src/app/api/app-access/request/route.ts` |
| Approve / decline | `apps/web/src/app/api/app-access/[id]/route.ts` |
| Gated download | `apps/web/src/app/api/app-access/download/route.ts` |
| Landing button + dialog | `apps/web/src/components/landing/request-app-dialog.tsx` |
| Operator queue (web) | `apps/web/src/app/dashboard/app-requests/page.tsx` |
| Operator queue (phone) | `apps/mobile/src/app/app-requests.tsx` |
| User download page | `apps/web/src/app/dashboard/app/page.tsx` |
| Release URL + paths | `apps/web/src/config/app-release.ts` |

## If nobody is getting the approval email

Same order as the welcome email (`docs/OPERATIONS.md`): `RESEND_API_KEY`, then
`EMAIL_FROM` (Resend's sandbox sender delivers only to the account owner and
silently drops everything else), then `APP_URL` — a wrong value puts the wrong
host in the download link.

The queue shows `emailSent` per row, so a failed send is visible rather than
guessed at. Pressing **Approve** again on an already-approved row re-sends
without changing anything else.
