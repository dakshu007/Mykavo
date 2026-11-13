# MyKavo AI Keyword Agent: Build Spec for Claude Code

## Context

MyKavo (mykavo.app) is a live website change and regression monitoring SaaS built by Dakshesh B. Stack: pnpm monorepo with a Next.js 16 App Router web app, a Node.js worker, an Expo app and a Chrome MV3 extension. TypeScript, React 19, Tailwind CSS v4, PostgreSQL on Supabase with Prisma, pg-boss background jobs, Better Auth, Dodo Payments with Free, Starter, Pro and Agency tiers, Cloudflare R2, Resend and Brevo, Vitest tests, Zod validation at every API boundary. Google Search Console is already integrated via OAuth. A WordPress plugin and Shopify app already exist.

MyKavo was accepted into the Anthropic startup program and has $1,000 of Claude API credits. Goal: build a new AI feature, the **MyKavo AI Keyword Agent**, as a separate page inside MyKavo, with zero extra spend until paying customers arrive.

## Product goal

An AI SEO content agent that tells users exactly what to write next, then writes it. It must feel like magic, not like a keyword table.

## Build order

1. **Striking distance keywords (launch feature).** Use the user's Search Console data to find queries where they rank roughly positions 8 to 20 with meaningful impressions. Show the page, keyword, position, impressions and CTR, and a plain-English recommendation such as "one focused post could push this to page one".
2. **One-click post writer (launch feature).** From any keyword, the agent researches and writes a full optimised blog post: title, meta description, headings, body, FAQ, internal link suggestions and JSON-LD schema. Save as a draft and allow publishing as a draft to WordPress (existing plugin) and later Shopify.
3. **Content gaps.** Compare the user's pages against top competitor pages for a topic and list missing subtopics.
4. **Topic clusters.** Group keywords into pillar and cluster pages as a content plan.

## Zero-cost data sources

- **Google Search Console (primary):** real queries, impressions, clicks, CTR and positions for the user's own site. Already integrated.
- **Google autocomplete:** keyword idea expansion. It is an unofficial endpoint with no volume data, so rate-limit requests and cache results in Postgres.
- **Claude web search tool:** competitor page research, paid from API credits.
- **Google Keyword Planner (optional later):** free volume ranges, requires Google Ads API approval.
- **Later, once revenue exists:** DataForSEO for exact search volume and difficulty.

**Search Console connection flow:** each user clicks "Connect Google Search Console" and signs in with Google through MyKavo's existing OAuth flow, using a read-only scope. The agent reads only that user's own verified site data.

**Deep analysis mode for users without Search Console or a verified domain.** It must still produce a top-quality keyword plan, using only free sources and API credits:

1. **Understand the site:** fetch the homepage, sitemap.xml and key pages (SSRF-safe). Claude extracts the niche, products or services, audience, location, language and topics already covered.
2. **Seed keywords:** Claude generates 20 to 40 seed terms across the main services, problems customers have, comparisons and buying intent.
3. **Expand with autocomplete:** for each seed, query autocomplete with modifiers (a to z suffixes; how, what, best, vs, for, near me, price, free). Cache everything in Postgres and rate-limit.
4. **Read the results pages:** use the Claude web search tool on the strongest candidates. Note who ranks, and flag weak results (forums, thin pages, outdated posts, small sites) as easy-win opportunities.
5. **Competitor gaps:** fetch the top 3 to 5 competitor pages and extract their headings and subtopics to find topics the user's site is missing.
6. **Trend check (optional):** use Google Trends to mark rising versus declining topics.
7. **Cluster and score (Haiku, then Sonnet):** dedupe, group into topic clusters, and score each keyword on relevance to the business, search intent (informational, commercial, transactional), estimated competition from step 4, and popularity proxy (autocomplete position, how many seeds surfaced it).
8. **Output:** a ranked list of the top 20 opportunities, each with the reason it was chosen, its intent, a suggested post title and a one-click "write this post" button.

Never invent search volumes. Label every competition and popularity score as an estimate, and show a prompt explaining how verifying the site in Search Console unlocks real data.

## Agent architecture

