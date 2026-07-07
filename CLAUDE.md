# CLAUDE.md

# Fluxen

> Know what changed. Fix what matters.

## Master Product Specification, Architecture, Design, Security, and Build Instructions

---

# 1. Product Overview

Fluxen is a website change detection and regression monitoring SaaS platform.

Fluxen continuously monitors websites, creates approved baselines, detects meaningful changes, identifies regressions, stores historical scan data, and alerts users when something important changes or breaks.

The core product promise is:

> Know what changed. Fix what matters.

Fluxen helps agencies, developers, SEO teams, freelancers, website maintenance businesses, SaaS teams, and website owners answer one important question:

> Did something important change or break on any website I manage?

Fluxen creates a baseline snapshot of monitored website pages.

It then automatically re-scans those pages on a recurring schedule.

Every new scan is compared against the current approved baseline.

Fluxen detects meaningful:

- Availability changes.
- Visual changes.
- SEO changes.
- Content changes.
- Broken links.
- Script changes.
- Performance regressions.
- Conversion element failures.

Fluxen stores those changes as structured events, assigns severity levels, displays before-and-after comparisons, and alerts users when important changes require attention.

Fluxen is NOT:

- An Ahrefs alternative.
- A Semrush alternative.
- A Screaming Frog alternative.
- A keyword research platform.
- A backlink analysis platform.
- A full technical SEO crawler.
- A generic uptime monitoring service.
- A full observability platform.
- An AI-first SaaS.

Fluxen must remain focused.

The primary question Fluxen answers is:

> What changed on my website, and does it matter?

The initial target market is global.

The primary commercial market is the United States.

Primary customers:

- WordPress agencies.
- Web development agencies.
- Website maintenance agencies.
- SEO agencies.
- Shopify agencies.
- Webflow agencies.
- Freelance developers.
- Freelance designers.
- Small SaaS teams.
- Marketing teams.
- Website owners managing multiple websites.

The product must provide significant value without AI.

AI functionality may be introduced later for:

- Change explanations.
- Change prioritization.
- Scan summaries.
- Suggested fixes.
- Developer instructions.
- Executive reports.
- Natural-language website monitoring queries.

AI is not required for the MVP.

---

# 2. Brand Identity

Product Name:

Fluxen

Primary Tagline:

> Know what changed. Fix what matters.

Product Category:

> Website Change & Regression Monitoring SaaS

Short Product Description:

> Fluxen continuously monitors websites for important visual, SEO, technical, performance, script, link, and conversion changes — then alerts users before small problems become expensive problems.

Long Product Description:

> Fluxen is a website change detection and regression monitoring platform built for agencies, developers, SEO teams, and website owners managing important websites. Fluxen creates approved website baselines, automatically scans monitored pages, detects meaningful changes, shows clear before-and-after comparisons, and alerts users when important regressions require attention.

Brand Personality:

- Technical.
- Reliable.
- Intelligent.
- Modern.
- Fast.
- Focused.
- Professional.
- Developer-friendly.
- Trustworthy.
- Calm.
- Precise.

Fluxen should feel like a professional SaaS product.

Fluxen should not feel like:

- A generic startup template.
- An AI wrapper.
- A playful consumer application.
- A complicated enterprise platform.
- A cheap SEO tool.
- A website audit generator.

---

# 3. Product Vision

Fluxen should become the monitoring layer between website deployment and customer impact.

Website teams currently rely on multiple disconnected tools.

One tool monitors uptime.

Another tool crawls technical SEO issues.

Another tool monitors performance.

Another tool compares screenshots.

Another tool checks broken links.

Another tool monitors analytics scripts.

Fluxen should provide a focused monitoring experience around one core workflow:

Website

↓

Create Baseline

↓

Monitor Continuously

↓

Detect Important Changes

↓

Understand What Changed

↓

Fix What Matters

↓

Approve New Baseline

↓

Continue Monitoring

The product should prioritize clarity over feature quantity.

---

# 4. Core Product Principles

Every product and engineering decision must follow these principles.

## 4.1 Simple Onboarding

A new user should be able to:

1. Create an account.
2. Create a workspace automatically.
3. Enter a website URL.
4. Validate the website.
5. Discover pages.
6. Select monitored pages.
7. Run the first baseline scan.
8. Review baseline results.
9. Enable monitoring.

The user should reach their first useful result within minutes.

Avoid complicated configuration during onboarding.

Advanced settings should remain optional.

---

## 4.2 Deterministic Detection

The MVP must not depend on AI.

Changes must be detected using deterministic comparison methods.

Examples:

- Previous title vs current title.
- Previous meta description vs current meta description.
- Previous canonical URL vs current canonical URL.
- Previous HTTP status vs current HTTP status.
- Previous normalized DOM vs current normalized DOM.
- Previous screenshot vs current screenshot.
- Previous page weight vs current page weight.
- Previous scripts vs current scripts.
- Previous links vs current links.
- Previous monitored element state vs current state.

The product should produce consistent, reproducible, and explainable results.

---

## 4.3 Actionable Results

Do not overwhelm users with every tiny website mutation.

Every detected change should answer:

- What changed?
- Where did it change?
- When did it change?
- What was the previous state?
- What is the current state?
- How severe is the change?
- Why might the user care?
- What action can the user take?

---

## 4.4 Recurring Value

Fluxen is a monitoring SaaS.

The product should encourage users to:

- Add websites.
- Add important pages.
- Create approved baselines.
- Enable recurring monitoring.
- Receive alerts.
- Review changes.
- Approve expected changes.
- Investigate unexpected changes.
- Maintain website monitoring history.

Retention is more important than maximizing one-time scans.

---

## 4.5 Low False-Positive Rate

False positives are one of the biggest threats to Fluxen.

If users repeatedly receive meaningless alerts, they will stop trusting notifications.

Reducing false positives must be treated as a core product feature.

---

## 4.6 Infrastructure Cost Awareness

