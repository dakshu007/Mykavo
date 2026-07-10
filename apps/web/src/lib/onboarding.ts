/**
 * Getting-started checklist derivation (spec §61: Activation Rate and Time to
 * First Value are the metrics that matter).
 *
 * Step state is derived LIVE from database counts — there is no persisted
 * checklist state. The only stored bit is the dismissal cookie, which is
 * handled entirely outside this module so derivation stays pure and testable.
 */

/** Cookie that hides the checklist for a workspace. Value = workspaceId. */
export const ONBOARDING_DISMISSED_COOKIE = "fluxen-onboarding-dismissed";

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

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  description: string;
  href: string;
  done: boolean;
  optional: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  /** Steps done, out of steps.length (optional step included). */
  doneCount: number;
  /** True once every required (non-optional) step is done — hides the card. */
  allRequiredDone: boolean;
}

/** Derives checklist step states from live counts. Pure — no I/O. */
export function deriveOnboarding(counts: OnboardingCounts): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      id: "add-website",
      title: "Add your first website",
      description: "Fluxen validates the URL and discovers your pages.",
      href: "/dashboard/websites/new",
      done: counts.websites > 0,
      optional: false,
    },
    {
      id: "select-pages",
      title: "Select pages to monitor",
      description: "Pick the pages that matter — homepage, pricing, checkout.",
      href: "/dashboard/websites",
      done: counts.monitoredPages > 0,
      optional: false,
    },
    {
      id: "run-baseline",
      title: "Run your baseline scan",
      description: "The first scan captures the approved state every future scan is compared against.",
      href: "/dashboard/websites",
      done: counts.completedScans > 0 || counts.activeBaselines > 0,
      optional: false,
    },
    {
      id: "add-alert-channel",
      title: "Get alerts beyond email",
      description: "Add Slack, Discord, or a webhook so changes reach your team.",
      href: "/dashboard/notifications",
      done: counts.extraChannels > 0,
      optional: false,
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

  return {
    steps,
    doneCount: steps.filter((s) => s.done).length,
    allRequiredDone: steps.every((s) => s.optional || s.done),
  };
}
