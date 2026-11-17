# Brand Video (beta)

A 30 or 60 second motion video made from the customer's own website design.

## How it works

1. **Brand kit (no AI).** The homepage scan reads the brand when the kit is missing or older than 30 days
   (`packages/scanner/src/brand.ts`, saved by `apps/worker/src/brand-kit.ts`): name, headline, button, section
   headings, numbers shown on the page, nav labels, area-weighted colors, fonts, a transparent logo crop, the
   first screen and a full-page image. About 0.6 s and ~120 KB per website. An edited kit is never overwritten
   by a scan; "Reset from website" does that on purpose.
2. **Scene plan.** One Sonnet call picks scenes from a fixed template library and writes the words
   (`packages/brand-video/src/script.ts`). Code then makes it safe (`normalizeStoryboard`): numbers must appear
   in the brand kit, scenes needing a missing screenshot are dropped, it always opens on the logo and closes on
   the call to action, durations fit the target. "Start from a template" builds a plan with no AI.
3. **One document, two uses.** `composeVideoHtml` turns plan + brand into one HTML page. The dashboard plays it
   live in a sandboxed iframe; the worker steps the same page frame by frame (Web Animations API, paused clock)
   and pipes JPEG frames into ffmpeg (`apps/worker/src/brand-video/render.ts`). The preview is the export.

## Plans (`packages/brand-video/src/limits.ts`)

| | Free | Starter | Pro | Agency |
|-|-|-|-|-|
| Exported videos | 1 (lifetime) | 2 / month | 5 / month | 20 / month |
| AI scripts | 3 (lifetime) | 10 | 25 | 80 |
| Watermark | Yes | No | No | No |
| Quality | 720p | 1080p | 1080p | 1080p |
| Formats | 16:9 | 16:9 | 16:9, 9:16, 1:1 | all |

A trial keeps the watermark (it is not a paid plan). A video's first export uses one "video"; re-exports of the
same video are free up to 5. Failed jobs refund automatically.

## Operations

- Rollout: All Usage, "Brand Video rollout" (admins, beta list, everyone). Separate from AI Keywords.
- AI budget: `AI_VIDEO_MONTHLY_BUDGET_USD` on the web app AND the worker. Default 0 = AI scripts off
  (templates and exports still work). The AI kill switch pauses scripts, not exports.
- Worker needs ffmpeg (installed in `infra/worker/Dockerfile`). Without it exports fail with a clear message.
- Queue `brand-video`, one job at a time, never retried. A 57 s 1080p export took 73 s on 4 x86 cores;
  expect 3 to 5 minutes on the 2-core ARM server.
- Storage: `ws/<workspace>/brand/<website>/...` and `ws/<workspace>/video/<website>/<video>/...`, deleted with
  the website. Videos play from short-lived signed R2 links (CSP `media-src` allows `*.r2.cloudflarestorage.com`).
- No audio yet: videos are silent, ready for music in the social app.