Website scanning is infrastructure-intensive.

Every feature must consider:

- Browser execution time.
- Worker concurrency.
- CPU usage.
- Memory usage.
- Screenshot storage.
- Network bandwidth.
- Database growth.
- Scan frequency.
- Notification volume.

Fluxen must maintain healthy margins.

---

# 5. Primary Product Positioning

Primary positioning:

> Website change and regression monitoring for agencies, developers, and website teams.

Agency positioning:

> Monitor every client website from one dashboard.

Developer positioning:

> Catch website regressions before users report them.

SEO positioning:

> Know when important SEO elements unexpectedly change.

Primary Value Proposition:

> Fluxen automatically monitors your websites and alerts you when important visual, SEO, technical, performance, script, link, or conversion elements change.

Do not market Fluxen as a replacement for Ahrefs, Semrush, Screaming Frog, or enterprise observability platforms.

---

# 6. Core Product Workflow

The complete product workflow is:

User Registration

↓

Workspace Creation

↓

Add Website

↓

Validate URL

↓

Discover Pages

↓

Select Monitored Pages

↓

Configure Monitoring

↓

Run Baseline Scan

↓

Create Approved Baseline

↓

Enable Recurring Monitoring

↓

Scheduled Scan

↓

Capture Current Website State

↓

Compare Against Approved Baseline

↓

Detect Meaningful Changes

↓

Calculate Severity

↓

Create Change Events

↓

Send Notifications

↓

User Reviews Changes

↓

User Fixes Problem

OR

↓

User Approves Expected Change

↓

Update Baseline

↓

Continue Monitoring

---

# 7. MVP Scope

The MVP must support the following complete workflow:

1. User registration.
2. User authentication.
3. Workspace creation.
4. Add website.
5. Validate website URL.
6. Protect scanning infrastructure from SSRF.
7. Discover website pages.
8. Allow page selection.
9. Run baseline scan.
10. Store baseline data.
11. Schedule recurring scans.
12. Run scans asynchronously.
13. Capture screenshots.
14. Extract website metadata.
15. Extract links.
16. Extract scripts.
17. Measure lightweight performance metrics.
18. Compare scans.
19. Detect meaningful changes.
20. Calculate severity.
21. Store change events.
22. Display changes.
23. Display before-and-after comparisons.
24. Send email notifications.
25. Allow users to review changes.
26. Allow users to approve expected changes.
27. Maintain scan history.
28. Maintain baseline history.
29. Enforce subscription limits.
30. Process subscriptions through Stripe.

Do not add unrelated functionality until this workflow is reliable.

---

# 8. Recommended Technology Stack

Claude Code must inspect the repository before implementing anything.

If the repository is empty, use the following stack.

## Frontend

- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Lucide Icons.
- React Hook Form.
- Zod.

Use Recharts only when charts provide genuine value.

## Backend

Use Next.js Route Handlers for application APIs.

Separate workers must handle:

- Website crawling.
- Page scanning.
- Screenshot capture.
- Comparison.
- Scheduled scans.
- Notification delivery.

## Database

PostgreSQL.

ORM:

Prisma.

## Authentication

Recommended:

Better Auth.

Alternative:

Clerk.

Do not implement custom authentication unless necessary.

## Payments

Stripe.

Use:

- Stripe Checkout.
- Stripe Customer Portal.
- Stripe Webhooks.
- Stripe Subscriptions.

## Background Jobs

Recommended:

Trigger.dev.

Alternative:

BullMQ + Redis.

Long-running website scans must never run inside normal HTTP request-response handlers.

## Browser Automation

Playwright.

Use Playwright for:

- JavaScript-rendered websites.
- Screenshot capture.
- DOM extraction.
- Resource collection.
- Script detection.
- Link extraction.
- Conversion element checks.

## Email

Resend.

React Email may be used for email templates.

## Object Storage

Recommended:

Cloudflare R2.

Alternative:

AWS S3.

Screenshots and large artifacts must remain outside PostgreSQL.

---

# 9. High-Level Architecture

Fluxen should initially use a modular monolith with separate worker processes.

Architecture:

Browser

↓

Next.js Web Application

↓

API Layer

↓

PostgreSQL

↓

Background Job System

↓

Scan Workers

↓

Playwright Browser Pool

↓

Website Scanner

↓

Normalized Page Snapshot

↓

Comparison Engine

↓

Change Events

↓

Severity Engine

↓

Notification Engine

↓

Email Alerts + Dashboard

Scanning must be asynchronous.

The frontend must never wait synchronously for a complete website scan.

---

# 10. Core Data Model

Create a clean relational database schema.

## User

Fields:

- id
- name
- email
- emailVerified
- image
- createdAt
- updatedAt

---

## Workspace

Fields:

- id
- name
- ownerId
- createdAt
- updatedAt

A workspace owns:

- Websites.
- Subscription.
- Usage.
- Notification settings.

The architecture should support teams later.

---

## WorkspaceMember

Fields:

- id
- workspaceId
- userId
- role
- createdAt

Roles:

- OWNER
- ADMIN
- MEMBER
- VIEWER

The MVP may expose only OWNER functionality.

---

## Subscription

Fields:

- id
- workspaceId
- stripeCustomerId
- stripeSubscriptionId
- stripePriceId
- status
- currentPeriodStart
- currentPeriodEnd
- cancelAtPeriodEnd
- createdAt
- updatedAt

---

## ProcessedStripeEvent

Fields:

- id
- stripeEventId
- eventType
- processedAt

Stripe webhook processing must be idempotent.

---

## Website

Fields:

- id
- workspaceId
- name
- url
- normalizedUrl
- status
- scanFrequency
- timezone
- lastScanAt
- nextScanAt
- createdAt
- updatedAt

Statuses:

- PENDING
- DISCOVERING
- BASELINING
- ACTIVE
- PAUSED
- ERROR

---

## MonitoredPage

