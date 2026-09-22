/**
 * Getting-started checklist derivation (spec §61: Activation Rate and Time to
 * First Value are the metrics that matter).
 *
 * Step state is derived LIVE from database counts - there is no persisted
 * checklist state. The only stored bit is the dismissal cookie, which is
 * handled entirely outside this module so derivation stays pure and testable.
 *
 * THE REQUIRED STEPS ARE THE FIRST-RUN LOOP, AND NOTHING ELSE
 * ----------------------------------------------------------
 * Add a website, pick its pages, capture a baseline. At that point monitoring
 * is genuinely live and the card has done its job, so it goes away.
 *
 * "Get alerts beyond email" used to be REQUIRED, which meant a new account was
 * told it was not set up yet until it had wired up Slack, Discord or a
 * webhook - a third-party integration holding the product's own setup hostage.
 * It is optional now. Same for inviting a teammate. Both are real features and
 * both stay on the card, but demoted: a first run should present one path, not
 * a menu of equals.
 *
 * There is deliberately no "approve your baseline" step, tempting as it looks.
 * The first baseline is created and approved BY THE SYSTEM (see
 * packages/database/src/baseline.ts - approvedByUserId is null, approvedAt is
 * set), and a human only approves anything once a later scan finds a change.
 * A step nobody can complete on day one would leave the card up forever.
 * Approval is explained as what happens next instead.
 */

/** Cookie that hides the checklist for a workspace. Value = workspaceId. */
export const ONBOARDING_DISMISSED_COOKIE = "mykavo-onboarding-dismissed";

/** 90 days, in seconds. */
export const ONBOARDING_DISMISSED_MAX_AGE = 60 * 60 * 24 * 90;

/** Raw workspace counts the overview page already loads (or adds cheaply). */
export interface OnboardingCounts {
  /** Websites in the workspace. */
  websites: number;
  /** Monitored pages across all websites. */
  monitoredPages: number;
  /** Scans with status COMPLETED or PARTIAL. */
  completedScans: number;
  /** ACTIVE baselines (a finished baseline scan also counts as "scanned"). */
  activeBaselines: number;
  /** Non-email notification channels (SLACK / DISCORD / WEBHOOK). */
  extraChannels: number;
  /** Workspace members (owner included). */
  members: number;
  /** Pending (unaccepted, unexpired) workspace invites. */
  pendingInvites: number;
}

export type OnboardingStepId =
  | "add-website"
  | "select-pages"
  | "run-baseline"
  | "add-alert-channel"
  | "invite-teammate";

/** The first-run loop, in order. These and only these gate completion. */
export const LOOP_STEP_IDS: readonly OnboardingStepId[] = [
  "add-website",
  "select-pages",
  "run-baseline",
] as const;

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  done: boolean;
  optional: boolean;
}

export interface OnboardingState {
  /** Loop steps first, then the optional tail. */
  steps: OnboardingStep[];
  /** Steps done, out of steps.length (optional steps included). */
  doneCount: number;
  /** Loop steps done, out of requiredCount. What the card's progress means. */
  requiredDoneCount: number;
  /** How many steps are the loop. */
  requiredCount: number;
  /** True once the whole loop is done - monitoring is live, card can go. */
  allRequiredDone: boolean;
}

/** Derives checklist step states from live counts. Pure - no I/O. */
export function deriveOnboarding(counts: OnboardingCounts): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      id: "add-website",
      title: "Add your first website",
      description: "MyKavo validates the URL and discovers your pages.",
      href: "/dashboard/websites/new",
      done: counts.websites > 0,
      optional: false,
    },
    {
      id: "select-pages",
      title: "Select pages to monitor",
      description: "Pick the pages that matter - homepage, pricing, checkout.",
      href: "/dashboard/websites",
      done: counts.monitoredPages > 0,
      optional: false,
    },
    {
      id: "run-baseline",
      title: "Capture your baseline",
      description:
        "The first scan records the known-good state every future scan is compared against. Adding a website starts this for you.",
      href: "/dashboard/websites",
      done: counts.completedScans > 0 || counts.activeBaselines > 0,
      optional: false,
    },
    {
      id: "add-alert-channel",
      // NOT "get alerts beyond email": new workspaces are opt-in, so email
      // itself is off until somebody turns it on
      // (apps/web/src/lib/notification-settings.ts). Copy implying email
      // already works would leave a new account waiting for mail that was
      // never going to arrive.
      title: "Choose where alerts reach you",
      description:
        "Turn on email, or add Slack, Discord or a webhook - alerts are off until you pick one.",
      href: "/dashboard/notifications",
      done: counts.extraChannels > 0,
      // Optional on purpose. Requiring a third-party integration to finish
      // setup was the checklist telling people they were not set up when
      // monitoring was genuinely running.
      optional: true,
    },
    {
      id: "invite-teammate",
      title: "Invite a teammate",
      description: "Share the workspace so changes never wait on one person.",
      href: "/dashboard/settings",
      done: counts.members > 1 || counts.pendingInvites > 0,
      optional: true,
    },
  ];

  const required = steps.filter((s) => !s.optional);
  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    requiredDoneCount: required.filter((s) => s.done).length,
    requiredCount: required.length,
    allRequiredDone: required.every((s) => s.done),
  };
}