- Use the Anthropic TypeScript SDK directly with a hand-written agent loop: model picks a tool, code runs it, result goes back, repeat until done, with a MAX\_STEPS cap.
- Run long jobs (research and writing) as pg-boss jobs in the worker; stream or poll progress in the UI.
- Suggested tools: get\_search\_console\_queries, find\_striking\_distance, get\_autocomplete\_ideas, web\_search\_competitors, fetch\_page (must use MyKavo's existing SSRF-safe URL validator), write\_post, save\_draft, publish\_to\_wordpress.
- Validate every tool input and output with Zod. Log every agent step for debugging and evals.

## Model strategy

- **Haiku 5.5:** cheap steps for all users, such as sorting, deduping and clustering keywords, and summarising competitor pages.
- **Sonnet 5.5 (default):** research analysis and final post writing, on every plan including Free. The free post is the sales demo, so it must be high quality.
- **Opus 5.5:** optional premium-quality writing on top tiers.
- Use prompt caching for the system prompt and long shared context.
- API prices: Opus 5.5 $4 input and $20 output per million tokens; Sonnet 5.5 $2 and $10; Haiku 5.5 $0.10 and $0.50. Estimated cost per full post on Sonnet: about 10 to 15 cents.

## Pricing plan

Final decision: the AI Keyword Agent is built into MyKavo's existing plans at the same prices, with no price increase. Worst-case API cost is about 15 to 20% of each plan's price. Revisit pricing once real usage data is available. Current MyKavo plans: Free (1 website), Starter $7 a month (2 websites), Pro $20 a month (8 websites), Agency $79 a month (30 websites, white-label reports, 15 team members). New accounts get a 14-day Pro trial.

| Plan | Keyword reports | AI posts a month | Extras | Est. max API cost |
| --- | --- | --- | --- | --- |
| Free | 1 a month, top 10 shown, rest blurred | 1 | None | about $0.30 |
| Starter $7 | Full report, monthly refresh | 3 | WordPress draft publish | about $1 |
| Pro $20 | Full reports for all sites; Search Console data refreshed weekly, deep competitor analysis monthly | 10 | Content gaps, striking distance | about $3 to $4 |
| Agency $79 | All sites; Search Console data refreshed weekly, deep competitor analysis monthly | 40 | Topic clusters, Opus option, white-label content reports | about $10 to $12 |

- **Add-on:** "AI Content Pack" at about $9 a month for 15 extra posts, available on any paid plan.
- **14-day Pro trial:** includes 3 AI posts, so new users experience the feature during the trial.
- **Placement in the app:** a new "Content" tab on each website's dashboard, next to monitoring and Site Audit, plus an "AI Keywords" item in the main sidebar showing opportunities across all sites.
- **Connect to monitoring:** Site Audit findings (missing titles, thin pages) feed the agent as extra opportunities, and every post published through MyKavo is automatically added to monitoring, so users see it indexed and ranking.
- **Upgrade prompts:** blurred keywords, an "out of posts" banner and locked content gaps link straight to the upgrade page.
- Enforce limits server-side using the existing plan-limit system. Track token usage per user per month.

**Post editor (not a full CMS).** The existing blog CMS is admin-only for MyKavo's own landing-page blog and must stay separate. Users do not need a full CMS, because their real CMS is WordPress, Shopify or similar. Build a lightweight user-facing "Posts" area per website instead:

- A list of AI-generated drafts with status (Draft, Published, Exported).
- An editor that reuses the existing Tiptap editor component, with title, meta description, slug, headings, body, FAQ and JSON-LD fields.
- Outputs: copy as HTML, copy as Markdown, download as .docx, and publish as a draft to WordPress via the existing plugin (Shopify later). No PDF.
- Scoped per user and website, with plan limits enforced server-side. No public pages, authors, scheduling or blog hosting.

**WordPress plugin integration (extend the existing MyKavo plugin):**

- **One-click publish:** send the post as a WordPress draft with title, slug, body, categories, tags and featured image.
- **SEO plugin fields:** fill Yoast or Rank Math meta title, meta description and focus keyword automatically, and add JSON-LD schema.
- **Smart internal links:** the plugin shares the site's existing post list so the agent links new posts to related old ones.
- **MyKavo AI panel in wp-admin:** users see keyword opportunities and generate posts without leaving WordPress.
- **Monitor after publish:** every published post is added to MyKavo monitoring automatically, with alerts if it breaks or gets set to noindex.
- Authenticate with the plugin's existing site connection. Never publish live automatically; always create drafts for the user to review.

**Audio version of posts (ElevenLabs): ON HOLD, do not build yet. Kept here for a later phase.** MyKavo was also accepted into the ElevenLabs startup program and has API credits. Voice briefs and voice input were considered and rejected.

- One click turns a finished post into natural narration using the ElevenLabs text-to-speech API, run as a pg-boss job.
- Store the audio file in Cloudflare R2 and show a player in the post editor.
- The WordPress plugin embeds a "Listen to this article" player at the top of the published post.
- Offer a small set of preset voices and a few languages.
- Available on Pro and Agency only, with a monthly audio limit per plan to protect credits. Track ElevenLabs credit usage in the same admin spend view and alerts as the Claude API.
- Regenerate audio only when the user asks, never automatically on every edit.

## Positioning and marketing

Do not rebrand MyKavo or rewrite its existing SEO pages. Monitoring stays the core; the AI Keyword Agent is the growth layer on top. Story: **MyKavo protects the traffic you have and helps you win more.** Monitoring catches what breaks; the agent finds what to write next.

- **Homepage:** keep the monitoring hero and add one new section introducing the AI Keyword Agent, with a link to its feature page.
- **New feature page:** /ai-keyword-agent explaining striking distance keywords, one-click posts, and WordPress publishing (audio is on hold, do not mention it yet).
- **New SEO landing pages:** target terms such as "AI SEO content writer", "striking distance keywords tool" and "Surfer SEO alternative", plus comparison pages against Surfer, Frase and Jasper.
- **Free tool:** a no-signup keyword ideas tool (autocomplete-based, top results only, rate-limited and cached) that funnels users into the free plan.
- **Pricing page:** add the AI features row to each plan.
- **Launch:** release notes on What's New, an email to existing users through Brevo, and a one-time bonus of 2 AI posts for every current user, counted inside the global free spend cap.

## User flow

1. **First open of the Content tab: pre-filled quick setup.** The agent reads the website (homepage, sitemap, key pages) using Haiku and pre-fills business type, products or services, target audience, country and language. The user reviews and clicks "Looks good" in about 30 seconds, or edits any field. No typing is required. This beats keyword-first tools like Surfer and Frase and avoids wasting credits on wrong assumptions. Settings stay editable later.

2) **Analysis runs: live progress plus notification.** After "Looks good", show live progress steps on screen (Reading your site, Finding keyword ideas, Checking competitors, Ranking opportunities) by polling the pg-boss job status. Show each opportunity as soon as it is found instead of waiting for the full report. The user can leave the page at any time; when the report is ready, send an email via Resend and a push notification via the Android app.