Fields:

- id
- websiteId
- url
- normalizedUrl
- name
- enabled
- createdAt
- updatedAt

---

## Scan

Fields:

- id
- websiteId
- status
- triggerType
- startedAt
- completedAt
- pagesRequested
- pagesScanned
- pagesFailed
- changesDetected
- highestSeverity
- errorCode
- errorMessage
- createdAt

Trigger Types:

- BASELINE
- SCHEDULED
- MANUAL

Statuses:

- QUEUED
- RUNNING
- COMPLETED
- PARTIAL
- FAILED

---

## PageSnapshot

Fields:

- id
- scanId
- monitoredPageId
- websiteId
- url
- finalUrl
- httpStatus
- responseTimeMs
- htmlHash
- domHash
- textHash
- screenshotStorageKey
- screenshotHash
- visualDifferencePercentage
- title
- metaDescription
- canonicalUrl
- robotsMeta
- h1Values
- structuredDataHash
- pageWeightBytes
- requestCount
- createdAt

Large arrays and detailed scan data may use JSONB fields or separate relational tables depending on query requirements.

---

## PageLink

Fields:

- id
- pageSnapshotId
- url
- normalizedUrl
- linkType
- statusCode
- createdAt

Link Types:

- INTERNAL
- EXTERNAL

Avoid checking every external link during every scan.

---

## PageScript

Fields:

- id
- pageSnapshotId
- src
- domain
- scriptHash
- isThirdParty
- createdAt

---

## Baseline

Fields:

- id
- websiteId
- monitoredPageId
- pageSnapshotId
- version
- status
- approvedByUserId
- approvedAt
- createdAt

Statuses:

- ACTIVE
- SUPERSEDED

Every monitored page should have one active approved baseline.

---

## ChangeEvent

Fields:

- id
- websiteId
- monitoredPageId
- previousSnapshotId
- currentSnapshotId
- scanId
- category
- changeType
- severity
- title
- description
- previousValue
- currentValue
- metadata
- status
- detectedAt
- resolvedAt
- approvedAt
- createdAt
- updatedAt

Categories:

- AVAILABILITY
- VISUAL
- SEO
- CONTENT
- LINKS
- SCRIPT
- PERFORMANCE
- CONVERSION

Severity:

- INFO
- LOW
- MEDIUM
- HIGH
- CRITICAL

Status:

- NEW
- REVIEWED
- APPROVED
- RESOLVED
- IGNORED

---

## MonitoredElement

Fields:

- id
- monitoredPageId
- name
- selector
- expectedExistence
- expectedVisibility
- expectedText
- expectedHref
- importance
- enabled
- createdAt
- updatedAt

Importance:

- NORMAL
- IMPORTANT
- CRITICAL

---

## NotificationChannel

Fields:

- id
- workspaceId
- type
- enabled
- configuration
- createdAt
- updatedAt

Initial Type:

- EMAIL

Future Types:

- SLACK
- WEBHOOK
- DISCORD
- MICROSOFT_TEAMS

---

## Notification

Fields:

- id
- workspaceId
- websiteId
- scanId
- channelType
- recipient
- status
- sentAt
- errorCode
- errorMessage
- createdAt

---

# 11. Website URL Security

Security is critical because Fluxen fetches user-provided URLs.

The scanner must protect against SSRF.

Before requesting any URL:

1. Parse URL.
2. Allow only HTTP and HTTPS.
3. Reject URLs containing credentials.
4. Resolve DNS.
5. Block localhost.
6. Block loopback IP addresses.
7. Block private IP ranges.
8. Block link-local IP addresses.
9. Block reserved IP ranges.
10. Block cloud metadata endpoints.
11. Revalidate destinations after redirects.
12. Apply maximum redirect count.
13. Apply request timeout.
14. Apply maximum response size.
15. Apply per-workspace rate limits.
16. Apply global abuse limits.

Every discovered URL must independently pass validation.

Never trust URLs discovered from:

- HTML.
- Sitemaps.
- Redirects.
- JavaScript.
- User configuration.

---

# 12. URL Normalization

Create one centralized URL normalization module.

Rules:

- Lowercase hostname.
- Remove fragments.
- Normalize default ports.
- Resolve relative URLs.
- Normalize trailing slashes consistently.
- Deduplicate URLs.
- Configure query parameter handling.
- Remove known tracking parameters when appropriate.
- Prevent crawler traps.

Do not automatically replace monitored URLs with canonical URLs.

Canonical URLs are metadata.

---

# 13. Page Discovery

Discovery order:

1. Validate homepage.
2. Fetch robots.txt.
3. Discover sitemap declarations.
4. Fetch sitemap.xml.
5. Parse sitemap indexes.
6. Extract same-origin URLs.
7. Crawl homepage internal links.
8. Crawl limited internal pages if required.
9. Normalize URLs.
10. Deduplicate URLs.
11. Apply plan limits.
12. Display pages.

User actions:

- Select all pages.
- Select individual pages.
- Search pages.
- Exclude URL patterns.
- Add pages manually.

Do not implement unlimited crawling.

---

# 14. Baseline Scan

The first successful scan creates baselines.

For every monitored page:

1. Validate destination.
2. Navigate with Playwright.
3. Record HTTP response.
4. Wait for DOMContentLoaded.
5. Wait for stabilization.
6. Apply timeout.
7. Record final URL.
8. Extract normalized DOM.
9. Extract visible text.
10. Extract SEO metadata.
11. Extract headings.
12. Extract internal links.
13. Extract scripts.
14. Calculate page weight.
15. Calculate request count.
16. Check monitored elements.
17. Capture screenshot.
18. Calculate hashes.
19. Store snapshot.
20. Create active baseline.

The first scan must not create change events.

---

# 15. Scan Stabilization

Modern websites contain dynamic content.

Fluxen must reduce false positives.

Before snapshot capture:

