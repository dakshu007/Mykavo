# Listing MyKavo in the Claude and ChatGPT directories

Everything needed to submit MyKavo's MCP server (`https://mykavo.app/api/mcp`)
as an official connector. Copy the text below into each portal.

## Before submitting (both)

| Item | Status |
|---|---|
| Remote HTTPS MCP server with OAuth (DCR, PKCE S256, refresh tokens) | Live |
| Every tool has a `title` and `readOnlyHint: true` | Live (all 7 tools) |
| Specific, actionable error messages | Live |
| Public documentation | https://mykavo.app/ai-assistants |
| Privacy policy covering connections | https://mykavo.app/privacy#ai-assistants |
| Terms | https://mykavo.app/terms |
| Support contact | support@mykavo.app |
| Icon | `plugins/chatgpt/mykavo/assets/icon.png` (512x512), `logo.png` (1024x1024) |
| Reviewer test account (Pro, populated, no MFA) | **To do: see below** |
| Tested as a custom connector in Claude and ChatGPT | Done (30 Oct 2026) |

### Reviewer test account

Reviewers need a dedicated account with sample data, never a real customer's.

1. Sign up at https://mykavo.app/signup with a new email you control (no
   two-factor, no magic link needed to log in).
2. Add 2 or 3 public websites (for example a personal site and two sites
   you have permission to monitor) and let the baseline scans finish.
3. Run one Site Audit on one of them.
4. Send the email to Claude in this repo's session: the workspace gets a
   permanent Pro subscription row (planId `pro`, status `active`,
   no period end), so the trial never runs out mid-review.
5. A day later, run a manual scan so there are detected changes to look at.

Keep this account and its password for every future review.

## Claude: claude.ai/directory/manage, Submit new, MCP connector

**1. Connection:** `https://mykavo.app/api/mcp` (or pick the custom connector
you already added).

**2. Tools:** sync automatically. All 7 should show as read-only.

**3. Listing**

- **Name:** MyKavo
- **One-liner (max 200):** See what changed or broke on the websites you monitor: SEO tags, uptime, visual layout, links, scripts and conversion elements, straight from MyKavo.
- **Description (max 2,000):**

  > MyKavo monitors websites for important changes and regressions and alerts you before small problems become expensive ones. This connector lets Claude read your MyKavo workspace so you can ask about your websites in plain words.
  >
  > Ask which site needs attention right now, what changed this week, what a specific change was (with its before and after values and severity), when each site was last scanned and whether any pages failed, what the latest site audit found and what to fix first, or which AI crawlers read your pages.
  >
  > Every answer comes from your real monitoring data and links to the before-and-after view in MyKavo. The connector is read-only: it can't change settings, approve changes, add websites or start scans. You approve it for one workspace on a MyKavo sign-in screen, and you can disconnect it at any time from the MyKavo dashboard.
  >
  > Built for agencies, freelancers and teams who look after many websites. Requires a MyKavo Pro or Agency plan (a free 14-day Pro trial is included with every new account).

- **Categories:** Developer tools, Marketing / SEO, Productivity (pick the closest available)
- **Documentation URL:** https://mykavo.app/ai-assistants
- **Privacy policy URL:** https://mykavo.app/privacy
- **Support contact:** support@mykavo.app
- **Icon:** `plugins/chatgpt/mykavo/assets/icon.png`
- **Slug (permanent):** `mykavo`

**4. Use cases**

- Primary use cases: checking which monitored website needs attention; reviewing changes detected this week; understanding a specific change; summarising site audits; checking scan history and AI crawler visits.
- Before connecting: a MyKavo account on the Pro or Agency plan (or the free Pro trial) with at least one monitored website.
- Reads data only.

**5. Company:** MyKavo, https://mykavo.app, primary contact Dakshesh (dakshesh@mykavo.app).

**6. Authentication:** Required. OAuth. Let Claude register automatically
(dynamic client registration). No client ID or secret to enter.

**7. Data handling:** Our own first-party API. No personal health data. No
sponsored content.

**8. Test & launch:** paste:

> Sign in at https://mykavo.app/login with the reviewer credentials below. The workspace is on the Pro plan and already monitors several websites with scan history, detected changes and a completed site audit.
>
> To connect: add the connector, click Connect, sign in with the same credentials, keep the selected workspace and click Allow. Then try: "Is anything wrong with my websites?", "What changed on my sites in the last 30 days?", "Explain the most serious open change", "Summarise the latest site audit for <website>", "Show the last 5 scans".
>
> Email: <reviewer email>
> Password: <reviewer password>

Confirm you tested every tool (done in Claude as a custom connector).

**9. Compliance:** all seven acknowledgments apply (first-party API, no
payments, no AI media generation, no prompt injection, no conversation data
collection, public docs live).

## ChatGPT: platform.openai.com/plugins

**Prerequisites:** an OpenAI platform organization you own, with **individual
or business verification** completed in organization settings, so the
listing shows "MyKavo".

**1. Upload** `mykavo-chatgpt-plugin.zip` (built from `plugins/chatgpt/mykavo`:
`plugin.json`, `mcp.json`, `assets/`). Choose your verified developer
identity.

**2. MCPs > Connect:** the portal shows a domain-verification token. Send it
to Claude in this repo's session (or set `OPENAI_APPS_CHALLENGE` in Netlify);
it is served at `https://mykavo.app/.well-known/openai-apps-challenge`. Then
connect, sign in with the reviewer account, click Allow and wait for the tool
scan.

**3. Review details:** reviewer credentials as above, plus:

Positive test cases

1. Prompt: "Is anything wrong with my websites right now?" Tool: `workspace_summary`. Expected: number of websites, open changes by severity and the most serious open issues, with a dashboard link.
2. Prompt: "List the websites I monitor in MyKavo." Tool: `list_websites`. Expected: each website with status, last and next scan, monitored pages and open changes.
3. Prompt: "Show high and critical changes from the last 30 days." Tool: `get_changes` (min_severity HIGH, days 30). Expected: matching changes with severity, page, title and before/after values.
4. Prompt: "Explain the most serious open change." Tools: `workspace_summary`, then `get_change`. Expected: what happened, why it matters, before and after, and a link to the before-and-after view.
5. Prompt: "What did the latest site audit for <website> find, and what should I fix first?" Tool: `get_site_audit`. Expected: health score, error/warning/notice counts and the top issues with fixes.

Negative test cases

1. Prompt: "Approve all my open changes in MyKavo." Expected: no tool performs it; the assistant explains the connector is read-only and points to the MyKavo dashboard.
2. Prompt: "Add example.org to MyKavo and start a scan." Expected: no write action; the assistant explains it can only read monitoring data.
3. Prompt: "Show the changes on competitor-site.example." Expected: `get_changes` returns an error naming the websites that are monitored; the assistant explains that site isn't in the workspace.

**Video walkthrough:** record 1 to 2 minutes: connect MyKavo in ChatGPT,
click Allow, run positive cases 1, 4 and 5, then negative case 1. Upload
unlisted to YouTube and paste the link.

**Release notes:** "1.0.0: first public release. Read-only access to MyKavo
websites, changes, scans, site audits and AI crawler visits, with OAuth
sign-in."

**Countries:** all available.

## After publishing

- Tool changes deploy with the web app; both directories pick them up from
  the live server.
- Keep the reviewer account, its websites and its Pro row in place.
- Claude escalations: mcp-review@anthropic.com. ChatGPT feedback arrives by
  email; reply to appeal.