3. **The report: quick wins first.** Open with three big "Write these next" cards, each with the keyword, a plain-English reason, the expected impact and a "Write this post" button. The full ranked list sits below, with the rest blurred on the Free plan.
4. **One-click writing.** Clicking "Write this post" shows live writing progress, then opens the draft in the post editor, ready to edit, copy, download or publish to WordPress.
5. **Celebrate and track.** After publishing, MyKavo monitors the post and uses Search Console to track its ranking. Show progress on the Content tab and send a celebration email when a post reaches page one.

**Experience principle (applies to every screen):** onboarding must feel effortless and rewarding, so users come back regularly, love the feature and upgrade.

- **First value in under 3 minutes:** setup in 30 seconds, live results within a minute or two, first post one click away.
- **No blank screens:** always show a next step, a friendly empty state or progress.
- **Warm, human copy:** plain English, encouraging tone, no jargon.
- **Reasons to return:** a weekly email with fresh keyword opportunities and ranking wins; a Content tab that always shows "what to write next".
- **Upgrade at moments of delight:** prompt after a good report or a ranking win, never by blocking mid-task. Blurred keywords and an "out of posts" banner link to the upgrade page.
- **Measure it:** track setup completion, time to first post, weekly return rate and free-to-paid conversion in GA4.

## Loopholes and fixes (red-team review)

| Loophole | How a user exploits it | Fix |
| --- | --- | --- |
| Multiple free accounts | New emails or Gmail aliases for the same site | One free plan per domain; normalise emails (strip dots and +aliases); rate-limit signups per IP and device |
| Website hopping | Free user swaps their website each month to get new free reports | Quotas count per account, not per website; limit website changes on Free to once a month |
| Analysing other people's sites | Adds a big brand or competitor domain to get free research | Allowed, but cached per domain for 30 days so repeats cost nothing; posts and WordPress publishing need ownership (Search Console, the plugin or a meta tag) |
| Regenerate abuse | Deletes and rewrites posts so they never count | Count a post when generation starts, not when saved; include one free regeneration per post |
| Parallel request race | Fires many requests at once to slip past the limit check | Reserve quota atomically in a database transaction before queuing the job |
| Free general chatbot | Puts essays or homework requests into setup fields or topics | Zod length limits; Haiku checks the topic relates to the website before writing; posts only, no free chat |
| Prompt injection | Hidden text on a site or competitor page says "ignore your instructions" | Treat all fetched content as data; strict system prompt; validate outputs against the expected schema |
| SSRF | Enters internal or private URLs as a website or competitor | Run every URL through the existing SSRF-safe validator |
| Repeat trials | Starts a new 14-day Pro trial with new accounts | One trial per domain and per payment method |
| Use and refund | Buys Pro, generates all posts in a day, asks for a refund | Refunds exclude used AI credits; first-month posts unlock gradually (for example, half in week one) |
| Huge sites | Site with a 50,000-URL sitemap blows up cost | Cap pages fetched per analysis (for example, 30) and tokens per job |
| Runaway agent | Agent loops on tools and burns credits | MAX\_STEPS plus a token budget per job; abort and log when exceeded |
| Copying competitors | Posts reuse competitor wording, causing plagiarism or SEO penalties | Competitor pages are used only for topics and headings, never text; prompt for original writing; similarity check before saving |
| Spam content farms | Bulk-generates junk content | Plan limits, usage policy in the terms, and an admin flag for unusual volume |
| Google autocomplete blocked | The unofficial endpoint stops working | Fall back to Claude web search and Claude-generated ideas; show results without breaking the flow |

