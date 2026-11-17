"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUp, Pencil, Plus, RefreshCw, ScanSearch, Trash2, X } from "lucide-react";
import { SUGGESTED_FONTS, type BrandColors, type BrandKitEdit } from "@mykavo/brand-video/pure";
import type { KitView } from "@/lib/brand-video/data";
import { cn } from "@/lib/utils";
import { Alert, BusyButton, errorOf, field, ghost, label, postJson, primary, ProgressBar, secondary } from "./ui";
import { isRunning, useVideoJob, type VideoJob } from "./use-video-job";

const COLOR_LABELS: Array<{ key: keyof BrandColors; label: string; hint: string }> = [
  { key: "primary", label: "Primary", hint: "Buttons and emphasis" },
  { key: "accent", label: "Accent", hint: "Highlights" },
  { key: "background", label: "Background", hint: "Most scenes" },
  { key: "surface", label: "Surface", hint: "Cards and panels" },
  { key: "text", label: "Text", hint: "Words on the background" },
];

function editable(kit: KitView): BrandKitEdit {
  return {
    name: kit.name,
    headline: kit.headline,
    description: kit.description,
    ctaText: kit.ctaText,
    ctaUrl: kit.ctaUrl,
    valuePoints: kit.valuePoints,
    stats: kit.stats,
    services: kit.services,
    colors: kit.colors,
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
  };
}