- Wait for DOMContentLoaded.
- Wait for fonts when possible.
- Wait for a limited network quiet period.
- Apply configurable post-load delay.
- Disable CSS animations.
- Disable CSS transitions.
- Hide blinking cursors.
- Normalize timestamps when configured.
- Apply ignored selectors.
- Apply screenshot masks.
- Remove volatile DOM attributes.

Do not wait indefinitely for networkidle.

---

# 16. DOM Normalization

Raw HTML must not be directly compared.

Create a normalization pipeline.

Possible normalization steps:

- Remove HTML comments.
- Remove configured ignored elements.
- Remove volatile attributes.
- Sort attributes.
- Normalize whitespace.
- Normalize class ordering when safe.
- Remove framework hydration attributes.
- Remove nonce values.
- Remove CSP-generated values.
- Normalize configured timestamps.
- Normalize dynamically generated IDs where safely possible.

Generate:

- Raw HTML hash.
- Normalized DOM hash.
- Visible text hash.

---

# 17. Screenshot Capture

Capture full-page screenshots.

Requirements:

- Fixed viewport.
- Fixed device scale factor.
- Fixed browser version.
- Fixed locale.
- Consistent timezone.
- Disable animations.
- Wait for fonts.
- Apply screenshot masks.
- Maximum screenshot dimensions.
- Consistent screenshot format.

Store screenshots in object storage.

Never store screenshot binaries directly inside PostgreSQL.

---

# 18. Visual Comparison Engine

Compare current screenshot against approved baseline.

Generate:

- Difference percentage.
- Changed pixel count.
- Total compared pixels.
- Diff image.
- Changed regions where practical.

Default thresholds:

0%–1%:

Ignore.

1%–5%:

INFO or LOW.

5%–15%:

MEDIUM.

15%–30%:

HIGH.

30%+:

CRITICAL candidate.

Thresholds must be configurable.

Visual difference percentage alone must not determine final severity.

---

# 19. SEO Change Detection

Detect changes to:

- HTTP status.
- Final URL.
- Redirect behavior.
- Title.
- Meta description.
- Canonical URL.
- Robots meta.
- H1 count.
- H1 values.
- Structured data.
- Indexability signals.

Example severity rules:

Title changed:

MEDIUM.

Title removed:

HIGH.

Canonical changed:

HIGH.

Canonical removed:

HIGH.

Index → noindex:

CRITICAL.

200 → 404:

CRITICAL.

200 → 500:

CRITICAL.

New redirect:

MEDIUM.

Redirect destination changed:

HIGH.

Severity rules must remain centralized.

---

# 20. Link Monitoring

Extract internal links.

Compare:

- Added links.
- Removed links.
- Destination status changes.

Important events:

- Internal link becomes 404.
- Internal link becomes 500.
- Important navigation link disappears.
- Redirect chain appears.

Group similar changes.

Do not generate hundreds of individual notifications.

Example:

> 17 internal links became broken.

---

# 21. Script Monitoring

Extract external scripts.

Normalize script URLs.

Detect:

- Script added.
- Script removed.
- Script domain changed.

Support identification of common services:

- Google Analytics.
- Google Tag Manager.
- Meta Pixel.
- Stripe.
- Hotjar.
- Intercom.
- HubSpot.

High-value alerts:

- Analytics script disappeared.
- Tag Manager disappeared.
- Payment script disappeared.
- Unknown third-party script added.

Do not label every script change as critical.

---

# 22. Performance Regression Monitoring

Track lightweight performance indicators.

Metrics:

- Response time.
- Page weight.
- Request count.

Example thresholds:

Page weight increase >20%:

MEDIUM.

Page weight increase >50%:

HIGH.

Request count increase >25%:

MEDIUM.

Response time increase >50% across multiple scans:

HIGH candidate.

Do not market Fluxen as a replacement for dedicated performance monitoring platforms.

---

# 23. Conversion Element Monitoring

Allow users to define important website elements.

Examples:

- Signup button.
- Add to cart button.
- Checkout button.
- Contact form.
- Pricing CTA.
- Lead generation form.

Configuration:

- CSS selector.
- Friendly name.
- Expected existence.
- Expected visibility.
- Expected text.
- Expected href.
- Importance.

Detect:

- Element missing.
- Element hidden.
- Text changed.
- Link destination changed.

Example alert:

> Critical: "Start Free Trial" button is missing from /pricing.

Include this feature in the MVP if implementation complexity remains manageable.

---

# 24. Comparison Strategy

Every new snapshot must be compared against the current approved baseline.

Do not blindly compare only against the immediately previous scan.

Model:

Approved Baseline

↓

Current Scan

↓

Comparison

↓

Change Events

↓

User Reviews Changes

↓

Expected Change

↓

Approve New Baseline

OR

↓

Unexpected Change

↓

Fix Website

↓

Run Scan

↓

Issue Resolved

Users should be able to approve:

- Entire scan.
- Individual page.
- Individual changes when technically feasible.

Maintain baseline history.

---

# 25. False Positive Reduction

Prioritize:

- Ignored selectors.
- Screenshot masks.
- Query parameter configuration.
- Scan stabilization.
- Comparison thresholds.
- Consecutive scan confirmation.
- Grouped alerts.
- Baseline approval.
- Notification preferences.

Future features:

- Maintenance windows.
- Recurring expected changes.
- Dynamic content detection.
- Learned noise suppression.

---

# 26. Severity Engine

Create a centralized rules-based severity engine.

Inputs:

- Change type.
- Previous value.
- Current value.
- Percentage difference.
- Number of affected pages.
- Monitored element importance.
- Repeated occurrence.
- Website configuration.

Outputs:

- Severity.
- User-facing title.
- User-facing description.
- Notification eligibility.

Examples:

200 → 404:

CRITICAL.

200 → 500:

CRITICAL.

index → noindex:

CRITICAL.

Critical monitored element missing:

CRITICAL.

Canonical removed:

HIGH.

