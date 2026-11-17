"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Download, Film, Plus, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import {
  SCENE_INFO,
  SCENE_TYPES,
  VIDEO_TONES,
  blankScene,
  composeVideoHtml,
  sceneTimeline,
  totalDuration,
  type Scene,
  type SceneType,
  type Storyboard,
  type VideoFormat,
} from "@mykavo/brand-video/pure";
import type { KitView, VideoView } from "@/lib/brand-video/data";
import { cn } from "@/lib/utils";
import { Alert, BusyButton, errorOf, field, ghost, hero, label, postJson, primary, ProgressBar, secondary } from "./ui";
import { isRunning, useVideoJob, type VideoJob } from "./use-video-job";
import { VideoPreview } from "./video-preview";

export interface ExportAllowance {
  formats: readonly VideoFormat[];
  quality: 720 | 1080;
  watermark: boolean;
  /** Videos left in the allowance (null = unlimited). */
  videosLeft: number | null;
  rendersPerVideo: number;
  rewritesPerVideo: number;
  scriptsLeft: number | null;
}

const FORMAT_LABEL: Record<VideoFormat, string> = { landscape: "Landscape 16:9", portrait: "Vertical 9:16", square: "Square 1:1" };

/** Which fields each scene type uses, in the order they appear. */
const FIELDS: Record<SceneType, { kicker?: boolean; title: string; text?: string; highlight?: boolean; button?: boolean; items?: { max: number; title: string; text?: string } }> = {
  logo: { title: "Brand name", text: "Tagline" },
  headline: { kicker: true, title: "Headline (up to 8 words)", text: "Supporting line", highlight: true },
  statement: { kicker: true, title: "Statement", text: "Supporting line", highlight: true },
  screen: { kicker: true, title: "Caption", text: "Supporting line", highlight: true },
  scroll: { title: "Caption" },
  features: { kicker: true, title: "Heading", highlight: true, items: { max: 3, title: "Card title", text: "One line" } },
  list: { kicker: true, title: "Heading", text: "Supporting line", highlight: true, items: { max: 4, title: "Benefit", text: "Detail (optional)" } },
  stats: { kicker: true, title: "Heading (optional)", highlight: true, items: { max: 3, title: "Number from your site", text: "Label" } },
  services: { kicker: true, title: "Heading", highlight: true, items: { max: 8, title: "Service" } },
  cta: { title: "Closing line", text: "Supporting line", highlight: true, button: true },
};

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function displayDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function VideoEditor({
  initial,
  kit,
  websiteUrl,
  allowance,
  canEdit,
}: {
  initial: VideoView;
  kit: KitView;
  websiteUrl: string;
  allowance: ExportAllowance;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [video, setVideo] = useState(initial);
  const [draft, setDraft] = useState<Storyboard | null>(initial.storyboard);
  const [title, setTitle] = useState(initial.title);
  const [dirty, setDirty] = useState(false);
  const [format, setFormat] = useState<VideoFormat>(
    allowance.formats.includes(initial.format as VideoFormat) ? (initial.format as VideoFormat) : "landscape",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [addType, setAddType] = useState<SceneType>("statement");
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [tone, setTone] = useState<(typeof VIDEO_TONES)[number]>("professional");
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState<"rewrite" | "export" | null>(null);

  const reload = async () => {
    const res = await fetch(`/api/brand-video/videos/${video.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { video: VideoView };
    setVideo(data.video);
    if (!dirty || !draft) {
      setDraft(data.video.storyboard);
      setTitle(data.video.title);
      setDirty(false);
    }
  };

  const script = useVideoJob(isRunning(initial.scriptJob) ? initial.scriptJob : null, (done) => {
    if (done.status === "failed") setError(done.error ?? "The AI couldn't write this video. Please try again.");
    setDirty(false);
    void (async () => {
      const res = await fetch(`/api/brand-video/videos/${video.id}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { video: VideoView };
      setVideo(data.video);
      setDraft(data.video.storyboard);
      setTitle(data.video.title);
    })();
  });
  const render = useVideoJob(isRunning(initial.render.job) ? initial.render.job : null, (done) => {
    if (done.status === "failed") setError(done.error ?? "The export didn't finish. Your allowance has been returned.");
    void reload();
    router.refresh();
  });

  const debounced = useDebounced(draft, 350);
  const brand = useMemo(
    () => ({
      name: kit.name,
      colors: kit.colors,
      headingFont: kit.headingFont,
      bodyFont: kit.bodyFont,
      logoBackground: kit.logoBackground,
      domain: displayDomain(websiteUrl),
    }),
    [kit, websiteUrl],
  );
  const html = useMemo(() => {
    if (!debounced || debounced.scenes.length === 0) return null;
    return composeVideoHtml(
      debounced,
      brand,
      {
        logo: kit.assets.logo,
        logoWidth: kit.logoWidth,
        logoHeight: kit.logoHeight,
        hero: kit.assets.hero,
        page: kit.assets.page,
        pageWidth: 1280,
        pageHeight: kit.pageHeight,
      },
      { format, watermark: allowance.watermark, mode: "preview" },
    );
  }, [debounced, brand, kit, format, allowance.watermark]);
  const timeline = useMemo(() => (debounced ? sceneTimeline(debounced) : []), [debounced]);
  const total = debounced ? totalDuration(debounced) : 0;

  const update = (fn: (sb: Storyboard) => Storyboard) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
    setNotice(null);
  };
  const updateScene = (i: number, patch: Partial<Scene>) =>
    update((sb) => ({ ...sb, scenes: sb.scenes.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const move = (i: number, dir: -1 | 1) =>
    update((sb) => {
      const scenes = [...sb.scenes];
      const j = i + dir;
      if (j < 0 || j >= scenes.length) return sb;
      [scenes[i], scenes[j]] = [scenes[j]!, scenes[i]!];
      return { ...sb, scenes };
    });

  const save = async (): Promise<boolean> => {
    if (!draft) return false;
    setSaving(true);
    setError(null);
    const { ok, data } = await postJson(`/api/brand-video/videos/${video.id}`, { title, storyboard: draft, format }, "PATCH");
    setSaving(false);
    if (!ok) {
      setError(errorOf(data));
      return false;
    }
    const v = data.video as VideoView;
    const before = draft.scenes.length;
    setVideo(v);
    setDraft(v.storyboard);
    setTitle(v.title);
    setDirty(false);
    const after = v.storyboard?.scenes.length ?? 0;
    setNotice(
      after !== before
        ? "Saved. Some scenes were adjusted: a video always opens on the logo and ends on the call to action, and numbers must come from your brand kit."
        : "Saved.",
    );
    return true;
  };

  const rewrite = async () => {
    if (dirty && !window.confirm("Rewriting replaces your unsaved edits. Continue?")) return;
    setStarting("rewrite");
    setError(null);
    const { ok, data } = await postJson(`/api/brand-video/videos/${video.id}/rewrite`, { tone, notes });
    setStarting(null);
    if (!ok || typeof data.jobId !== "string") return setError(errorOf(data));
    setRewriteOpen(false);
    script.setJob({ id: data.jobId, kind: "video-script", status: "queued", step: "Waiting to start", progress: 0, error: null });
  };

  const exportVideo = async () => {
    if (dirty && !(await save())) return;
    setStarting("export");
    setError(null);
    const { ok, data } = await postJson(`/api/brand-video/videos/${video.id}/export`, { format });
    setStarting(null);
    if (!ok || typeof data.jobId !== "string") return setError(errorOf(data));
    render.setJob({ id: data.jobId, kind: "video-render", status: "queued", step: "Waiting to start", progress: 0, error: null });
    setVideo((v) => ({ ...v, render: { ...v.render, status: "queued", progress: 0, error: null } }));
  };

  const remove = async () => {
    if (!window.confirm("Delete this video and its exported file? This can't be undone.")) return;
    const res = await fetch(`/api/brand-video/videos/${video.id}`, { method: "DELETE" });
    if (res.ok) router.push(`/dashboard/brand-video/${video.websiteId}`);
    else setError("Could not delete. Please try again.");
  };

  // Still writing the first version.
  if (!draft) {
    const job: VideoJob | null = script.job;
    return (
      <div className="max-w-xl space-y-4 rounded-2xl border border-line bg-card p-6">
        <h2 className="text-[16px] font-semibold text-ink">Writing your video</h2>
        {script.running && job ? (
          <ProgressBar value={job.progress} label={job.step ?? "Writing your scenes"} />
        ) : (
          <Alert>{error ?? video.scriptJob?.error ?? "This video has no scenes yet."}</Alert>
        )}
        <p className="text-[13px] text-ink-secondary">The AI reads your brand kit and website, then picks scenes and writes the words. Usually under a minute.</p>
      </div>
    );
  }

  const renderRunning = render.running || video.render.status === "queued" || video.render.status === "rendering";
  const renderJob = render.job;
  const stale = video.render.renderedVersion !== null && video.render.renderedVersion !== video.version;
  const rewritesLeft = Math.max(0, allowance.rewritesPerVideo - video.regenerationsUsed);
  const rendersLeft = Math.max(0, allowance.rendersPerVideo - video.rendersUsed);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-5 xl:sticky xl:top-6 xl:self-start">
        <div className="rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-full border border-line p-0.5" role="radiogroup" aria-label="Preview format">
              {(["landscape", "portrait", "square"] as const).map((f) => {
                const allowed = allowance.formats.includes(f);
                return (
                  <button
                    key={f}
                    type="button"
                    role="radio"
                    aria-checked={format === f}
                    onClick={() => setFormat(f)}
                    className={cn(
                      "h-7 rounded-full px-3 text-[12px] font-semibold transition-colors",
                      format === f ? "bg-ink text-white" : "text-ink-secondary hover:text-ink",
                    )}
                  >
                    {FORMAT_LABEL[f]}
                    {!allowed && <span className="ml-1 text-[10px] font-bold opacity-70">PRO</span>}
                  </button>
                );
              })}
            </div>
            {allowance.watermark && <span className="text-[11.5px] text-ink-faint">Free plan videos carry a small MyKavo mark</span>}
          </div>
          {html ? (
            <VideoPreview html={html} format={format} timeline={timeline} total={total} />
          ) : (
            <Alert>Add at least one scene to preview.</Alert>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-line bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <Film className="size-4 text-accent" aria-hidden /> Export
            </h2>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
              {allowance.quality}p · {rendersLeft} of {allowance.rendersPerVideo} exports left for this video
            </span>
          </div>
          {renderRunning ? (
            <ProgressBar
              value={renderJob?.progress ?? video.render.progress}
              label={renderJob?.step ?? (video.render.status === "queued" ? "Waiting for a free slot" : "Recording frames")}
            />
          ) : video.render.videoUrl ? (
            <div className="space-y-3">
              <video
                key={video.render.videoUrl}
                src={video.render.videoUrl}
                poster={video.render.posterUrl ?? undefined}
                controls
                playsInline
                className={cn(
                  "mx-auto block rounded-xl bg-black",
                  video.render.format === "portrait" ? "max-h-[60vh]" : "w-full",
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                {video.render.downloadUrl && (
                  <a href={video.render.downloadUrl} className={primary} download>
                    <Download className="size-4" aria-hidden /> Download MP4
                  </a>
                )}
                <span className="text-[12px] text-ink-faint">
                  {video.render.format ? FORMAT_LABEL[video.render.format as VideoFormat] : ""} · {video.render.width}x{video.render.height}
                  {video.render.bytes ? ` · ${(video.render.bytes / 1_048_576).toFixed(1)} MB` : ""}
                  {video.render.watermark ? " · with MyKavo mark" : ""}
                </span>
              </div>
              {stale && <Alert tone="info">You edited this video after exporting it. Export again to include the changes.</Alert>}
              {video.render.watermark && !allowance.watermark && (
                <Alert tone="info">Your plan now exports without the MyKavo mark. Export again to remove it.</Alert>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-ink-secondary">
              Exporting records the preview as an MP4 ({allowance.quality}p, 30 frames a second). It takes a few minutes; you can leave this page.
              {allowance.videosLeft !== null && ` ${allowance.videosLeft} ${allowance.videosLeft === 1 ? "video" : "videos"} left to export.`}
            </p>
          )}
          {video.render.status === "failed" && video.render.error && !renderRunning && <Alert>{video.render.error}</Alert>}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <BusyButton
                busy={starting === "export"}
                busyLabel="Starting"
                icon={<Film className="size-4" aria-hidden />}
                className={hero}
                disabled={renderRunning || script.running || rendersLeft === 0 || !allowance.formats.includes(format)}
                onClick={() => void exportVideo()}
              >
                {video.render.videoUrl ? "Export again" : "Export video"} · {FORMAT_LABEL[format]}
              </BusyButton>
              {!allowance.formats.includes(format) && (
                <Link href="/dashboard/billing" className="text-[12.5px] font-medium text-accent">
                  Vertical and square come with Pro
                </Link>
              )}
              {allowance.watermark && (
                <Link href="/dashboard/billing" className="text-[12.5px] font-medium text-accent">
                  Remove the mark with a paid plan
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="space-y-3 rounded-2xl border border-line bg-card p-4 sm:p-5">
          <label className={label}>
            Video name
            <input
              className={field}
              value={title}
              maxLength={80}
              disabled={!canEdit}
              onChange={(e) => {
                setTitle(e.target.value);
                setDirty(true);
              }}
            />
          </label>
          <p className="text-[12.5px] text-ink-secondary">
            {draft.scenes.length} scenes · {total.toFixed(1)} seconds (target {video.durationSec})
          </p>
          {script.running && script.job && <ProgressBar value={script.job.progress} label={script.job.step ?? "Rewriting your scenes"} />}
          {error && <Alert>{error}</Alert>}
          {notice && <Alert tone="info">{notice}</Alert>}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <BusyButton busy={saving} busyLabel="Saving" icon={<Save className="size-3.5" aria-hidden />} className={primary} disabled={!dirty || script.running} onClick={() => void save()}>
                {dirty ? "Save changes" : "Saved"}
              </BusyButton>
              <button type="button" className={secondary} disabled={script.running || rewritesLeft === 0} onClick={() => setRewriteOpen((o) => !o)}>
                <Wand2 className="size-3.5" aria-hidden /> Rewrite with AI
              </button>
              <button type="button" className={ghost} onClick={() => void remove()}>
                <Trash2 className="size-3.5" aria-hidden /> Delete
              </button>
            </div>
          )}
          {rewriteOpen && (
            <div className="space-y-3 rounded-xl border border-line p-3">
              <label className={label}>
                Tone
                <select className={field} value={tone} onChange={(e) => setTone(e.target.value as (typeof VIDEO_TONES)[number])}>
                  {VIDEO_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                What should change?
                <textarea className={field} rows={2} maxLength={400} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shorter lines, focus on payroll" />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <BusyButton busy={starting === "rewrite"} busyLabel="Starting" icon={<Sparkles className="size-3.5" aria-hidden />} className={primary} onClick={() => void rewrite()}>
                  Rewrite
                </BusyButton>
                <span className="text-[12px] text-ink-faint">
                  {rewritesLeft} {rewritesLeft === 1 ? "rewrite" : "rewrites"} left for this video
                  {allowance.scriptsLeft !== null ? ` · ${allowance.scriptsLeft} AI scripts left` : ""}
                </span>
              </div>
            </div>
          )}
        </div>

        <ol className="space-y-3">
          {draft.scenes.map((s, i) => (
            <SceneCard
              key={`${s.id}-${i}`}
              scene={s}
              index={i}
              count={draft.scenes.length}
              disabled={!canEdit || script.running}
              onChange={(patch) => updateScene(i, patch)}
              onMove={(dir) => move(i, dir)}
              onDelete={() => update((sb) => ({ ...sb, scenes: sb.scenes.filter((_, j) => j !== i) }))}
            />
          ))}
        </ol>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-line p-4">
            <select className={cn(field, "mt-0 w-auto")} value={addType} onChange={(e) => setAddType(e.target.value as SceneType)} aria-label="Scene to add">
              {SCENE_TYPES.filter((t) => t !== "logo" && t !== "cta").map((t) => (
                <option key={t} value={t}>
                  {SCENE_INFO[t].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={secondary}
              disabled={script.running}
              onClick={() =>
                update((sb) => {
                  const scenes = [...sb.scenes];
                  const at = scenes.findIndex((x) => x.type === "cta");
                  scenes.splice(at === -1 ? scenes.length : at, 0, { ...blankScene(addType), id: `n${Date.now().toString(36)}` });
                  return { ...sb, scenes };
                })
              }
            >
              <Plus className="size-3.5" aria-hidden /> Add scene
            </button>
            <span className="text-[12px] text-ink-faint">{SCENE_INFO[addType].hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneCard({
  scene,
  index,
  count,
  disabled,
  onChange,
  onMove,
  onDelete,
}: {
  scene: Scene;
  index: number;
  count: number;
  disabled: boolean;
  onChange: (patch: Partial<Scene>) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const f = FIELDS[scene.type];
  const info = SCENE_INFO[scene.type];
  const fixed = scene.type === "logo" || scene.type === "cta";
  const items = f.items;
  return (
    <li className="space-y-3 rounded-2xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{index + 1}</span>
        <span className="text-[13.5px] font-semibold text-ink">{info.label}</span>
        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-secondary">
          <input
            type="number"
            min={info.min}
            max={info.max}
            step={0.5}
            value={scene.duration}
            disabled={disabled}
            onChange={(e) => onChange({ duration: Number(e.target.value) })}
            className="w-16 rounded-lg border border-line bg-card px-2 py-1 text-right text-[12.5px] tabular-nums text-ink"
            aria-label={`Scene ${index + 1} seconds`}
          />
          sec
        </label>
        {!fixed && (
          <span className="flex">
            <button type="button" className={ghost} disabled={disabled || index <= 1} onClick={() => onMove(-1)} aria-label="Move up">
              <ArrowUp className="size-3.5" aria-hidden />
            </button>
            <button type="button" className={ghost} disabled={disabled || index >= count - 2} onClick={() => onMove(1)} aria-label="Move down">
              <ArrowDown className="size-3.5" aria-hidden />
            </button>
            <button type="button" className={ghost} disabled={disabled} onClick={onDelete} aria-label="Delete scene">
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </span>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {f.kicker && (
          <label className={label}>
            Label <span className="text-ink-faint">(optional)</span>
            <input className={field} value={scene.kicker} maxLength={40} disabled={disabled} onChange={(e) => onChange({ kicker: e.target.value })} />
          </label>
        )}
        <label className={cn(label, f.kicker ? "" : "sm:col-span-2")}>
          {f.title}
          <input className={field} value={scene.title} maxLength={110} disabled={disabled} onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        {f.text && (
          <label className={cn(label, "sm:col-span-2")}>
            {f.text} <span className="text-ink-faint">(optional)</span>
            <input className={field} value={scene.text} maxLength={200} disabled={disabled} onChange={(e) => onChange({ text: e.target.value })} />
          </label>
        )}
        {f.highlight && (
          <label className={label}>
            Emphasize <span className="text-ink-faint">(words from the title)</span>
            <input className={field} value={scene.highlight} maxLength={40} disabled={disabled} onChange={(e) => onChange({ highlight: e.target.value })} />
          </label>
        )}
        {f.button && (
          <label className={label}>
            Button
            <input className={field} value={scene.button} maxLength={30} disabled={disabled} onChange={(e) => onChange({ button: e.target.value })} />
          </label>
        )}
      </div>
      {items && (
        <div className="space-y-2">
          {scene.items.map((it, j) => (
            <div key={j} className={cn("grid gap-2", items.text ? "sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]")}>
              <input
                className={cn(field, "mt-0")}
                value={it.title}
                maxLength={60}
                placeholder={items.title}
                aria-label={`${items.title} ${j + 1}`}
                disabled={disabled}
                onChange={(e) => onChange({ items: scene.items.map((x, k) => (k === j ? { ...x, title: e.target.value } : x)) })}
              />
              {items.text && (
                <input
                  className={cn(field, "mt-0")}
                  value={it.text}
                  maxLength={120}
                  placeholder={items.text}
                  aria-label={`${items.text} ${j + 1}`}
                  disabled={disabled}
                  onChange={(e) => onChange({ items: scene.items.map((x, k) => (k === j ? { ...x, text: e.target.value } : x)) })}
                />
              )}
              <button type="button" className={ghost} disabled={disabled} onClick={() => onChange({ items: scene.items.filter((_, k) => k !== j) })} aria-label="Remove">
                <Trash2 className="size-3.5" aria-hidden />
              </button>
            </div>
          ))}
          {scene.items.length < items.max && (
            <button type="button" className={ghost} disabled={disabled} onClick={() => onChange({ items: [...scene.items, { title: "", text: "" }] })}>
              <Plus className="size-3.5" aria-hidden /> Add
            </button>
          )}
          {scene.type === "stats" && (
            <p className="text-[11.5px] text-ink-faint">Numbers must match ones in your brand kit exactly; others are left out of the video.</p>
          )}
        </div>
      )}
    </li>
  );
}
