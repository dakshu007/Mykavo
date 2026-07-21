# MyKavo LinkedIn Launch Video - Production Brief for Claude

This file is a complete, self-contained instruction set for producing the MyKavo LinkedIn post video. A fresh Claude session should be able to read ONLY this file and deliver the finished video file. Follow it exactly; where it says "exact", do not improvise.

---

## 1. The deliverable

| Property | Value |
|---|---|
| Primary output | `mykavo-linkedin-4x5.mp4`, **1080 x 1350 (4:5)** - max feed height on mobile LinkedIn |
| Optional re-renders | `mykavo-linkedin-1x1.mp4` (1080 x 1080), `mykavo-linkedin-16x9.mp4` (1920 x 1080) |
| Duration | **36 seconds** (LinkedIn sweet spot 30-45s) |
| Frame rate | 30 fps |
| Codec / container | H.264 MP4, yuv420p, ~8-12 Mbps, well under LinkedIn's 200 MB cap |
| Audio | **None required.** LinkedIn autoplays MUTED - the video must work 100% silent. If music is added it must be optional garnish, never carry meaning |
| First frame | Must read as a poster: brand-colored, headline visible (LinkedIn uses it as the thumbnail) |
| Safe margins | Keep all text >= 80 px from every edge at 1080 wide |
| Text size floor | No on-screen text smaller than ~28 px at 1080 wide (mobile legibility) |

---

## 2. Brand lockup (exact)

- Product: **MyKavo** - website change detection and regression monitoring SaaS. Live at **https://mykavo.app**.
- Tagline (exact, two sentences): **"Know what changed. Fix what matters."**
- Logomark: the **page-spark** - a gold page panel with a five-ray spark. Source of truth: `apps/web/src/components/brand/logo.tsx` (single-currentColor SVG). If the repo is unavailable, redraw: rounded gold rectangle "page" with an ink spark of five rays bursting from its right edge.
- Voice: technical, calm, precise, confident. Zero hype words ("revolutionary", "game-changing" are banned).
- Audience: agencies, freelance developers, SEO teams, SaaS teams managing client websites.

### Hard rules (the owner enforces these - violations mean redo)

1. **No em-dashes anywhere.** Plain hyphens `-` only. Check every frame of copy.
2. **Gold always carries ink text** (`#151515` on `#FFD400`). Never white-on-gold.
3. **No fake social proof**: no invented customer logos, testimonials, star ratings, user counts, or made-up stats.
4. Gold is the ONLY accent color. No purple, no gradients, no glassmorphism, no neon glows.
5. Real product facts only (see copy bank, section 6). Do not invent features.

---

## 3. Design system (this IS the webpage theme - reproduce it exactly)

The video must look like the mykavo.app landing page in motion. Fixed palette, identical values:

| Token | Hex | Use |
|---|---|---|
| canvas | `#FBFAF3` | warm bright paper - default background |
| paper | `#F3F1E6` | deeper paper for alternate panels/bands |
| elevated | `#FFFFFF` | white cards on the paper canvas |
| ink | `#151515` | primary text, borders, dark drama bands |
| gold | `#FFD400` | THE accent - highlights, buttons, marquee band |
| goldSoft | `#FFF3B0` | pale gold tint for subtle fills |
| dim | `#6B6B60` | secondary text on light surfaces |
| boneSoft | `#E9EBDF` | primary text on ink bands |
| dimOnDark | `#9C9E93` | secondary text on ink bands |

### Typography