Analytics script removed:

HIGH.

Visual difference >20%:

HIGH candidate.

Title changed:

MEDIUM.

Meta description changed:

LOW or MEDIUM.

Small content change:

INFO.

Rules must be testable.

---

# 27. Notification Engine

Initial channel:

Email.

Immediate alerts:

- CRITICAL.
- HIGH.

Configurable alerts:

- MEDIUM.

Do not send one email for every change.

Group events by scan and website.

Example Subject:

> Critical changes detected on example.com

Email Content:

- Website.
- Scan time.
- Number of changes.
- Highest severity.
- Critical issues.
- High issues.
- Dashboard CTA.

Future channels:

- Slack.
- Discord.
- Microsoft Teams.
- Webhooks.

---

# 28. Dashboard Information Architecture

Main Navigation:

- Overview.
- Websites.
- Changes.
- Scan History.
- Notifications.
- Billing.
- Settings.

---

# 29. Overview Dashboard

Display:

- Websites monitored.
- Healthy websites.
- Websites requiring attention.
- Critical changes.
- High-severity changes.
- Scans completed.
- Recent changes.
- Upcoming scans.

The dashboard must immediately answer:

> Which website needs my attention?

Avoid decorative charts.

---

# 30. Websites Page

Display:

- Website name.
- Domain.
- Status.
- Health indicator.
- Last scan.
- Next scan.
- Pages monitored.
- Open changes.
- Highest active severity.

Actions:

- Open website.
- Run scan.
- Pause monitoring.
- Edit settings.
- Delete website.

---

# 31. Website Detail Page

Tabs:

- Overview.
- Changes.
- Pages.
- Scan History.
- Settings.

Overview:

- Website status.
- Last scan.
- Next scan.
- Active changes.
- Severity breakdown.
- Recent scan result.
- Recent important changes.

---

# 32. Changes Page

Filters:

- Website.
- Severity.
- Category.
- Status.
- Date range.

Display:

- Severity.
- Website.
- Page.
- Category.
- Change title.
- Detection time.
- Status.

---

# 33. Change Detail Page

This is one of the most important product screens.

Display:

- What changed.
- Severity.
- Category.
- Website.
- Page URL.
- Detection time.
- Previous value.
- Current value.
- Before screenshot.
- After screenshot.
- Diff image.
- Technical metadata.

Actions:

- Mark reviewed.
- Approve change.
- Ignore change.
- Open affected page.
- Update baseline.

Make comparison extremely easy.

---

# 34. Scan History

Display:

- Scan date.
- Trigger type.
- Status.
- Duration.
- Pages scanned.
- Pages failed.
- Changes detected.
- Highest severity.
- Error summary.

---

# 35. Scan Detail Page

Display:

- Scan summary.
- Pages requested.
- Pages completed.
- Pages failed.
- Total changes.
- Severity distribution.
- Per-page results.
- Errors.

Partial failures must not hide successful results.

---

# 36. Website Settings

General:

- Website name.
- Website URL.
- Timezone.

Monitoring:

- Scan frequency.
- Monitored pages.
- Ignored selectors.
- Screenshot masks.
- Performance thresholds.
- Monitored elements.

Notifications:

- Recipient emails.
- Severity preferences.

Danger Zone:

- Pause website.
- Delete website.

---

# 37. Pricing Strategy

Pricing configuration must remain centralized.

Never hardcode plan limits throughout application code.

## Free

$0/month.

Limits:

- 1 website.
- 5 monitored pages.
- Weekly scans.
- 30-day history.
- Email alerts.

Purpose:

SEO acquisition and activation.

---

## Starter

$12/month.

Limits:

- 5 websites.
- 50 monitored pages.
- Daily scans.
- 90-day history.
- Email alerts.
- Manual scans.

---

## Pro

$29/month.

Limits:

- 25 websites.
- 500 monitored pages.
- Daily scans.
- 1-year history.
- Advanced monitoring settings.
- Conversion element monitoring.
- Priority scanning.

---

## Agency

$79/month.

Limits:

- 100 websites.
- 2,500 monitored pages.
- Daily scans.
- Multi-user workspace.
- Client-ready reports.
- White-label reports later.
- Priority support.

Before production launch, validate infrastructure cost assumptions against these limits.

---

# 38. Stripe Integration

Use Stripe Checkout.

Required flows:

- New subscription.
- Upgrade.
- Downgrade.
- Cancel.
- Resume.
- Payment failure.
- Subscription renewal.
- Customer portal.

Required webhook events may include:

- checkout.session.completed.
- customer.subscription.created.
- customer.subscription.updated.
- customer.subscription.deleted.
- invoice.paid.
- invoice.payment_failed.

Webhook processing must be idempotent.

Store processed event IDs.

Never trust frontend subscription state.

---

# 39. Usage Enforcement

Enforce server-side:

- Website limits.
- Monitored page limits.
- Scan frequency.
- Manual scan limits.
- History retention.
- Feature access.
- Workspace membership permissions.

Frontend checks are only for UX.

---

# 40. Scheduler

Create a centralized scheduler.

Requirements:

- Identify websites due for scanning.
- Prevent duplicate scans.
- Use idempotency keys or database locking.
- Respect subscription status.
- Respect website status.
- Respect scan frequency.
- Update nextScanAt.
- Recover safely from failures.

Do not create one cron job per website.

---

# 41. Worker Architecture

Recommended job flow:

SCAN_WEBSITE

↓

Create Scan

↓

SCAN_PAGE Jobs

↓

Collect Results

↓

COMPARE_PAGE Jobs

↓

Create Change Events

↓

Calculate Scan Summary

↓

SEND_NOTIFICATIONS

Workers must:

- Scale horizontally.
- Support retries.
- Handle partial failures.
- Be idempotent where possible.
- Support graceful shutdown.

---

# 42. Browser Pool

Implement controlled Playwright browser concurrency.

Requirements:

