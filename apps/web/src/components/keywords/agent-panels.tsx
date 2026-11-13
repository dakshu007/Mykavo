"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, PenLine, Pencil, Sparkles, Wand2, X } from "lucide-react";
import type { UpgradeOffer } from "@/lib/keywords/agent-data";
import { cn } from "@/lib/utils";
import { JobProgress, useAgentJob, type JobState } from "./use-agent-job";
import { KavoRunner } from "./kavo-runner";

const primary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";
const hero =
  "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] border-ink bg-primary px-5 text-[13.5px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60";
const secondary =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60";
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

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Where a used-up allowance would leave a grey, disabled button: a way to get
 * more instead. Billing shows the plans; only owners can buy, and Billing
 * says so to everyone else.
 */
function UpgradeLink({
  upgrade,
  from,
  label,
  size = "default",
}: {
  upgrade: UpgradeOffer;
  from: string;
  label: string;
  size?: "default" | "compact";
}) {
  return (
    <Link
      href={`/dashboard/billing?from=${from}`}
      title={`${upgrade.plan}: ${plural(upgrade.reports, "keyword report")} and ${plural(upgrade.posts, "blog post")} a month`}
      className={
        size === "compact"
          ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-primary px-3 text-[12.5px] font-semibold text-[#16181d] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          : hero
      }
    >
      <Sparkles className={size === "compact" ? "size-3.5" : "size-4"} aria-hidden />
      {label}
      {size === "compact" ? null : <ArrowRight className="size-4" aria-hidden />}
    </Link>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-3 rounded-xl bg-critical-soft px-3 py-2 text-[13px] text-critical-strong">
      {children}
    </p>
  );
}

/** A button that shows a spinner and its busy label the moment it is pressed. */
function BusyButton({
  busy,
  busyLabel,
  icon,
  className,
  disabled,
  onClick,
  type = "button",
  children,
}: {
  busy: boolean;
  busyLabel: string;
  icon: React.ReactNode;
  className: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  children: React.ReactNode;
}) {
  return (
    <button type={type} className={className} disabled={busy || disabled} aria-busy={busy} onClick={onClick}>
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : icon}
      {busy ? busyLabel : children}
    </button>
  );
}