- **Display / headlines**: Poppins, weight 500 (medium), letter-spacing -0.02em. Hero-size lines ~90-110 px at 1080 wide, section headlines ~64-72 px.
- **Body / sublines**: DM Sans (the site's "Google Sans" fallback - Google Sans cannot be bundled), 30-36 px, `#6B6B60` on light.
- **Mono (eyebrows, chips, data)**: Geist Mono (or JetBrains Mono if Geist unavailable), semibold, uppercase, letter-spacing 0.2em, ~24-26 px, color `#6B6B60` on light / `#9C9E93` on ink.
- Eyebrow format is exact: `// like this //` - lowercase, double slashes both sides.

### Signature visual moves (use at least four of these)

1. **Crisp ink offset shadow**: cards/buttons get a hard non-blurred shadow, e.g. `6px 6px 0 #151515`; hero objects get the gold+ink double `7px 7px 0 #FFD400, 7px 7px 0 1px #151515`.
2. **Gold highlighter sweep**: a slightly rotated (-1deg) rounded gold rectangle sitting BEHIND a headline word, inset a few px past the word's edges. In motion: it wipes in left to right under the word (300-400 ms) after the text lands.
3. **Tilted gold marquee**: full-width gold band rotated -0.6deg, ink top/bottom hairline borders, mono uppercase items separated by small ink dots, scrolling linearly.
4. **Browser-frame product mock**: white rounded-2xl card with ink hairline border, top chrome bar with three dots and a mono URL pill (`mykavo.app/dashboard`).
5. **Island pill nav** (optional, for the opening frame): floating white rounded-full bar with hairline border containing the logo + wordmark.
6. **Mono chips**: rounded-full, hairline ink border, mono uppercase 22-24 px. Severity chips: CRITICAL and HIGH are ink-filled with boneSoft text; MEDIUM is gold-filled with ink text; INFO is white with dim text.
7. **Numbered workflow**: mono `01 / 02 / 03` step markers.

### Motion language

- Calm and precise, never bouncy. Standard ease: cubic-bezier(0.22, 1, 0.36, 1) ("easeOutQuint" feel), 350-500 ms per element.
- Elements enter with small translate (16-24 px) + fade. Cards may "pop" by landing 2 px past their offset shadow then settling.
- Marquee scrolls linearly (no easing). Never stop it mid-scene.
- One idea on screen at a time. Hold every text beat >= 1.6 s after it finishes animating.

---

## 4. Storyboard (36 s at 30 fps = 1080 frames)

Scene backgrounds alternate canvas -> paper -> canvas -> gold band -> canvas -> paper -> ink, exactly like the landing page's rhythm.

### S1 - HOOK (0.0 - 4.0 s) - background `#FBFAF3`
- Frame 0 (poster frame): eyebrow `// 2:47 am //` already visible top-center, headline centered mid-frame.
- Headline (Poppins, two lines): `Your website changed` / `last night.` Gold highlighter sweeps in behind the word `changed` at ~0.8 s.
- At 2.4 s, subline fades in below (DM Sans, dim): `Did anyone notice?`

### S2 - THE DAMAGE (4.0 - 10.5 s) - background `#F3F1E6`
- Eyebrow: `// what slips through //`
- Four white cards (hairline border + `4px 4px 0 #151515` shadow, alternating tilt -1deg / +1deg) stagger in, 0.35 s apart, 2x2 grid:
  1. mono label `TITLE TAG` - text `Rewritten by a plugin update` - chip `MEDIUM` (gold)
  2. mono label `CHECKOUT BUTTON` - text `Missing after last night's deploy` - chip `CRITICAL` (ink)
  3. mono label `ANALYTICS SCRIPT` - text `Silently removed` - chip `HIGH` (ink)
  4. mono label `/PRICING` - text `200 -> 404` - chip `CRITICAL` (ink)
- Bottom line (DM Sans, dim): `Nobody tells you. Until a customer does.`

### S3 - THE PRODUCT (10.5 - 16.5 s) - background `#FBFAF3`
- Eyebrow: `// meet mykavo //` + page-spark logo beside the wordmark `MyKavo` (Poppins).
- Browser-frame mock slides up from +40 px. Inside, three rows animate in sequence with mono step numbers:
  - `01  BASELINE` - `Approve what your site should look like`
  - `02  SCAN` - `Every page, on schedule, automatically`
  - `03  COMPARE` - `Every change scored by severity`
- Keep the mock simple: rows on white, ink text, gold left-border on the active row.

### S4 - THE MARQUEE (16.5 - 21.5 s) - gold band on `#FBFAF3`
- Headline above the band (Poppins, ink): `Checked on every scan.`
- Tilted (-0.6deg) full-width gold marquee scrolling left, mono uppercase 26 px ink text, items separated by 6 px ink dots - use EXACTLY this list (it is the real one from the site):
  `HTTP STATUS · SCREENSHOTS · TITLE TAGS · META DESCRIPTIONS · CANONICALS · ROBOTS.TXT · NOINDEX FLIPS · H1 HEADINGS · BROKEN LINKS · REDIRECT CHAINS · ANALYTICS SCRIPTS · PAYMENT SCRIPTS · PAGE WEIGHT · RESPONSE TIME · SITEMAPS · SSL EXPIRY · UPTIME · CTAS & FORMS`
- Optional second band below scrolling the opposite direction at 60% opacity.

### S5 - BEFORE / AFTER (21.5 - 27.0 s) - background `#F3F1E6`
- Eyebrow: `// evidence, not guesswork //`
- A wide white card: left half tagged `BEFORE` (mono chip), right half tagged `AFTER`. Use abstract wireframe page thumbnails (ink lines on white; in the AFTER one, a block is missing and one line is gold-highlighted). A vertical gold slider bar wipes across once.
- A change-event card pops in over the corner (white, `6px 6px 0 #151515`): chip `HIGH` (ink) + title `Canonical URL removed` + two mono rows: `- was  https://example.com/pricing` / `+ now  (none)`.
- Headline below: `See exactly what changed.`

### S6 - ALERTS EVERYWHERE (27.0 - 31.5 s) - background `#FBFAF3`
- Headline: `One alert,` / `wherever you work.` - gold highlighter sweep behind `wherever you work.`
- Four mono chips pop in a row: `EMAIL` `SLACK` `DISCORD` `WEBHOOK`.
- Beside them a slim phone silhouette (ink outline, gold spark on screen) with caption (DM Sans, dim): `Web and Android, always in sync.`

### S7 - CTA (31.5 - 36.0 s) - full-bleed ink band `#151515`
- Two-line closer, centered: `Know what changed.` (boneSoft `#E9EBDF`) then `Fix what matters.` (gold `#FFD400`).
- Gold pill button pops (ink text, `3px 3px 0` boneSoft-tinted shadow or a 1 px boneSoft ring): `Start Monitoring Free`.
- Under it, mono dimOnDark: `mykavo.app` and below, small: `* No credit card required`.
- Page-spark logomark bottom-center, gold on ink. Hold the final composed frame for the last full second.

---

## 5. Implementation guidance

**Recommended: Remotion** (React + TypeScript, same stack as the repo).

```bash
npx create-video@latest mykavo-video --template blank   # or set up in a scratch dir
# fonts: @remotion/google-fonts/Poppins, @remotion/google-fonts/DMSans, @remotion/google-fonts/JetBrainsMono
# composition: 1080x1350, fps 30, durationInFrames 1080
npx remotion render MyKavoLinkedIn out/mykavo-linkedin-4x5.mp4 --codec h264
```

- Put the section-3 palette in one `theme.ts` constants file and use it everywhere - no inline hex duplicates.
- Build each storyboard scene as its own `<Sequence>`; drive the highlighter sweep with `interpolate(frame, ...)` on `scaleX` (transform-origin left).
- The marquee is a translateX loop on a doubled item strip inside `overflow: hidden` with `transform: rotate(-0.6deg)`.

**Fallback if Remotion is unavailable**: build the scenes as a single HTML page with CSS keyframe animations timed to the storyboard, drive it deterministically (one master animation timeline), capture with Playwright screencast or `ffmpeg` screen capture at 1080x1350@30, then transcode to H.264.

**If the MyKavo repo is on disk** (private repo `dakshu007/Mykavo`, local checkout usually `~/Desktop/Fluxen`), steal accuracy from:
- `apps/web/src/components/landing/style.ts` - palette + card/eyebrow class definitions
- `apps/web/src/components/brand/logo.tsx` - the page-spark SVG (copy the path data)
- `apps/web/src/components/landing/marquee.tsx` - the signals list
- `apps/web/src/components/landing/dashboard-mock.tsx`, `app-download.tsx` - mock styling reference

The repo is NOT required - this brief contains everything needed.

---

## 6. Copy bank (approved lines - use verbatim, do not paraphrase)

- `Know what changed. Fix what matters.`
- `MyKavo continuously monitors your websites for important visual, SEO, technical, performance, script, link, and conversion changes - then alerts you before small problems become expensive problems.`
- `Start Monitoring Free` / `Start free` (button labels)
- `* No credit card required`
- `Checked on every scan`
- `One alert, wherever you work.`
- `Web and Android, always in sync.`
- `Every client website, one dashboard.`
- Pricing facts if needed: Free plan ($0, 1 website) and Pro ($20/month, 8 websites, 15 pages each, daily scans, 5 seats). Do not invent other numbers.

## 7. Suggested LinkedIn caption (optional deliverable, plain text)

> Your website changed last night. Did anyone notice?
>
> I built MyKavo to answer one question for agencies and developers: did something important change or break on any website I manage?
>
> It baselines your pages, re-scans on a schedule, and alerts you when a title tag, checkout button, analytics script, canonical, or whole page quietly breaks - with before and after proof.
>
> Free plan, no credit card: https://mykavo.app

## 8. QA checklist before delivering the file

- [ ] Every hex value matches section 3 exactly (spot-check frames with a color picker)
- [ ] Zero em-dashes in any frame or the caption
- [ ] All gold surfaces carry ink text
- [ ] Frame 0 works as a poster/thumbnail
- [ ] Fully understandable with sound off
- [ ] No text within 80 px of an edge; nothing under ~28 px
- [ ] Marquee list matches section 4 S4 verbatim
- [ ] No invented stats, logos, or testimonials
- [ ] 36 s +/- 0.5 s, 30 fps, H.264 yuv420p, plays in QuickTime and Chrome
- [ ] File size comfortably under 200 MB