export function BrandKitPanel({
  websiteId,
  initialKit,
  initialJob,
  canEdit,
}: {
  websiteId: string;
  initialKit: KitView | null;
  initialJob: VideoJob | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [kit, setKit] = useState<KitView | null>(initialKit);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const res = await fetch(`/api/brand-video/${websiteId}/kit`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { kit: KitView | null };
      setKit(data.kit);
    }
    router.refresh();
  };

  const { job, setJob, running } = useVideoJob(isRunning(initialJob) ? initialJob : null, (done) => {
    if (done.status === "failed") setError(done.error ?? "We couldn't read your brand. Please try again.");
    void reload();
  });

  const refresh = async (force: boolean) => {
    if (force && !window.confirm("Replace your edited words and colors with what the website shows now?")) return;
    setStarting(true);
    setError(null);
    const { ok, data } = await postJson(`/api/brand-video/${websiteId}/kit/refresh`, { force });
    setStarting(false);
    if (!ok || typeof data.jobId !== "string") return setError(errorOf(data));
    setJob({ id: data.jobId, kind: "brand", status: "queued", step: "Waiting to start", progress: 0, error: null });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    try {
      const res = await fetch(`/api/brand-video/${websiteId}/kit/logo`, { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) setError(errorOf(data));
      else setKit(data.kit as KitView);
    } catch {
      setError("Could not upload. Check your connection and try again.");
    }
    setUploading(false);
  };

  if (!kit) {
    return (
      <div className="space-y-4">
        <p className="max-w-2xl text-[13.5px] text-ink-secondary">
          MyKavo reads your brand from your homepage: your logo, colors, fonts, headline and the words your site already
          uses. It happens on the next scan, or right now.
        </p>
        {running && job ? (
          <ProgressBar value={job.progress} label={job.step ?? "Reading your homepage"} />
        ) : (
          canEdit && (
            <BusyButton busy={starting} busyLabel="Starting" icon={<ScanSearch className="size-4" aria-hidden />} className={primary} onClick={() => void refresh(false)}>
              Read my brand now
            </BusyButton>
          )
        )}
        {error && <Alert>{error}</Alert>}
      </div>
    );
  }

  if (editing) {
    return (
      <KitEditor
        websiteId={websiteId}
        kit={kit}
        onCancel={() => setEditing(false)}
        onSaved={(k) => {
          setKit(k);
          setEditing(false);
          router.refresh();
        }}
      />
    );
  }

  const logoBg = kit.logoBackground ?? "#ffffff";
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-4">
          <div className="flex min-h-24 items-center justify-center rounded-xl border border-line p-4" style={{ background: logoBg }}>
            {kit.assets.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={kit.assets.logo} alt={`${kit.name} logo`} className="max-h-16 max-w-full object-contain" />
            ) : (
              <span className="text-[22px] font-bold" style={{ color: kit.colors.text }}>
                {kit.name}
              </span>
            )}
          </div>
          <dl className="grid grid-cols-5 gap-2">
            {COLOR_LABELS.map((c) => (
              <div key={c.key} className="min-w-0">
                <dd className="h-10 rounded-lg border border-line" style={{ background: kit.colors[c.key] }} />
                <dt className="mt-1 truncate text-[11px] font-medium text-ink">{c.label}</dt>
                <dd className="truncate font-mono text-[10.5px] text-ink-faint">{kit.colors[c.key]}</dd>
              </div>
            ))}
          </dl>
          <p className="text-[12.5px] text-ink-secondary">
            Fonts: <strong className="font-semibold text-ink">{kit.headingFont ?? "Inter"}</strong> for headings,{" "}
            <strong className="font-semibold text-ink">{kit.bodyFont ?? kit.headingFont ?? "Inter"}</strong> for text.
          </p>
        </div>
        <div className="space-y-3 text-[13.5px]">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">Brand</p>
            <p className="text-[18px] font-semibold text-ink">{kit.name}</p>
            {kit.headline && <p className="text-ink-secondary">{kit.headline}</p>}
          </div>
          {kit.ctaText && (
            <p className="text-ink-secondary">
              Button: <span className="rounded-full bg-ink/5 px-2 py-0.5 font-medium text-ink">{kit.ctaText}</span>
            </p>
          )}
          {kit.valuePoints.length > 0 && (
            <p className="text-ink-secondary">
              <span className="font-medium text-ink">{kit.valuePoints.length} key points:</span>{" "}
              {kit.valuePoints.slice(0, 4).map((v) => v.title).join(" · ")}
            </p>
          )}
          {kit.stats.length > 0 && (
            <p className="text-ink-secondary">
              <span className="font-medium text-ink">Numbers from your site:</span>{" "}
              {kit.stats.map((s) => `${s.value} ${s.label}`).join(" · ")}
            </p>
          )}
          {kit.services.length > 0 && (
            <p className="text-ink-secondary">
              <span className="font-medium text-ink">Services:</span> {kit.services.join(" · ")}
            </p>
          )}
          <p className="text-[12px] text-ink-faint">
            Read from your homepage on {new Date(kit.capturedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {kit.editedAt ? " · edited by you, so scans keep your changes" : ""}.
          </p>
        </div>
      </div>
      {running && job && <ProgressBar value={job.progress} label={job.step ?? "Reading your homepage"} />}
      {error && <Alert>{error}</Alert>}
      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondary} onClick={() => setEditing(true)}>
            <Pencil className="size-3.5" aria-hidden /> Edit brand kit
          </button>
          <BusyButton busy={uploading} busyLabel="Uploading" icon={<ImageUp className="size-3.5" aria-hidden />} className={secondary} onClick={() => fileRef.current?.click()}>
            Upload logo
          </BusyButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <BusyButton busy={starting || running} busyLabel={running ? "Reading" : "Starting"} icon={<RefreshCw className="size-3.5" aria-hidden />} className={ghost} onClick={() => void refresh(false)}>
            Refresh screenshots
          </BusyButton>
          {kit.editedAt && (
            <button type="button" className={ghost} disabled={starting || running} onClick={() => void refresh(true)}>
              Reset from website
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function KitEditor({
  websiteId,
  kit,
  onCancel,
  onSaved,
}: {
  websiteId: string;
  kit: KitView;
  onCancel: () => void;
  onSaved: (kit: KitView) => void;
}) {
  const [draft, setDraft] = useState<BrandKitEdit>(() => editable(kit));
  const [services, setServices] = useState(kit.services.join(", "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof BrandKitEdit>(key: K, value: BrandKitEdit[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const nullable = (v: string) => (v.trim() ? v : null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const body: BrandKitEdit = {
      ...draft,
      services: services.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
      valuePoints: draft.valuePoints.filter((v) => v.title.trim()),
      stats: draft.stats.filter((s) => s.value.trim()),
    };
    const { ok, data } = await postJson(`/api/brand-video/${websiteId}/kit`, body, "PATCH");
    setBusy(false);
    if (!ok) return setError(errorOf(data));
    onSaved(data.kit as KitView);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <datalist id="mk-fonts">
        {SUGGESTED_FONTS.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Brand name
          <input className={field} value={draft.name} maxLength={60} required onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className={label}>
          Button text
          <input className={field} value={draft.ctaText ?? ""} maxLength={40} onChange={(e) => set("ctaText", nullable(e.target.value))} placeholder="Book a free call" />
        </label>
        <label className={cn(label, "sm:col-span-2")}>
          Headline
          <input className={field} value={draft.headline ?? ""} maxLength={160} onChange={(e) => set("headline", nullable(e.target.value))} />
        </label>
        <label className={cn(label, "sm:col-span-2")}>
          Description
          <textarea className={field} rows={2} value={draft.description ?? ""} maxLength={300} onChange={(e) => set("description", nullable(e.target.value))} />
        </label>
        <label className={cn(label, "sm:col-span-2")}>
          Button link
          <input className={field} type="url" value={draft.ctaUrl ?? ""} maxLength={500} onChange={(e) => set("ctaUrl", nullable(e.target.value))} placeholder="https://" />
        </label>
      </div>

      <fieldset>
        <legend className="text-[13px] font-semibold text-ink">Colors</legend>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COLOR_LABELS.map((c) => (
            <label key={c.key} className={label}>
              {c.label}
              <span className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-card px-2 py-1.5">
                <input
                  type="color"
                  value={draft.colors[c.key]}
                  onChange={(e) => set("colors", { ...draft.colors, [c.key]: e.target.value.toLowerCase() })}
                  className="size-7 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  aria-label={`${c.label} color`}
                />
                <input
                  value={draft.colors[c.key]}
                  onChange={(e) => set("colors", { ...draft.colors, [c.key]: e.target.value.trim().toLowerCase() })}
                  className="w-full min-w-0 bg-transparent font-mono text-[12.5px] text-ink focus:outline-none"
                  maxLength={7}
                  aria-label={`${c.label} hex`}
                />
              </span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">{c.hint}</span>
            </label>
          ))}
        </div>
        {kit.palette.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-ink-faint">Seen on your site:</span>
            {kit.palette.map((c) => (
              <button
                key={c}
                type="button"
                title={`Use ${c} as primary`}
                onClick={() => set("colors", { ...draft.colors, primary: c })}
                className="size-6 rounded-md border border-line"
                style={{ background: c }}
                aria-label={`Use ${c} as the primary color`}
              />
            ))}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Heading font
          <input className={field} list="mk-fonts" value={draft.headingFont ?? ""} maxLength={60} onChange={(e) => set("headingFont", nullable(e.target.value))} placeholder="Inter" />
        </label>
        <label className={label}>
          Text font
          <input className={field} list="mk-fonts" value={draft.bodyFont ?? ""} maxLength={60} onChange={(e) => set("bodyFont", nullable(e.target.value))} placeholder="Inter" />
        </label>
        <p className="text-[11.5px] text-ink-faint sm:col-span-2">Any Google Font works. A font Google doesn&apos;t have shows as Inter.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-semibold text-ink">Key points</legend>
        {draft.valuePoints.map((v, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
            <input className={cn(field, "mt-0")} value={v.title} maxLength={80} placeholder="Title" aria-label={`Point ${i + 1} title`} onChange={(e) => set("valuePoints", draft.valuePoints.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <input className={cn(field, "mt-0")} value={v.text} maxLength={160} placeholder="One line" aria-label={`Point ${i + 1} text`} onChange={(e) => set("valuePoints", draft.valuePoints.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
            <button type="button" className={ghost} onClick={() => set("valuePoints", draft.valuePoints.filter((_, j) => j !== i))} aria-label={`Remove point ${i + 1}`}>
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {draft.valuePoints.length < 8 && (
          <button type="button" className={ghost} onClick={() => set("valuePoints", [...draft.valuePoints, { title: "", text: "" }])}>
            <Plus className="size-3.5" aria-hidden /> Add a point
          </button>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-[13px] font-semibold text-ink">Numbers</legend>
        <p className="text-[11.5px] text-ink-faint">Only numbers that are true. Videos show these exactly as written here.</p>
        {draft.stats.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
            <input className={cn(field, "mt-0")} value={s.value} maxLength={16} placeholder="1,200+" aria-label={`Number ${i + 1}`} onChange={(e) => set("stats", draft.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
            <input className={cn(field, "mt-0")} value={s.label} maxLength={60} placeholder="happy customers" aria-label={`Number ${i + 1} label`} onChange={(e) => set("stats", draft.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
            <button type="button" className={ghost} onClick={() => set("stats", draft.stats.filter((_, j) => j !== i))} aria-label={`Remove number ${i + 1}`}>
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
        {draft.stats.length < 4 && (
          <button type="button" className={ghost} onClick={() => set("stats", [...draft.stats, { value: "", label: "" }])}>
            <Plus className="size-3.5" aria-hidden /> Add a number
          </button>
        )}
      </fieldset>

      <label className={label}>
        Services or products (comma separated)
        <input className={field} value={services} onChange={(e) => setServices(e.target.value)} placeholder="Bookkeeping, Payroll, Tax filing" />
      </label>

      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <BusyButton type="submit" busy={busy} busyLabel="Saving" className={primary}>
          Save brand kit
        </BusyButton>
        <button type="button" className={secondary} onClick={onCancel} disabled={busy}>
          <X className="size-3.5" aria-hidden /> Cancel
        </button>
      </div>
    </form>
  );
}