/** 01: read the site and pre-fill the five fields, or fill them by hand. */
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
  const [error, setError] = useState<string | null>(job?.status === "failed" && !profile ? job.error : null);
  const [editing, setEditing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const setup = useAgentJob(job, (done) => {
    if (done.status === "failed") setError(done.error ?? "Setup didn't finish.");
    startRefresh(() => router.refresh());
  });

  if ((setup.running && setup.job) || refreshing) {
    return setup.job ? <JobProgress job={refreshing ? { ...setup.job, step: "Loading your details", progress: 100 } : setup.job} /> : null;
  }

  if (!profile || (!profile.confirmed && !editing && !profile.businessType)) {
    return (
      <div>
        <p className="max-w-2xl text-sm leading-6 text-ink-secondary">
          MyKavo reads your homepage and key pages, then fills in what your business does, who it serves and where.
          You check it in about 30 seconds.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <BusyButton
            className={primary}
            busy={starting}
            busyLabel="Starting…"
            icon={<Sparkles className="size-3.5" aria-hidden />}
            onClick={async () => {
              setError(null);
              setStarting(true);
              const err = await setup.start(websiteId, { kind: "setup" });
              setStarting(false);
              if (err) setError(err);
            }}
          >
            Read my site
          </BusyButton>
          <button type="button" className={secondary} onClick={() => setEditing(true)} disabled={starting}>
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
            Here&apos;s what MyKavo found. Change anything that&apos;s off, then press <b>Looks good</b>.
          </p>
        )}
        {error && <Alert>{error}</Alert>}
        <ProfileForm websiteId={websiteId} initial={profile} onCancel={profile.confirmed ? () => setEditing(false) : undefined} />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <dl className="grid flex-1 gap-x-8 gap-y-3 text-[13px] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Business</dt>
          <dd className="mt-0.5 font-medium text-ink">{profile.businessType}</dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Audience</dt>
          <dd className="mt-0.5 font-medium text-ink">{profile.audience}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Services</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {profile.services.map((s) => (
              <span key={s} className="rounded-full border border-line px-2.5 py-0.5 text-[12px] text-ink">
                {s}
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">Market · language</dt>
          <dd className="mt-0.5 font-medium text-ink">
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
    services: initial.services.join("\n"),
    audience: initial.audience,
    country: initial.country,
    language: initial.language,
  });
  const [saving, setSaving] = useState(false);
  const [refreshing, startRefresh] = useTransition();
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
          // One per line: a service may itself contain commas.
          services: values.services
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }
      // Keep the spinner until the page has the saved details.
      startRefresh(() => {
        router.refresh();
        onCancel?.();
      });
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));
  const busy = saving || refreshing;

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
        Main products or services <span className="font-normal text-ink-faint">(one per line)</span>
        <textarea
          className={cn(field, "min-h-[104px] resize-y leading-6")}
          value={values.services}
          onChange={set("services")}
          required
          rows={4}
          placeholder={"Invisalign\nTeeth whitening\nCheck-ups"}
        />
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
        <BusyButton type="submit" className={primary} busy={busy} busyLabel="Saving…" icon={<Check className="size-3.5" aria-hidden />}>
          Looks good
        </BusyButton>
        {onCancel && (
          <button type="button" className={secondary} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/** 02: run a deep analysis (one report from the monthly allowance). */
export function DeepPanel({
  websiteId,
  job,
  canRun,
  hasReport,
  reportsLeft,
  reportsLimit = 1,
  refillsOn,
  upgrade = null,
}: {
  websiteId: string;
  job: JobState | null;
  canRun: boolean;
  hasReport: boolean;
  reportsLeft: number | null;
  reportsLimit?: number;
  refillsOn: string;
  /** The plan that runs more reports: shown in place of the button once they are used up. */
  upgrade?: UpgradeOffer | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(job?.status === "failed" ? job.error : null);
  const [starting, setStarting] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const deep = useAgentJob(job, (done) => {
    if (done.status === "failed") setError(done.error ?? "The analysis didn't finish.");
    startRefresh(() => router.refresh());
  });

  if ((deep.running && deep.job) || (refreshing && deep.job)) {
    return <JobProgress job={refreshing && deep.job ? { ...deep.job, step: "Loading your report", progress: 100 } : deep.job!} />;
  }

  const none = reportsLeft === 0;
  if (none && upgrade) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-[13.5px] font-semibold text-ink">You&apos;ve used this month&apos;s keyword {plural(reportsLimit, "report")}.</p>
          <p className="mt-0.5 text-[13px] leading-6 text-ink-secondary">
            {upgrade.plan} runs <strong className="font-semibold text-ink">{plural(upgrade.reports, "keyword report")}</strong> and
            writes <strong className="font-semibold text-ink">{plural(upgrade.posts, "blog post")}</strong> a month. Yours refill on{" "}
            {refillsOn}.
          </p>
        </div>
        <UpgradeLink upgrade={upgrade} from="keywords:report" label={`Upgrade to run more`} />
      </div>
    );
  }
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-[13px] leading-6 text-ink-secondary">
          {none
            ? `You've used this month's keyword reports. More on ${refillsOn}.`
            : hasReport
              ? "Run a fresh analysis to find new opportunities. It uses one report from your monthly allowance."
              : "Finds the keywords worth writing about from your site, Google's suggestions and today's results. Takes about two minutes."}
        </p>
        <BusyButton
          className={hero}
          busy={starting}
          busyLabel="Starting…"
          disabled={!canRun || none}
          icon={<Wand2 className="size-4" aria-hidden />}
          onClick={async () => {
            setError(null);
            setStarting(true);
            const err = await deep.start(websiteId, { kind: "deep" });
            setStarting(false);
            if (err) setError(err);
          }}
        >
          {hasReport ? "Run new analysis" : "Find my keywords"}
        </BusyButton>
      </div>
      {error && <Alert>{error}</Alert>}
    </div>
  );
}