### Round 2: deeper loopholes

| Loophole | Risk | Fix |
| --- | --- | --- |
| Shared cache leaks private data | Caching reports per domain could show user A's Search Console numbers to user B | Share only public research (autocomplete, search results, competitor topics); never share Search Console-based data across accounts |
| Blur is only visual | Free users read the hidden keywords in browser devtools or the API response | The server returns only the top 10 to Free users; blurred rows are placeholders |
| Mismatched Search Console property | User connects Search Console for site A but analyses site B | Only use the Search Console property that matches the website's domain |
| Quota reset by plan switching | Upgrade, use posts, downgrade, upgrade again to reset quota | Quotas reset on the billing cycle date only, never on plan changes; used posts carry over within the cycle |
| Payment fails but usage continues | Subscription goes past due and the user keeps generating | Pause AI generation when billing is past due; keep reports viewable |
| Fake or harmful facts | Posts invent statistics, or give risky medical, legal or financial advice | Detect sensitive topics and add review warnings and disclaimers; no invented numbers; ask the user to review before publishing |
| Banned niches | Users generate content for illegal, adult or scam sites | Haiku policy check on the website and topic; block per Anthropic's usage policy and MyKavo terms |
| Keyword cannibalisation | Agent suggests a new post for a keyword an existing page already ranks for, so the two compete | Check existing pages first and suggest "update this page" instead of a new post |
| Stale ranking celebrations | Search Console data lags 2 to 3 days, so "page one" claims may be outdated | Show the data date on every ranking number and celebrate only confirmed results |
| Leaked API keys | Anthropic or ElevenLabs keys ship inside the web app, Expo app or Chrome extension | Keys live only on the server and worker; all AI calls go through MyKavo's backend |
| Stolen WordPress connection | A leaked token lets someone publish to a user's site | Tokens scoped per site, revocable from both MyKavo and wp-admin; drafts only, never live posts |
| Bots on the free tool | Scripts hammer the no-signup keyword tool | Cloudflare Turnstile, IP rate limits and cached results |
| Email reputation damage | Weekly emails to inactive free users cause spam complaints, hurting alert delivery | Send product emails from Brevo (not the Resend alert domain); stop weekly emails after 4 weeks of inactivity; one-click unsubscribe |
| Search Console disconnects | Token expires or is revoked and reports break | Detect it, fall back to deep analysis mode and ask the user to reconnect |
| Credits expire before revenue | Startup credits run out or expire unused | Record the expiry date in the admin view and alert 30 days before |

### Round 3: Google, legal, reliability and security

| Loophole | Risk | Fix |
| --- | --- | --- |
| Google penalises mass AI content | Users publish many generic posts, rankings drop and they blame MyKavo | Ask users for their own experience, examples and opinions before writing (E-E-A-T); add a quality checklist; recommend a steady publishing pace; always require human review |
| Who owns the content and who is liable | Disputes over copyright or harmful claims in a published post | Terms state the user owns the output and is responsible for reviewing and publishing it |
| Malicious HTML in posts | A user or injected content adds scripts that run in the MyKavo editor or on their WordPress site | Sanitise HTML server-side (Tiptap schema plus DOMPurify); WordPress sanitises again on insert |
| Fake or spam links | The agent invents URLs or links to dodgy sites | Internal links only from the site's real page list; external links checked to load before saving; no invented URLs |
| Anthropic outage or rate limits | Jobs fail at launch spikes and users lose quota | Retries with backoff, a worker concurrency limit, and quota refunded automatically when a job fails |
| Worker crash mid-job | The same job runs twice and charges quota twice | Idempotent job steps keyed by job id; quota charged once per job |
| Search Console API limits | Many users hit Google's daily API quota | Fetch Search Console data at most once a day per site and reuse it |
| Google OAuth verification | Google requires app verification for Search Console access, and unverified apps show warnings | Confirm the existing OAuth app is verified for the read-only Search Console scope before launch |
| Model price or name changes | A model is deprecated or prices change and margins shrink | Keep model names and prices in config; the admin view shows margin per plan |
| Agency team members | 15 members each burn their own quota, or junior members publish to client sites | Quota is shared per workspace; only owners and admins can publish to WordPress |
| Wrong language output | A Tamil or Hindi site gets English posts, or a mix | Enforce the profile language in the prompt and check the output language before saving |
| Password-protected or staging sites | Setup fetch fails on 401 pages or indexes a staging site | Detect 401 and noindex responses and show a friendly message to use the live site |
| Add-on misuse | Buys the AI Content Pack on Free, or keeps it after cancelling | Add-on only on paid plans and cancelled with the plan; unused posts do not roll over, stated clearly |
| GDPR requests | EU customers ask for their data or its deletion | Include content data in the existing data export and deletion flows; list Anthropic and ElevenLabs as sub-processors |

