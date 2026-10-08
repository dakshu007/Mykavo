# MyKavo for Chrome

"MyKavo - SEO & Website Monitor", live on the Chrome Web Store since
2026-10-06 (listing id `mejgmahebmmcbhmjknnbnfkepopbglpg`; the URL lives in
`apps/web/src/config/chrome-extension.ts`).

The extension is a **gateway into MyKavo, not a monitoring engine**. It gives
instant value without an account (a local on-page SEO check), makes connecting
the site nearly frictionless (one click, the site already filled in), and
brings people back with a status view. All monitoring stays server-side;
Chrome never needs to stay open.

## Files

| Path | What |
| --- | --- |
| `apps/extension/manifest.json` | MV3. Permissions: `activeTab`, `scripting`, `storage`, `contextMenus`; host permission `https://mykavo.app/*` only; one content script on `https://mykavo.app/connect/chrome/done*` |
| `apps/extension/popup.html/.css/.js` | The popup and its state machine: LOADING, UNSUPPORTED, READY (unconnected), AUTH_WAITING, CONNECTED, ERROR. Max 600 px tall (Chrome's cap): the view scrolls, the Protect card stays pinned |
| `apps/extension/lib/seo.js` | The 17 on-page checks. `extractPageFacts` runs inside the page via `chrome.scripting` and must stay self-contained |
| `apps/extension/lib/core.js` | `MYKAVO` base URL, site detection (`siteOf`), storage helpers, PKCE helpers |
| `apps/extension/background.js` | Connect handshake, code-for-token exchange, context menu, anonymous usage counts |
| `apps/extension/content/handoff.js` | Reads the one-time code on `/connect/chrome/done` and hands it to the background worker |
| `apps/extension/fonts/` | DM Sans, Poppins, Geist Mono (SIL OFL, `OFL.txt`) - bundled so nothing loads remotely |
| `apps/extension/store/` | Store screenshots and promo tiles (not in the zip) |
| `apps/extension/STORE_LISTING.md` | Listing copy, privacy-tab answers, permission justifications |

## How connecting works

The same authorization-code + PKCE handshake as the WordPress plugin, with no
return URL:

1. **Protect** (or the right-click item) → `background.js` generates `state`
   and a PKCE verifier (kept in `chrome.storage.session`) and opens
   `https://mykavo.app/connect/chrome?site&page&state&challenge&v&install`.
2. `app/(auth)/connect/chrome/page.tsx`: signed out → sign up / Google / sign
   in, with the site carried through `next`; signed in → one click. An existing
   website on the same host is connected; otherwise **Add & protect** creates
   it through `lib/website-create.ts` (the same SSRF check and plan limit as
   the dashboard).
3. `POST /api/extension/connect/approve` re-validates everything, creates a
   `site_connection` row (`platform = "chrome"`, code hash + challenge) and
   redirects to `/connect/chrome/done?code&state&w`.
4. The content script sends `{code, state}` to the background worker, which
   only accepts a `state` it issued, then calls
   `POST /api/wp/v1/connect/exchange` with the verifier and stores the
   returned token (scoped to that ONE website) in `chrome.storage.local`.
   Each browser keeps its own token; reconnecting retires the old one.
5. The done page shows "Extension connected" and sends the user on: page
   selection for a new website (`/dashboard/websites/new?website=<id>&page=`
   resumes the wizard at discovery, current page first), the website itself
   otherwise.

Connected popup data: `GET /api/wp/v1/status` (lean counts for one website),
`POST /api/wp/v1/scans` (Scan now, same plan gate as the dashboard),
`POST /api/wp/v1/disconnect` (menu → Disconnect). A 401 means the connection
was revoked: the popup forgets the site and shows the READY state.

## Tracking

- Anonymous per-install counts (installed, opened, page_checked,
  monitor_clicked, dashboard_opened, scan_triggered) → `POST
  /api/extension/events` → `extension_install` table. Never a URL or host.
  Users can switch them off in the popup menu.
- Server-side milestones on the same row: connect started, sign-in shown,
  signed up during the flow, website connected (+ the user).
- Per-user `activity_event` rows on channel `chrome`
  (`extension_connect_started`, `extension_auth_completed`,
  `extension_site_connected`, `extension_scan_triggered`).
- Admin → Tracking shows a Chrome channel per user and the 10-step funnel
  (installed → opened → checked → Protect → reached MyKavo → account →
  connected → dashboard → came back → paid).

## Releasing an update

1. Change the code; bump `version` in `manifest.json` (the store rejects a
   version it has seen) and `CHROME_EXTENSION_VERSION` in
   `apps/web/src/config/chrome-extension.ts`.
2. `apps/extension/pack.sh` → `apps/extension/dist/mykavo-chrome-<version>.zip`.
3. Upload in the Chrome Web Store developer dashboard → Package → Upload new
   package, then Submit for review.

Privacy-tab answers that matter: remote code **No**; data usage **Web
history** (the page address, only when Protect is pressed) and **User
activity** (the anonymous counts); privacy policy
`https://mykavo.app/privacy#chrome-extension`.

## Testing locally

Copy the extension, point `MYKAVO` (and the manifest's host permission and
content-script match) at the local web app, load it unpacked in Chromium
with `--load-extension`, and open `chrome-extension://<id>/popup.html` in a
tab with `chrome.tabs.query` patched to return the target tab. Map fake
public hostnames to a local test server with
`--host-resolver-rules="MAP example.com 127.0.0.1:<port>"` (the site detector
rejects dotless hosts like `localhost`). In the cloud sandbox add
`--no-proxy-server`.