- Maximum browsers per worker.
- Maximum pages per browser.
- Browser restart after configured usage.
- Per-page timeout.
- Graceful shutdown.
- Job cancellation.
- Memory monitoring where feasible.

Never allow unlimited browser concurrency.

---

# 43. Scan Limits

Protect infrastructure.

Apply:

- Maximum pages per website.
- Maximum page size.
- Maximum screenshot dimensions.
- Maximum redirects.
- Maximum scan duration.
- Maximum requests per page.
- Maximum concurrent scans.
- Maximum manual scans.
- Maximum discovered URLs.

Limits should vary by plan where appropriate.

---

# 44. Error Handling

Expected errors:

- DNS failure.
- Connection timeout.
- TLS error.
- Navigation timeout.
- robots.txt denial.
- HTTP 401.
- HTTP 403.
- HTTP 404.
- HTTP 429.
- HTTP 500 errors.
- Browser crash.
- Screenshot failure.
- Storage failure.
- Comparison failure.

Store structured error codes.

Display user-friendly messages.

Do not store only raw error messages.

---

# 45. Logging

Use structured logging.

Include:

- requestId.
- jobId.
- scanId.
- websiteId.
- workspaceId.
- monitoredPageId.

Never log:

- Passwords.
- Authentication tokens.
- Stripe secrets.
- Session cookies.
- Sensitive request headers.

---

# 46. Observability

Track:

- Scan success rate.
- Scan failure rate.
- Average scan duration.
- Page scan duration.
- Queue depth.
- Worker utilization.
- Browser crashes.
- Screenshot failures.
- Comparison failures.
- Email delivery failures.
- Stripe webhook failures.

Fluxen itself must be monitored.

---

# 47. Product Analytics

Track events:

- account_created.
- onboarding_started.
- website_added.
- discovery_completed.
- baseline_started.
- baseline_completed.
- monitoring_enabled.
- scan_completed.
- change_detected.
- change_reviewed.
- change_approved.
- baseline_updated.
- pricing_viewed.
- checkout_started.
- subscription_started.
- subscription_cancelled.

Do not collect unnecessary personal information.

---

# 48. SEO Acquisition Strategy

SEO is the primary acquisition channel.

Initial landing pages:

- Website Change Detector.
- Website Monitoring Tool.
- Website Change Monitoring.
- Website Regression Monitoring.
- Website Monitoring for Agencies.
- Website Monitoring for WordPress.
- Website Monitoring for Shopify.
- Website Monitoring for Webflow.
- SEO Change Monitoring.
- Visual Website Monitoring.
- Broken Link Monitoring.
- Meta Tag Monitoring.
- Canonical Tag Monitoring.
- robots.txt Monitoring.
- Sitemap Monitoring.
- Website Screenshot Comparison.
- Website Deployment Monitoring.
- Website Monitoring for Freelancers.

Do not generate thin programmatic SEO pages.

Every landing page must provide unique value.

---

# 49. Free SEO Tools

Free tools should act as acquisition channels.

## Website Change Detector

Compare two website states.

CTA:

> Monitor changes automatically with Fluxen.

---

## Website Screenshot Comparison

Compare two webpage screenshots.

CTA:

> Monitor visual changes automatically.

---

## Redirect Chain Checker

Analyze redirect chains.

CTA:

> Get alerted when redirects unexpectedly change.

---

## Meta Tag Checker

Analyze:

- Title.
- Description.
- Canonical.
- Robots meta.
- Headings.

CTA:

> Monitor important SEO tags automatically.

---

## Bulk URL Status Checker

Check URL status codes.

CTA:

> Automatically monitor these pages with Fluxen.

---

## Script Detector

Detect third-party scripts.

CTA:

> Get alerted when important scripts are added or removed.

---

# 50. Homepage Requirements

Homepage sections:

1. Navigation.
2. Hero.
3. Interactive URL input.
4. Product dashboard preview.
5. Trust indicators.
6. Core problem.
7. Change categories.
8. Before-and-after comparison.
9. Agency workflow.
10. How Fluxen works.
11. Use cases.
12. Free tools.
13. Pricing.
14. FAQ.
15. Final CTA.
16. Footer.

Primary Headline:

> Know What Changed.

Supporting Headline:

> Fix What Matters.

Hero Copy:

> Fluxen continuously monitors your websites for important visual, SEO, technical, performance, script, link, and conversion changes — then alerts you before small problems become expensive problems.

Primary CTA:

> Start Monitoring Free

Secondary CTA:

> See How Fluxen Works

---

# 51. Design Direction

Fluxen must feel:

- Professional.
- Technical.
- Trustworthy.
- Modern.
- Fast.
- Precise.
- Developer-friendly.
- Premium.

Avoid:

- Excessive gradients.
- Excessive glassmorphism.
- Giant rounded cards everywhere.
- Decorative charts.
- Generic AI SaaS aesthetics.
- Purple AI branding.
- Excessive animations.
- Cartoon illustrations.
- Fake testimonials.
- Fake customer logos.

Use:

- Strong typography.
- Clear hierarchy.
- Compact dashboard layouts.
- Meaningful status colors.
- Consistent spacing.
- Accessible contrast.
- High information density where appropriate.
- Clear before-and-after comparison interfaces.

Fluxen should feel like a serious professional developer tool.

---

# 52. Responsive Design

Marketing pages:

Fully responsive.

Dashboard priority:

1. Desktop.
2. Tablet.
3. Mobile.

Critical monitoring information must remain accessible on mobile.

Tables should use:

- Responsive layouts.
- Horizontal scrolling.
- Card transformation when appropriate.

---

# 53. Accessibility

Minimum requirements:

- Semantic HTML.
- Keyboard navigation.
- Visible focus states.
- Accessible forms.
- Proper labels.
- Sufficient contrast.
- ARIA attributes where necessary.
- Reduced-motion support.

Target WCAG 2.1 AA where practical.

---

