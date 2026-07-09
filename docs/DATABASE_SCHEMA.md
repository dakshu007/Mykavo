# Fluxen — Database Schema

PostgreSQL via Prisma. This is the target relational model (implemented from Phase 1 onward). Large arrays / detailed scan data may use JSONB or child tables depending on query needs. Screenshots and large artifacts live in object storage — only storage keys are persisted here.

## Entity Relationship Overview

```
User ──< WorkspaceMember >── Workspace ──── Subscription
                                │ │
                                │ └──< NotificationChannel / Notification
                                │
                                └──< Website ──< MonitoredPage ──< MonitoredElement
                                        │             │
                                        ├──< Scan ──< PageSnapshot ──< PageLink
                                        │                 │          └< PageScript
                                        │                 │
                                        ├──< Baseline ────┘ (points at PageSnapshot)
                                        └──< ChangeEvent (prev + current snapshot)
```

## Tables

### User
`id, name, email (unique), emailVerified, image, createdAt, updatedAt`
(Better Auth manages sessions/accounts in its own tables.)

### Workspace
`id, name, ownerId → User, createdAt, updatedAt`
Owns websites, subscription, usage, notification settings.

### WorkspaceMember
`id, workspaceId, userId, role, createdAt` — unique `(workspaceId, userId)`
`role: OWNER | ADMIN | MEMBER | VIEWER` (MVP exposes OWNER only).

### Subscription
`id, workspaceId (unique), stripeCustomerId, stripeSubscriptionId, stripePriceId, status, currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd, createdAt, updatedAt`

### ProcessedStripeEvent
`id, stripeEventId (unique), eventType, processedAt` — guarantees idempotent webhook processing.

### Website
`id, workspaceId, name, url, normalizedUrl, status, scanFrequency, timezone, lastScanAt, nextScanAt, createdAt, updatedAt`
`status: PENDING | DISCOVERING | BASELINING | ACTIVE | PAUSED | ERROR`
Indexes: `(workspaceId)`, `(status, nextScanAt)` for the scheduler sweep.

### MonitoredPage
`id, websiteId, url, normalizedUrl, name, enabled, createdAt, updatedAt` — unique `(websiteId, normalizedUrl)`.

### Scan
`id, websiteId, status, triggerType, startedAt, completedAt, pagesRequested, pagesScanned, pagesFailed, changesDetected, highestSeverity, errorCode, errorMessage, createdAt`
`triggerType: BASELINE | SCHEDULED | MANUAL` · `status: QUEUED | RUNNING | COMPLETED | PARTIAL | FAILED`
Index: `(websiteId, createdAt desc)`.

### PageSnapshot
`id, scanId, monitoredPageId, websiteId, url, finalUrl, httpStatus, responseTimeMs, htmlHash, domHash, textHash, screenshotStorageKey, screenshotHash, visualDifferencePercentage, title, metaDescription, canonicalUrl, robotsMeta, h1Values (jsonb), structuredDataHash, pageWeightBytes, requestCount, createdAt`
Indexes: `(monitoredPageId, createdAt desc)`, `(scanId)`.

### PageLink
`id, pageSnapshotId, url, normalizedUrl, linkType, statusCode, createdAt`
`linkType: INTERNAL | EXTERNAL`. External links are checked conditionally, not every scan.

### PageScript
`id, pageSnapshotId, src, domain, scriptHash, isThirdParty, createdAt`

### Baseline
`id, websiteId, monitoredPageId, pageSnapshotId, version, status, approvedByUserId, approvedAt, createdAt`
`status: ACTIVE | SUPERSEDED`. Invariant: **exactly one ACTIVE baseline per monitored page** (partial unique index on `(monitoredPageId) where status = 'ACTIVE'`).

### ChangeEvent
`id, websiteId, monitoredPageId, previousSnapshotId, currentSnapshotId, scanId, category, changeType, severity, title, description, previousValue, currentValue, metadata (jsonb), status, detectedAt, resolvedAt, approvedAt, createdAt, updatedAt`
`category: AVAILABILITY | VISUAL | SEO | CONTENT | LINKS | SCRIPT | PERFORMANCE | CONVERSION`
`severity: INFO | LOW | MEDIUM | HIGH | CRITICAL`
`status: NEW | REVIEWED | APPROVED | RESOLVED | IGNORED`
Indexes: `(websiteId, status, severity)`, `(scanId)`, `(detectedAt desc)`.

### MonitoredElement (Phase 9 — conversion monitoring)
`id, monitoredPageId, name, selector, expectedExistence, expectedVisibility, expectedText, expectedHref, importance, enabled, createdAt, updatedAt`
`importance: NORMAL | IMPORTANT | CRITICAL`
Per-page config: a business-critical element (CTA, form, button) to watch. Pro-only; capped at 20 per page. `expectedText`/`expectedHref` are optional "pins" — when set, the current value is compared against them instead of the baseline.

### MonitoredElementResult (Phase 9)
`id, pageSnapshotId, monitoredElementId (nullable, SetNull), name, selector, importance, expectedExistence, expectedVisibility, expectedText, expectedHref, exists, visible, text, href, createdAt`
The observed state of a monitored element on one snapshot — stored per snapshot like `PageLink`/`PageScript` so comparison is self-contained (the baseline snapshot carries the state to diff against). The comparison engine matches baseline vs current by `monitoredElementId` and raises CONVERSION change events (missing/hidden/text-changed/href-changed/appeared). The element's config is copied in so history survives config edits/deletes. Index: `(pageSnapshotId)`.

### WebsiteAddon (Phase 8.1 — self-serve capacity add-ons)
`id, workspaceId, dodoSubscriptionId (unique), dodoCustomerId, status, websitesGranted, currentPeriodEnd, cancelAtPeriodEnd, lastEventAt, createdAt, updatedAt`
Each active row grants `websitesGranted` (default 30) extra websites on top of the Pro base of 50, for $6/mo. A workspace can hold many (each its own Dodo subscription). Effective website limit = 50 + Σ(active add-ons). Same `lastEventAt` out-of-order guard as `Subscription`. `CheckoutIntent` gained a `kind` field (`pro | website_addon`) so the webhook routes each payment without trusting client metadata.

### NotificationChannel
`id, workspaceId, type, enabled, configuration (jsonb), createdAt, updatedAt`
`type: EMAIL` initially (`SLACK | WEBHOOK | DISCORD | MICROSOFT_TEAMS` later).

### Notification
`id, workspaceId, websiteId, scanId, channelType, recipient, status, sentAt, errorCode, errorMessage, createdAt`

### WaitlistEntry (Phase 0 → 1)
`id, email (unique), source, createdAt`
Phase 0 persists this behind a store interface (file-backed locally); Phase 1 moves it to this table unchanged.

## Retention & Growth Rules

- Snapshot/change history retention is plan-based (30d free / 90d starter / 1y pro).
- Cleanup jobs delete expired snapshots and their R2 objects together.
- Screenshot binaries are never stored in PostgreSQL.