### Round 4: contradictions and gaps inside this spec

| Gap found | Problem | Fix |
| --- | --- | --- |
| Weekly refresh blows the budget | Weekly deep reports for 8 Pro sites cost about $10 a month, far above the $3 to $4 estimate; Agency with 30 sites is worse | Weekly refresh uses only cheap Search Console data; deep competitor analysis runs monthly (pricing table updated) |
| Launch scope too narrow | Build order launches striking distance only, but most free users have no Search Console, so they would get nothing | Launch scope = setup, striking distance, deep analysis mode, report screen and post writer |
| Ownership rule blocks free users | Round 1 requires ownership for posts, but free users without Search Console could never write their free post | Writing, copying and downloading posts needs no verification; only WordPress publishing needs the plugin connection |
| No celebrations without Search Console | Ranking tracking needs Search Console, so deep-analysis users never see wins | Show monitoring wins instead (post live, indexed, no errors) and invite them to connect Search Console to see rankings |
| Gradual unlock hurts first impressions | Unlocking half the posts in week one clashes with "first value in under 3 minutes" | Gradual unlock applies only to Agency in the first paid month; Starter and Pro get all posts immediately |
| Opus breaks the Agency cost estimate | Opus costs twice Sonnet, so 40 Opus posts exceed the $10 to $12 estimate | An Opus post counts as 2 posts from the quota |
| Weekly email has nothing for Free | Free users get one report a month, so a weekly opportunity email would be empty | Free users get a monthly digest; paid plans get the weekly email |
| Launch bonus could drain credits | Giving every existing user 3 posts could cost more than expected at once | Reduced to a one-time 2-post bonus inside the global free spend cap |
| Audio leftovers | Audio is on hold but still appears on the feature page, database list and spend tracking | Feature page fixed; PostAudio model and ElevenLabs tracking are deferred with the audio feature |
| Conflicting instructions for Claude Code | Earlier sections were written before later decisions | The First task now tells Claude Code that the Loopholes and fixes section and later rounds win any conflict |

### Round 5: operations and launch

| Loophole | Risk | Fix |
| --- | --- | --- |
| Long jobs time out | AI calls inside Netlify API routes hit serverless time limits | All analysis and writing runs in the Node.js worker; API routes only queue jobs and return status |
| Tiny sites with little Search Console data | Striking distance comes back empty and the report feels broken | If Search Console has too few impressions, switch to deep analysis mode automatically and explain why |
| Solo-founder support overload | Bad outputs create many support emails | In-app "Report a problem" on every report and post, with a short reason, logged for review |
| Feedback abused for free posts | Users report every post to get free regenerations | A reported post gets one free regeneration, and only once per post |
| No safe rollout | A bug at launch hits every user and burns credits | Launch behind a feature flag: admin first, then 20 beta users, then everyone |
| Untested quality for sites without Search Console | Evals only cover sites with Search Console data | The eval set includes at least 15 sites without Search Console across different niches and languages |
| Cost estimates never checked | Real cost per job may differ from the estimates in this spec | Log actual cost per report and post in AiUsage; review weekly and adjust limits or models |
| No kill switch | A runaway bug or abuse wave drains credits overnight | An admin toggle that pauses all AI generation instantly, with a friendly maintenance message for users |

### Round 6: final review (output quality, trust and edge cases)

| Loophole | Risk | Fix |
| --- | --- | --- |
| Same post for everyone in a niche | Two users targeting the same keyword get near-identical posts, which hurts both in Google | Write from each site's own profile, services and user input; similarity check against the account's earlier posts |
| Broken schema | AI-generated JSON-LD is invalid and Google ignores it | Validate JSON-LD against schema.org types before saving; drop invalid blocks |
| Old WordPress plugin versions | Users on an old plugin version cannot receive AI drafts, and publishing fails | Version check on connect; show an "update the plugin" prompt instead of failing silently |
| Chargebacks | A user disputes the payment after using posts | When Dodo Payments reports a dispute, pause AI generation on that account |
| Trust in data use | Users fear their Search Console data trains AI models | State on the Content tab and in the privacy policy that data is used only for their reports and that API data is not used to train models |
| Mobile app gap | Android users open a post notification but the app has no Content tab | Notification links open a read-only report view in the app, with "Write this post" opening the web app |
| Quota reset confusion | Users do not know when their posts refill | Show "X posts left, refills on DATE" on the Content tab and in the out-of-posts banner |

### Round 7: monitoring and AI agent working together (crash and conflict risks)