# 54. Testing Strategy

## Unit Tests

Test:

- URL normalization.
- SSRF protection.
- Hash generation.
- DOM normalization.
- SEO comparison.
- Link comparison.
- Script comparison.
- Performance comparison.
- Severity calculation.
- Plan enforcement.
- Stripe webhook processing.
- Scheduler calculations.

## Integration Tests

Test:

- Website creation.
- Page discovery.
- Baseline workflow.
- Scan workflow.
- Snapshot storage.
- Comparison.
- Change creation.
- Notification generation.
- Subscription synchronization.

## End-to-End Tests

Test:

- Registration.
- Login.
- Add website.
- Select pages.
- Run baseline.
- View dashboard.
- Run comparison scan.
- Review change.
- Approve baseline.
- Subscribe.
- Open billing portal.

Use Playwright.

---

# 55. Development Environments

Support:

- Local.
- Test.
- Staging.
- Production.

Use environment variables.

Create `.env.example`.

Never commit secrets.

---

# 56. Repository Structure

Recommended structure:

apps/

    web/

    worker/

packages/

    database/

    scanner/

    comparison-engine/

    severity-engine/

    billing/

    email/

    shared/

    config/

infra/

docs/

Recommended tooling:

- pnpm workspaces.
- Turborepo.

Start as a modular monolith.

Do not create unnecessary microservices.

---

# 57. Implementation Phases

Claude Code must build Fluxen phase-by-phase.

Do not attempt to implement the entire SaaS at once.

## Phase 0 — Validation Assets

Implement:

- Fluxen marketing landing page.
- Pricing page.
- Product dashboard mock states.
- Analytics.
- Waitlist or registration.
- One free SEO acquisition tool.

Recommended first free tool:

Website Change Detector.

Goal:

Validate acquisition and interest before building expensive infrastructure.

Definition of Done:

- Production-quality landing page.
- Responsive design.
- SEO metadata.
- Analytics.
- Functional signup or waitlist.
- Free tool functional.
- Clear Fluxen branding.
- No fake social proof.

---

## Phase 1 — Foundation

Implement:

- Monorepo.
- Next.js.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- PostgreSQL.
- Prisma.
- Authentication.
- Workspace creation.
- Dashboard shell.
- Environment validation.
- Logging.
- Testing infrastructure.

Definition of Done:

User can register, sign in, own a workspace, and access authenticated dashboard.

---

## Phase 2 — Website Management

Implement:

- Add website.
- URL validation.
- SSRF protection.
- Website CRUD.
- Page discovery.
- Sitemap parsing.
- Internal link discovery.
- Page selection.
- Plan limits.

Definition of Done:

User can safely add a website and select monitored pages.

---

## Phase 3 — Scanning Engine

Implement:

- Background jobs.
- Workers.
- Playwright scanner.
- Browser pool.
- Scan stabilization.
- Metadata extraction.
- DOM normalization.
- Screenshot capture.
- Script extraction.
- Link extraction.
- Performance metrics.
- Monitored element checks.
- Snapshot storage.

Definition of Done:

Fluxen can asynchronously scan selected pages and persist reliable snapshots.

---

## Phase 4 — Baselines

Implement:

- Baseline scans.
- Baseline storage.
- Baseline versions.
- Baseline approval.
- Baseline history.

Definition of Done:

Every monitored page has a reliable approved baseline.

---

## Phase 5 — Comparison Engine

Implement:

- HTTP comparison.
- SEO comparison.
- DOM comparison.
- Text comparison.
- Link comparison.
- Script comparison.
- Performance comparison.
- Screenshot comparison.
- Monitored element comparison.
- Change grouping.
- Severity engine.

Definition of Done:

Fluxen detects meaningful changes between approved baselines and current scans.

---

## Phase 6 — Changes Interface

Implement:

- Changes list.
- Filters.
- Change detail.
- Before-and-after values.
- Before-and-after screenshots.
- Diff visualization.
- Review actions.
- Approval actions.
- Ignore actions.
- Baseline update flow.

Definition of Done:

Users can understand and manage detected changes.

---

## Phase 7 — Scheduling & Notifications

Implement:

- Central scheduler.
- Recurring scans.
- Retry handling.
- Email notifications.
- Notification preferences.
- Scan summaries.
- Failure alerts.

Definition of Done:

Fluxen automatically monitors websites without user action.

---

## Phase 8 — Stripe Billing

Implement:

- Pricing.
- Stripe products.
- Stripe prices.
- Checkout.
- Webhooks.
- Subscription synchronization.
- Customer portal.
- Plan enforcement.
- Upgrade.
- Downgrade.
- Cancellation.
- Payment failure handling.

Definition of Done:

Customers can pay for Fluxen and subscription limits are enforced.

---

## Phase 9 — Conversion Monitoring

Implement:

- Custom monitored elements.
- CSS selector validation.
- Existence checks.
- Visibility checks.
- Text checks.
- href checks.
- Importance configuration.

Definition of Done:

Users can monitor business-critical CTAs, buttons, and forms.

---

## Phase 10 — Production Hardening

Implement:

- Rate limiting.
- Scan quotas.
- Worker concurrency controls.
- Security audit.
- Error monitoring.
- Structured metrics.
- Database indexes.
- Query optimization.
- Storage lifecycle rules.
- Backup strategy.
- Retention cleanup jobs.
- Load testing.
- Abuse prevention.

Definition of Done:

Fluxen is reliable enough and safe enough for public paying customers.

---

## Phase 11 — SEO Growth Engine

Implement:

- Free tools.
- SEO landing-page architecture.
- Structured data.
- Sitemap generation.
- Internal linking.
- Content templates.
- Conversion tracking.
- Product-led CTAs.

Definition of Done:

Fluxen has a scalable organic acquisition system.

---

# 58. Claude Code Operating Instructions

Claude Code must follow these instructions.

## Before Coding

