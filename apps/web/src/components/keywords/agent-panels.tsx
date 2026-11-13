"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenLine, Pencil, Sparkles, Wand2, X } from "lucide-react";
import { JobProgress, useAgentJob, type JobState } from "./use-agent-job";

const primary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60";
const secondary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink hover:bg-ink/5 disabled:opacity-60";
const field =
  "mt-1 block w-full rounded-xl border border-line bg-card px-3 py-2 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export interface ProfileView {
  businessType: string;
  services: string[];
  audience: string;
  country: string;
  language: string;
  confirmed: boolean;
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 rounded-xl bg-critical-soft px-3 py-2 text-[13px] text-critical-strong">
      {children}
    </p>
  );
}

/** Step 1: read the site and pre-fill the five fields, or fill them by hand. */
export function SetupPanel({
  websiteId,
  profile,
  job,
}: {
  websiteId: string;
  profile: ProfileView | null;
  job: JobState | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const setup = useAgentJob(job, (done) => {
    if (done.status === "failed") setError(done.error ?? "Setup didn't finish.");
    router.refresh();
  });

  if (setup.running && setup.job) {
    return <JobProgress job={setup.job} />;
  }

  if (!profile || (!profile.confirmed && !editing && !profile.businessType)) {
    return (
      <div>
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          MyKavo reads your homepage and key pages, then fills in what your business does, who it serves and where.
          You check it in about 30 seconds. No typing needed.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            onClick={async () => {
              setError(null);
              const err = await setup.start(websiteId, { kind: "setup" });
              if (err) setError(err);
            }}
          >
            <Sparkles className="size-3.5" aria-hidden /> Read my site
          </button>
          <button type="button" className={secondary} onClick={() => setEditing(true)}>
            Fill in by hand
          </button>
        </div>
        {error && <Alert>{error}</Alert>}
        {editing && (
          <ProfileForm
            websiteId={websiteId}
            initial={{ businessType: "", services: [], audience: "", country: "US", language: "en", confirmed: false }}
            onCancel={() => setEditing(false)}
          />
        )}
      </div>
    );
  }

  if (!profile.confirmed || editing) {
    return (
      <div>
        {!profile.confirmed && (
          <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
            Here&apos;s what MyKavo found. Check it, change anything that&apos;s off, then press <b>Looks good</b>.
          </p>
        )}
        {error && <Alert>{error}</Alert>}
        <ProfileForm websiteId={websiteId} initial={profile} onCancel={profile.confirmed ? () => setEditing(false) : undefined} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <dl className="grid flex-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-ink-faint">Business</dt>
          <dd className="font-medium text-ink">{profile.businessType}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Audience</dt>
          <dd className="font-medium text-ink">{profile.audience}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-ink-faint">Services</dt>
          <dd className="font-medium text-ink">{profile.services.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-ink-faint">Market and language</dt>
          <dd className="font-medium text-ink">
            {profile.country} · {profile.language}
          </dd>
        </div>
      </dl>
      <button type="button" className={secondary} onClick={() => setEditing(true)}>
        <Pencil className="size-3.5" aria-hidden /> Edit
      </button>
    </div>
  );
}

function ProfileForm({
  websiteId,
  initial,
  onCancel,
}: {
  websiteId: string;
  initial: ProfileView;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    businessType: initial.businessType,
    services: initial.services.join(", "),
    audience: initial.audience,
    country: initial.country,
    language: initial.language,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/keywords/${websiteId}/profile`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          services: values.services
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      onCancel?.();
      router.refresh();
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  return (
    <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-[13px] font-medium text-ink">
        What kind of business is it?
        <input className={field} value={values.businessType} onChange={set("businessType")} maxLength={80} required placeholder="Family dental clinic" />
      </label>
      <label className="text-[13px] font-medium text-ink">
        Who are your customers?
        <input className={field} value={values.audience} onChange={set("audience")} maxLength={160} required placeholder="Families in Leeds" />
      </label>
      <label className="text-[13px] font-medium text-ink sm:col-span-2">
        Main products or services <span className="font-normal text-ink-faint">(separate with commas)</span>
        <input className={field} value={values.services} onChange={set("services")} required placeholder="Invisalign, teeth whitening, check-ups" />
      </label>
      <label className="text-[13px] font-medium text-ink">
        Country <span className="font-normal text-ink-faint">(2 letters, e.g. US, GB, IN)</span>
        <input className={field} value={values.country} onChange={set("country")} maxLength={2} pattern="[A-Za-z]{2}" required />
      </label>
      <label className="text-[13px] font-medium text-ink">
        Language <span className="font-normal text-ink-faint">(2 letters, e.g. en, ta)</span>
        <input className={field} value={values.language} onChange={set("language")} maxLength={2} pattern="[A-Za-z]{2}" required />
      </label>
      {error && (
        <div className="sm:col-span-2">
          <Alert>{error}</Alert>
        </div>
      )}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" className={primary} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Check className="size-3.5" aria-hidden />}
          Looks good
        </button>
        {onCancel && (
          <button type="button" className={secondary} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** Step 2: run a deep analysis (one report from the monthly allowance). */
export function DeepPanel({
  websiteId,
  job,
  canRun,
  hasReport,
  reportsLeft,
  refillsOn,
}: {
  websiteId: string;
  job: JobState | null;
  canRun: boolean;
  hasReport: boolean;
  reportsLeft: number | null;
  refillsOn: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(job?.status === "failed" ? job.error : null);
  const deep = useAgentJob(job, (done) => {
    if (done.status === "failed") setError(done.error ?? "The analysis didn't finish.");
    router.refresh();
  });

  if (deep.running && deep.job) return <JobProgress job={deep.job} />;

  const none = reportsLeft === 0;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="max-w-xl text-sm leading-6 text-ink-secondary">
        {none
          ? `You've used this month's keyword ${hasReport ? "reports" : "report"}. More on ${refillsOn}.`
          : hasReport
            ? "Run a fresh analysis to find new opportunities. Uses one report from your monthly allowance."
            : "Finds the keywords worth writing about from your site, Google's suggestions and the current results. Takes about two minutes."}
        {reportsLeft !== null && !none && (
          <span className="text-ink-faint">
            {" "}
            {reportsLeft} left this month.
          </span>
        )}
      </p>
      <button
        type="button"
        className={primary}
        disabled={!canRun || none}
        onClick={async () => {
          setError(null);
          const err = await deep.start(websiteId, { kind: "deep" });
          if (err) setError(err);
        }}
      >
        <Wand2 className="size-3.5" aria-hidden /> {hasReport ? "Run new analysis" : "Find my keywords"}
      </button>
      {error && (
        <div className="w-full">
          <Alert>{error}</Alert>
        </div>
      )}
    </div>
  );
}

/** "Write this post": optional notes from the owner, then the draft opens. */
export function WriteButton({
  websiteId,
  keyword,
  runningJobId,
  postsLeft,
  disabled,
}: {
  websiteId: string;
  keyword: string;
  runningJobId?: string;
  postsLeft: number | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const write = useAgentJob(
    runningJobId ? { id: runningJobId, status: "running", step: "Writing your post", progress: 30, error: null } : null,
    (done) => {
      if (done.status === "done" && done.resultId) {
        router.push(`/dashboard/keywords/${websiteId}/posts/${done.resultId}`);
        return;
      }
      setError(done.error ?? "The post didn't finish.");
      router.refresh();
    },
  );

  if (write.running && write.job) {
    return (
      <div className="w-full min-w-[220px]">
        <JobProgress job={write.job} />
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        <button type="button" className={primary} disabled={disabled || postsLeft === 0} onClick={() => setOpen(true)}>
          <PenLine className="size-3.5" aria-hidden /> Write this post
        </button>
        {error && <Alert>{error}</Alert>}
      </div>
    );
  }

  return (
    <form
      className="w-full rounded-xl border border-line bg-surface p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const err = await write.start(websiteId, { kind: "write", keyword, notes });
        if (err) setError(err);
        else setOpen(false);
      }}
    >
      <label className="text-[13px] font-medium text-ink">
        Anything from your own experience to include? <span className="font-normal text-ink-faint">(optional)</span>
        <textarea
          className={`${field} min-h-[84px]`}
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="A tip you give customers, a common question, how you do it differently. This makes the post yours."
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" className={primary}>
          <PenLine className="size-3.5" aria-hidden /> Write it
        </button>
        <button type="button" className={secondary} onClick={() => setOpen(false)}>
          <X className="size-3.5" aria-hidden /> Cancel
        </button>
        {postsLeft !== null && <span className="text-[12px] text-ink-faint">Uses 1 of your {postsLeft} posts left this month.</span>}
      </div>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