| Loophole | Risk | Fix |
| --- | --- | --- |
| AI jobs starve monitoring | Long AI jobs fill the shared pg-boss worker, so scheduled scans run late or are missed | Separate pg-boss queues with their own concurrency limits; scans always have priority over AI jobs |
| Browser pool crash | The setup fallback and the scanner both launch Playwright at once and run the worker out of memory | One shared, capped browser pool; AI fallback fetches wait their turn and time out cleanly |
| Auto-monitoring breaks page limits | Adding every published post to monitoring pushes users past their plan's page limit | Add a post only if the plan has room; otherwise ask the user to swap a page or skip |
| Drafts monitored as broken | A WordPress draft URL returns 404, so monitoring raises a false critical alert | Start monitoring only after the plugin reports the post is published and live |
| Alert storm from our own changes | Publishing or updating a page through MyKavo triggers change and regression alerts on that page | Mark changes made through MyKavo as expected and auto-update the baseline for that page |
| Site Audit floods the agent | A site with hundreds of audit issues creates hundreds of opportunities and a big AI bill | Feed only the top 10 audit issues by severity, summarised with Haiku |
| Recommending broken pages | The agent suggests improving pages that monitoring shows as noindex, redirected or erroring | Exclude pages with open critical monitoring alerts; suggest fixing the alert first |
| Shared database fills up | AI tables grow inside the 500 MB Supabase limit and scans start failing to save | Retention jobs for AI data; when the database passes 90%, pause new AI reports before monitoring is ever affected |
| Kill switch stops monitoring | The AI pause toggle accidentally disables shared jobs | The AI kill switch only pauses AI queues; monitoring jobs are never touched |
| Shared plan-limit code | A bug in new AI limit checks breaks monitoring limits | Separate limit keys for AI and monitoring, each covered by Vitest tests |
| Website deletion times out | Deleting a site with many posts, reports and scans in one request hits timeouts and leaves half-deleted data | Run deletion as a background job in batches, inside transactions |

### Round 8: data accuracy, AI output and deployment

| Loophole | Risk | Fix |
| --- | --- | --- |
| Domain variants | www vs non-www, http vs https and subdomains split Search Console data or match the wrong property | Normalise domains; support both Domain and URL-prefix Search Console properties and pick the one matching the monitored site |
| Wrong country results | Autocomplete and search results default to the server's location, not the user's market | Pass the profile's country and language to autocomplete and web search; cache per domain, country and language |
| Long posts cut off | A post hits max\_tokens and ends mid-sentence, but is saved as complete | Check the stop reason; continue or regenerate the missing part; never save a truncated post |
| Malformed AI output | The model returns broken JSON for reports or profiles and the job crashes | Use structured tool outputs validated with Zod; retry once with the error; fail gracefully and refund quota |
| Team edit conflicts | Two Agency members edit the same post and one overwrites the other | Version number on each post; warn on save if it changed since it was opened |
| Wrong cost tracking | Cache reads, retries and failed calls are not counted, so the spend view under-reports | Record usage from every API response, including retries, failures and cache tokens |
| Timezone quota bugs | Monthly quotas reset at different times for users in India, the US and Europe | Store all times in UTC and reset quotas on the billing cycle date from Dodo Payments |
| Risky production migration | New Prisma migrations lock large tables or fail on the live database | Only additive migrations (new tables and nullable columns); test on a copy of production first |
| Old Android app versions | Users on an older app version get errors from new API fields | Keep API responses backward compatible; new fields optional; minimum app version check |
| Cache poisoning | Junk or offensive autocomplete suggestions get cached and shown to many users | Filter suggestions for profanity and irrelevance with a word list and a Haiku pass before caching |

### Round 9: full audit of remaining categories

| Loophole | Risk | Fix |
| --- | --- | --- |
| Accessing other users' data (IDOR) | A user changes a post, report or website id in the URL or API call and sees another account's data | Every new API route and server action checks that the record belongs to the signed-in user's workspace; Vitest tests for cross-account access on every route |
| Missing auth on new routes | A new route forgets the session check | Shared auth wrapper required on all AI routes; a test that fails if any route under the AI namespace lacks it |
| API route abuse | Scripts hammer report or post endpoints even within quota | Per-user and per-IP rate limits on all AI routes |
| Sensitive data in logs | AgentStep logs store tokens, emails or full Search Console data | Redact secrets and personal data before logging; logs auto-delete after 7 days |
| No error visibility | Jobs fail silently and users see endless spinners | Error tracking for the worker and web app; every job ends in Done or Failed with a user-friendly message and a timeout |
| No backups | A bad migration or bug wipes content data | Confirm what backups the Supabase plan includes; run a weekly database export to R2 until on a paid plan |
| Vulnerable dependencies | New packages bring known security issues | Dependency audit in GitHub Actions; pin versions |
| Inaccessible UI | Screen-reader and keyboard users cannot use the Content tab or editor | Accessible components, keyboard navigation and labelled progress updates; Lighthouse accessibility check in CI |
| Launch-day load | A launch spike overloads the worker and database | Load test the queue with simulated users before launch; queue limits keep the site responsive |