1. Read this entire CLAUDE.md.
2. Inspect the repository.
3. Inspect Git status.
4. Inspect package.json files.
5. Inspect environment configuration.
6. Inspect database schema.
7. Inspect existing components.
8. Inspect API routes.
9. Inspect tests.
10. Preserve working functionality.

---

## Before Every Phase

Claude Code must:

1. State the phase goal.
2. Inspect relevant files.
3. Produce an implementation plan.
4. Identify files to create.
5. Identify files to modify.
6. Identify database migrations.
7. Identify environment variables.
8. Identify security concerns.
9. Begin implementation.

Do not repeatedly ask for confirmation unless blocked by:

- Missing credentials.
- An irreversible action.
- A genuinely ambiguous requirement.

---

## During Implementation

Claude Code must:

- Write production-quality TypeScript.
- Avoid `any`.
- Avoid placeholder implementations.
- Avoid fake production data.
- Validate external input.
- Enforce authorization server-side.
- Enforce subscription limits server-side.
- Use transactions where necessary.
- Make jobs idempotent.
- Handle partial failures.
- Add structured errors.
- Add tests.
- Update documentation.
- Keep modules focused.
- Avoid premature abstractions.
- Avoid unnecessary dependencies.

---

## After Every Phase

Claude Code must:

1. Run lint.
2. Run type checking.
3. Run tests.
4. Run relevant integration tests.
5. Run production build.
6. Fix failures.
7. Review Git diff.
8. Summarize implementation.
9. List created files.
10. List modified files.
11. List migrations.
12. List environment variables.
13. List known limitations.
14. Recommend the next phase.

Never claim completion when tests or builds fail.

---

# 59. Security Rules

Never:

- Commit secrets.
- Expose Stripe secrets.
- Expose database credentials.
- Trust frontend authorization.
- Trust frontend subscription state.
- Fetch unvalidated URLs.
- Allow SSRF.
- Allow unlimited crawling.
- Allow unlimited browser concurrency.
- Render unsanitized scanned website HTML.
- Store unnecessary authentication cookies.
- Bypass robots.txt protections.
- Disable TLS verification.
- Log credentials.

Treat the scanning environment as untrusted.

---

# 60. Cost Control Rules

Infrastructure cost is a major business risk.

Optimize for:

- Limited page counts.
- Controlled scan frequency.
- Browser reuse.
- Screenshot compression.
- Object storage lifecycle rules.
- Historical retention policies.
- Scan deduplication.
- Controlled worker concurrency.
- Plan-based limits.
- Conditional link checking.

Track approximate cost per:

- Website scan.
- Page scan.
- Screenshot.
- Stored GB.
- Worker minute.
- Free workspace.
- Paying workspace.

Fluxen must not offer pricing that creates structurally negative margins.

---

# 61. MVP Success Metrics

Track:

Activation Rate.

Percentage of users completing a baseline.

Time to First Value.

Monitoring Activation Rate.

Percentage of users enabling recurring monitoring.

Meaningful Change Detection Rate.

Alert Engagement Rate.

Free-to-Paid Conversion Rate.

Monthly Churn.

Average Revenue Per Workspace.

Average Websites Per Workspace.

Average Pages Per Website.

Infrastructure Cost Per Workspace.

Gross Margin.

Critical Product Metric:

> Percentage of paying customers who receive at least one genuinely valuable Fluxen alert every month.

If customers do not receive valuable alerts, retention will suffer.

---

# 62. MVP Non-Goals

Do not initially build:

- Keyword tracking.
- Backlink analysis.
- Competitor research.
- Full technical SEO auditing.
- AI assistant.
- AI-generated reports.
- Mobile apps.
- Browser extensions.
- Synthetic transaction testing.
- Full Lighthouse monitoring.
- Multi-region scanning.
- Enterprise SSO.
- Public API.
- White-label dashboards.
- Hundreds of integrations.
- Unlimited crawling.

Keep Fluxen focused.

---

# 63. Final Product Goal

Fluxen should become the simplest way for agencies, developers, SEO teams, and website owners to answer:

> Did something important change or break on any website I manage?

Fluxen's initial competitive advantage should come from:

- Extremely simple onboarding.
- Useful deterministic monitoring.
- Low false-positive rates.
- Clear before-and-after comparisons.
- Conversion-element monitoring.
- Multi-website agency dashboard.
- Affordable transparent pricing.
- Strong landing-page SEO.
- Free tools that naturally convert users into paying customers.

The product must solve website change and regression monitoring extremely well before expanding into broader website intelligence or AI functionality.

---

# 64. Immediate First Task

Claude Code should now:

1. Read this entire CLAUDE.md.
2. Inspect the repository.
3. Determine whether the repository is empty or contains an existing application.
4. Create `docs/ARCHITECTURE.md`.
5. Create `docs/IMPLEMENTATION_PLAN.md`.
6. Create `docs/DATABASE_SCHEMA.md`.
7. Create `docs/SECURITY_MODEL.md`.
8. Create `docs/PHASE_0_VALIDATION.md`.
9. Create `docs/DESIGN_SYSTEM.md`.
10. Define the exact Phase 0 implementation plan.
11. Begin Phase 0 implementation.

For Phase 0:

Build the Fluxen landing page, pricing page, dashboard preview states, authentication entry flow, analytics foundation, and the first free acquisition tool.

Do not begin building expensive full-scale scanning infrastructure before completing Phase 0 validation assets.

Do not ask for confirmation unless blocked by missing credentials or an irreversible technical decision.

Build incrementally.

Keep Fluxen focused.

Prioritize reliability.

Prioritize low false-positive rates.

Prioritize recurring customer value.

Prioritize SEO acquisition.

Prioritize infrastructure cost control.

The goal is not to build the biggest website monitoring platform.

The goal is to build the simplest website change and regression monitoring SaaS that agencies, developers, SEO teams, and website owners are willing to pay for every month.

# End of CLAUDE.md