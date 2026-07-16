# MyKavo — Design System

MyKavo must feel professional, technical, trustworthy, modern, fast, precise, developer-friendly, premium.

The visual direction is derived from the approved dashboard reference: **a soft neutral canvas holding crisp white cards with large radii, a small number of gradient accent tiles, pill-shaped controls, a persistent right rail, and strong friendly typography.** We adopt that layout language and calm mood, while keeping MyKavo's technical identity: meaningful status colors, high information density in tables/diffs, and restrained decoration (no purple-AI aesthetics, no fake social proof, no decorative charts).

## 1. Foundations

### Color Tokens (CSS variables, Tailwind v4 `@theme`)

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `#eceef4` | Outer page background (soft cool gray) |
| `--color-surface` | `#f6f7fb` | App/dashboard inner background |
| `--color-card` | `#ffffff` | Cards, rails, inputs |
| `--color-ink` | `#16181d` | Primary text |
| `--color-ink-secondary` | `#5c6270` | Secondary text |
| `--color-ink-faint` | `#9aa1b1` | Tertiary text, placeholders |
| `--color-line` | `#e4e7ee` | Hairline borders, dividers |
| `--color-primary` | `#3556f4` | Primary actions, links, focus (royal blue) |
| `--color-primary-soft` | `#e8ecfe` | Primary tints, selected pills |
| `--color-success` | `#16a34a` | Healthy, resolved |
| `--color-warning` | `#f59e0b` | Medium severity |
| `--color-orange` | `#f97316` | High severity, accent icons |
| `--color-critical` | `#e5484d` | Critical severity, failures |
| `--color-info` | `#6b7280` | Info severity |

**Severity scale (fixed):** CRITICAL `critical` red · HIGH `orange` · MEDIUM `warning` amber · LOW `primary` blue · INFO `info` gray. Healthy = `success` green. Severity color is always paired with a text label (never color alone — accessibility).

### Accent Gradients (reserved)

Only for a small number of hero stat tiles (dashboard summary, marketing preview), exactly like the reference's "Prioritized/Additional tasks" cards:

- `--gradient-coral`: `linear-gradient(135deg, #fde5d8 0%, #e9d5f2 45%, #fbc7b6 100%)` — attention/changes tile.
- `--gradient-mint`: `linear-gradient(135deg, #d8f4ee 0%, #bfeef2 50%, #8fd8ee 100%)` — healthy/monitoring tile.

Never used on buttons, text, tables, or more than ~2 tiles per screen.

### Typography

- **Sans:** Geist Sans — headings and UI. Large display numbers (stat tiles) at 600 weight, tight tracking.
- **Mono:** Geist Mono — URLs, hashes, HTTP statuses, diff values. Monospace signals "precise/technical" everywhere scanned data appears.
- Scale: display 56/64, h1 40/48, h2 30/38, h3 22/30, body 15/24, small 13/20, micro 11/16 (uppercase, tracked, for labels like the reference's section headers).

### Shape & Elevation

- Radii: cards `24px` (rounded-3xl), inner tiles `16px`, pills/buttons `9999px` (fully rounded, per reference), inputs `12px`.
- Shadows: cards `0 1px 2px rgb(22 24 29 / 4%), 0 8px 24px rgb(22 24 29 / 6%)` — soft, no hard borders on canvas; hairline `--color-line` borders inside white areas.
- Spacing: 4px base grid; card padding 24; section gaps 24; marketing section rhythm 96–128.

## 2. Components

- **Button:** pill-shaped. Primary = solid `--color-primary` white text; secondary = white with hairline border; ghost = text only. Sizes sm/md/lg.
- **Card:** white, rounded-3xl, soft shadow, 24px padding. Optional header row: title left, icon-pill or action right (reference pattern).
- **StatTile:** gradient or white tile, micro-label top-left, icon chip top-right (white translucent rounded square), display number bottom-left, caption under it.
- **Pill / Chip:** white pill with icon + value (reference's profile stat chips) — used for counts, filters, plan features.
- **SeverityBadge:** tinted pill (`bg` = 10% tint, colored dot + label) for CRITICAL/HIGH/MEDIUM/LOW/INFO.
- **StatusDot + label:** website health (green healthy / amber attention / red critical / gray paused).
- **RailListItem:** left column datetime (stacked, bold time), middle title + sub-line with icon, right arrow chip — reference's "My meetings" pattern; used for upcoming scans / recent alerts.
- **MeterRow:** label left, rounded progress bar, % value, small circular trend badge — reference's "Developed areas" pattern; used for category breakdowns.
- **Table:** compact, hairline row dividers, mono for URLs/statuses, sticky header on scroll; transforms to cards on mobile.
- **DiffView:** two-column before/after with red/green value highlighting; mono values; grouped by category.
- **Input / SearchPill:** search is a full pill with leading icon (reference); forms use 12px-radius inputs, visible focus ring (`2px` primary offset).

## 3. Layout Patterns

- **Dashboard:** `[main 1fr | right rail 360px]` on a `--color-surface` sheet with 24px gutters, the whole sheet floating on `--color-canvas` (reference composition). Header row: greeting + context left, search pill + avatar right. Rail collapses under main content below `lg`.
- **Marketing:** centered 1200px container; sections alternate white / `--color-surface`; dashboard preview embedded in a canvas-colored frame.

## 4. Motion & Accessibility

- Motion: 150–200ms ease-out on hover/focus/expand only. No scroll-jacking, no decorative animation. `prefers-reduced-motion` respected.
- WCAG 2.1 AA targets: 4.5:1 text contrast (secondary ink on white = 5.9:1), visible focus states everywhere, semantic HTML, labeled forms, keyboard navigable menus and tabs.

## 5. Anti-Patterns (hard rules)

No purple-AI branding · no glassmorphism · no gradient overuse (2 tiles max/screen) · no decorative charts · no cartoon illustrations · no fake logos/testimonials/metrics · no giant vague hero blobs · severity never conveyed by color alone.