## Final audit checklist and the truth about zero loopholes

After 9 rounds, 99 loopholes have been found and fixed across abuse, billing, security, privacy, AI quality, Google rules, legal, reliability, monitoring integration, data accuracy and deployment. No real product can guarantee zero loopholes, because new ones appear with real users and new features. The protection is the system around it:

- **Before launch:** every item in the Loopholes tables has a matching Vitest or Playwright test; the release is blocked if any fails.
- **At launch:** feature flag rollout (admin, then 20 beta users, then everyone), spend caps, the AI kill switch and spend alerts are live.
- **After launch:** review AI costs, failed jobs, "Report a problem" entries and unusual usage weekly; every new issue found gets a fix and a test added here.
- **Re-audit:** repeat this review whenever a major feature (audio, Shopify, new plans) is added.

**Setup details:** the website is already known because every user adds it through the existing "Add Website" flow; new users who come only for the AI feature add their URL once during signup through that same flow. Fetching uses a plain fetch first, falls back to the existing Playwright scanner for blocked or JavaScript-heavy sites, and if both fail the user fills the five fields manually. Haiku returns a structured, Zod-validated profile; country can also be inferred from domain ending, currency and phone numbers.

## Database (new Prisma models in the existing Postgres)

- **ContentProfile:** one per website; business type, services, audience, country, language, confirmed flag.
- **KeywordReport:** one per analysis run; website, source (Search Console or deep analysis), status, created date, expiry for the 30-day cache.
- **KeywordOpportunity:** rows in a report; keyword, intent, position, impressions, estimated competition, popularity proxy, reason, suggested title, cluster.
- **ContentPost:** AI drafts; website, keyword, title, slug, meta description, body, FAQ, JSON-LD, status, WordPress post id.
- **PostAudio:** ElevenLabs audio per post; voice, language, R2 file key, duration.
- **AiUsage:** per user per month; model, input and output tokens, cost, ElevenLabs credits, free or paid.
- **AutocompleteCache:** query, suggestions, fetched date, shared across users.
- **AgentStep:** a log of every tool call per job for debugging and evals.

**Data storage and privacy:** all generated data (profiles, reports, posts, audio) is stored in MyKavo's own Postgres and R2, scoped to the user's account. Store only derived Search Console results needed for reports, not raw full exports. Delete all of a user's content data when they delete a website or their account, and remove audio files from R2. Expire old keyword reports automatically through the existing retention jobs. Update the privacy policy to mention AI processing via Anthropic and ElevenLabs and Search Console data use.

**Free-tier storage limits:** Supabase free (500 MB database, shared with existing MyKavo data) and Cloudflare R2 free (10 GB, shared with screenshots). Design to stay inside them:

- A post is roughly 20 to 50 KB of text; a report roughly 50 to 100 KB. Store only the latest version of each post, no version history.
- Delete AgentStep logs after 7 days, AutocompleteCache entries after 30 days, and expired reports after 60 days.
- Audio: encode as 64 kbps mono MP3 (about 5 MB for a 10-minute article instead of about 10 MB). Delete audio when its post is deleted, and delete old audio when it is regenerated.
- Add database size and R2 usage to the admin spend view, with alerts at 70% and 90% of each limit.
- Upgrade Supabase or R2 only once paying customers arrive.

**Supabase egress (free plan: 5 GB uncached plus 5 GB cached per billing cycle, shared by all projects in the organization).** About 200 MB of the 500 MB database is already used. AI text is small, so the risk is wasteful queries, not content size:

- List screens select only light columns (title, status, date); load a post body only when it is opened. Paginate every list.
- Progress polling reads one tiny status row every 3 to 5 seconds and stops when the job finishes or the tab is hidden.
- Cache finished reports in the Next.js app and on the client; do not re-query them on every page view.
- Keep tuned pg-boss polling intervals so the worker does not create constant query traffic.
- Large files (screenshots, any future audio) stay in Cloudflare R2, never in the database.
- Add egress usage to the admin view with alerts at 70% and 90%; if near the limit, pause new free reports first.

**Current egress baseline (15 Oct to 15 Nov 2026 cycle):** 2.72 GB used of 5 GB by 13 Nov, about 75 to 135 MB a day, 100% Shared Pooler egress (database queries, not storage). This steady daily load points to background polling and frequent queries.

- **Before building AI:** use Supabase's query performance report to find the queries returning the most data, and raise pg-boss polling intervals for non-urgent queues.
- **For AI queues:** do not add a new polling worker per job type. Use one AI queue with job types inside it and a slower polling interval (for example, 10 to 30 seconds), since AI jobs are not time-critical.
- **Budget rule:** keep total projected monthly egress under 4 GB. If the AI feature pushes it past that, optimise existing queries first, or upgrade Supabase once revenue arrives.