/**
 * "Write this post": a small dialog for the owner's own notes, then the
 * draft is written in the background and opens when it is ready. While it
 * runs, the button's place shows a compact progress line.
 */
export function WriteButton({
  websiteId,
  keyword,
  runningJobId,
  postsLeft,
  disabled,
  size = "default",
  upgrade = null,
}: {
  websiteId: string;
  keyword: string;
  runningJobId?: string;
  postsLeft: number | null;
  disabled?: boolean;
  size?: "default" | "compact";
  /** The plan that writes more posts: shown in place of the button once they are used up. */
  upgrade?: UpgradeOffer | null;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [opening, setOpening] = useState(false);
  const write = useAgentJob(
    runningJobId ? { id: runningJobId, status: "running", step: "Writing your post", progress: 30, error: null } : null,
    (done) => {
      if (done.status === "done" && done.resultId) {
        setOpening(true);
        router.push(`/dashboard/keywords/${websiteId}/posts/${done.resultId}`);
        return;
      }
      setError(done.error ?? "The post didn't finish.");
      router.refresh();
    },
  );

  useEffect(() => {
    if (error) dialog.current?.close();
  }, [error]);

  if (opening) {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Opening your draft…
      </span>
    );
  }

  if (write.running && write.job) {
    return size === "compact" ? (
      <span role="status" aria-live="polite" className="inline-flex min-w-[150px] items-center gap-2 text-[12.5px] text-ink">
        <KavoRunner className="h-[22px] w-[18px] shrink-0" />
        <span className="truncate">{write.job.step ?? "Writing"}… {write.job.progress}%</span>
      </span>
    ) : (
      <div className="w-full">
        <JobProgress job={write.job} />
      </div>
    );
  }

  if (postsLeft === 0 && upgrade && !disabled) {
    return (
      <UpgradeLink
        upgrade={upgrade}
        from="keywords:post"
        size={size}
        label={size === "compact" ? "Upgrade to write" : "Upgrade to write more"}
      />
    );
  }

  return (
    <>
      <button
        type="button"
        className={
          size === "compact"
            ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-ink/80 px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-primary hover:text-primary-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
            : primary
        }
        disabled={disabled || postsLeft === 0}
        onClick={() => {
          setError(null);
          dialog.current?.showModal();
        }}
      >
        <PenLine className="size-3.5" aria-hidden /> Write this post
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-critical-strong">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby={`write-${keyword}`}
        className="m-auto w-[min(520px,calc(100vw-32px))] rounded-2xl border-[1.5px] border-ink bg-card p-0 text-ink shadow-[6px_6px_0_var(--color-primary)] backdrop:bg-ink/40"
        onClose={() => setStarting(false)}
      >
        <form
          method="dialog"
          className="p-5 sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setStarting(true);
            const err = await write.start(websiteId, { kind: "write", keyword, notes });
            setStarting(false);
            if (err) setError(err);
            else dialog.current?.close();
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">Write a post</p>
              <h3 id={`write-${keyword}`} className="mt-1 text-[17px] font-semibold leading-snug tracking-tight">
                {keyword}
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="inline-flex size-8 items-center justify-center rounded-full text-ink-secondary hover:bg-ink/5"
              onClick={() => dialog.current?.close()}
              disabled={starting}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <label className="mt-4 block text-[13px] font-medium">
            Anything from your own experience to include? <span className="font-normal text-ink-faint">(optional)</span>
            <textarea
              className={cn(field, "min-h-[96px]")}
              value={notes}
              maxLength={2000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="A tip you give customers, a common question, how you do it differently. This makes the post yours."
            />
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-ink-faint">
              {postsLeft === null ? "About a minute. You can leave this page." : `Uses 1 of your ${postsLeft} posts left this month.`}
            </span>
            <BusyButton type="submit" className={primary} busy={starting} busyLabel="Starting…" icon={<PenLine className="size-3.5" aria-hidden />}>
              Write it
            </BusyButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