**Egress optimisation plan (zero-investment priority, applies to existing MyKavo and the AI feature):**

1. **Measure first:** enable pg\_stat\_statements and list the top 20 queries by total rows and bytes returned. Fix the biggest first.
2. **pg-boss polling:** raise newJobCheckInterval for non-urgent queues (AI, email, retention: 30 to 60 seconds); keep scans faster but not under 5 seconds. Reduce the number of workers polling separately.
3. **Select only needed columns:** never use Prisma queries without `select`; avoid loading JSON blobs, HTML or long text in lists.
4. **Paginate everything:** cursor pagination with small page sizes on every list and dashboard.
5. **Cache hot reads:** use Next.js caching with tags for reports, plan limits and settings; revalidate only when data changes. Use an in-memory cache in the worker for plan and settings lookups.
6. **No polling from the browser where avoidable:** progress checks every 3 to 5 seconds only while a job runs and the tab is visible; stop on completion.
7. **Move heavy reads out of Postgres:** store finished reports and post bodies as compressed JSON in Cloudflare R2 (free egress) and keep only metadata in Postgres.
8. **Aggregate in SQL:** compute counts and summaries in the database instead of fetching rows and counting in code.
9. **Batch writes and reads:** combine many small queries into one; avoid N+1 queries with Prisma `include` limits or a single joined query.
10. **Compress large values:** store diffs and audit results compactly; trim unneeded fields before saving.
11. **Watch it:** weekly check of the Supabase egress chart; target under 60 MB a day before AI launch so AI has room.

Goal: cut current daily egress (75 to 135 MB) by at least half before the AI feature ships, keeping pages fast.

**Zero-investment safeguards (protect the $1,000 credits until revenue arrives):**

- Free cost target: about 25 to 35 cents per free user per month (a deep report costs about 20 to 40 cents, a post about 10 to 15 cents).
- Require email verification, and allow one free account per domain to stop abuse.
- Cache keyword reports per domain for 30 days and reuse autocomplete and competitor research across users.
- Set a global monthly spend cap for free users. When it is reached, queue free requests or show a waitlist message, while paid users are never blocked.
- Build an admin view of daily API spend, split into free and paid, with an email alert at 50%, 75% and 90% of the credits used.

## Competitor context

Frase starts around $15 a month for 4 articles; Surfer Standard is about $99 a month billed yearly; Jasper starts around $49 a month per seat. Surfer reports 150,000+ customers. MyKavo AI should undercut these while giving a clearer "what to write next" answer.

## Quality bar

- Vitest unit tests for every tool and the agent loop, with mocked Claude responses.
- An eval set of 30 to 50 real keywords with checks for title, meta, schema validity and on-topic content.
- Follow existing MyKavo conventions, folder structure and UI components. Read the codebase before writing new code.

## First task for Claude Code

**Step 0, mandatory before any code: read and impact check.**

1. Read every line of this spec. Summarise it back in your own words and list any part that is unclear or contradictory, then wait for answers.
2. Explore the entire monorepo (web app, worker, Expo app, Chrome extension, shared packages, WordPress plugin, Prisma schema, pg-boss setup, plan-limit code, auth, billing webhooks, email, CI).
3. Write an impact report: for every feature in this spec, list the existing files, models, routes, jobs and tests it would touch, and the risk to current behaviour (scans, alerts, Site Audit, billing, emails, mobile app, extension, Supabase egress and storage).
4. Flag anything in the spec that conflicts with how the codebase actually works, and propose a fix.
5. Confirm the full existing test suite passes before starting, and keep it passing after every step.
6. Write no code and run no migrations until the impact report is approved.

**Impact check rules (read-only, no wasted effort):**

- Read-only during Step 0: no file edits, no installs, no migrations, no new code. Reading files and running the existing test suite only.
- Be efficient: search the codebase for the relevant modules instead of reading unrelated files.
- For every feature, give a clear verdict: **Safe** (no effect on the existing project), **Needs change** (works after a small change, name it), or **Risky** (could break something, name what and why).
- End with a one-line overall answer: "Safe to build" or "Not safe yet", plus the exact list of fixes needed first.
- After approval, build in small phases. After each phase, run end-to-end checks: the full Vitest suite, the Playwright tests, a scan and alert run, a billing webhook test, and a Supabase egress check, and confirm existing features still work.

Read this whole spec first; where sections conflict, the Loopholes and fixes section and later rounds win. Explore the monorepo, then propose a phased plan for the launch scope (setup, striking distance, deep analysis mode, report screen and post writer): Prisma models, API routes, worker jobs, agent tools and UI. Wait for approval before writing code.
