import { CHROME_EXTENSION_PAGE_PATH } from "@/config/chrome-extension";

/**
 * Setup guide derivation for the Overview page. Pure: every step's state is
 * computed from live workspace data the page loads, nothing is stored.
 *
 * REQUIRED vs OPTIONAL
 * --------------------
 * Required steps are what it takes for MyKavo to actually catch a change and
 * tell someone: a website, an approved baseline to compare against, and
 * alerts that reach the right people. The WordPress plugin joins them only on
 * a site MyKavo has seen running WordPress, because there it adds the update
 * history that explains half of what changes. Everywhere else the Chrome
 * extension is offered instead, as optional, next to inviting a teammate.
 *
 * The card disappears once every required step is done. There is no dismiss
 * button: a finished guide removes itself, an unfinished one is the most
 * useful thing a new account can be shown.
 *
 * About "approve": the first baseline is created and approved by the system
 * when the baseline scan finishes (packages/database/src/baseline.ts), so the
 * step is done as soon as an ACTIVE baseline exists. Later approvals happen
 * from change review, which is not set-up.
 */

export interface SetupGuideInput {
  websites: number;
  /** The oldest website, which the baseline step links to. */
  firstWebsiteId: string | null;
  /** ACTIVE baselines in the workspace. */
  activeBaselines: number;
  /** A website is DISCOVERING or BASELINING right now. */
  baselineInProgress: boolean;
  /**
   * Notification channels someone has saved and left enabled: the EMAIL
   * channel once recipients have been confirmed, or Slack / Discord / Teams /
   * a webhook.
   */
  enabledAlertChannels: number;
  /** Where email alerts go until someone changes it: the owner's address. */
  defaultAlertEmail: string;
  /** Any monitored page was last seen running WordPress. */
  wordpressDetected: boolean;
  /** A WordPress plugin connection finished its handshake and is not revoked. */
  wordpressConnected: boolean;
  /** This user connected the Chrome extension. */
  extensionConnected: boolean;
  /** Workspace members, owner included. */
  members: number;
  pendingInvites: number;
}

export type SetupStepId =
  | "add-website"
  | "approve-baseline"
  | "set-up-alerts"
  | "install-wordpress-plugin"
  | "add-chrome-extension"
  | "invite-teammate";

export interface SetupStep {
  id: SetupStepId;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  done: boolean;
  optional: boolean;
}

export interface SetupGuide {
  /** Required steps first, then optional ones. */
  steps: SetupStep[];
  requiredDone: number;
  requiredCount: number;
  /** Every required step done: the guide should no longer render. */
  complete: boolean;
  /** The step to expand: the first undone required step, else the first undone optional one. */
  currentStepId: SetupStepId | null;
}

export function deriveSetupGuide(input: SetupGuideInput): SetupGuide {
  const baselineHref = input.firstWebsiteId
    ? `/dashboard/websites/${input.firstWebsiteId}`
    : "/dashboard/websites/new";

  const steps: SetupStep[] = [
    {
      id: "add-website",
      title: "Add a website",
      description:
        "Enter its address. MyKavo checks it is reachable and finds your pages so you can pick the ones that matter.",
      href: "/dashboard/websites/new",
      actionLabel: "Add website",
      done: input.websites > 0,
      optional: false,
    },
    {
      id: "approve-baseline",
      title: "Approve your first baseline",
      description:
        input.baselineInProgress && input.activeBaselines === 0
          ? "Your baseline scan is running. When it finishes, it becomes the approved state every later scan is compared against."
          : "The baseline scan records how your pages look today. Once approved, every later scan is compared against it.",
      href: baselineHref,
      actionLabel: input.baselineInProgress ? "View progress" : "Open website",
      done: input.activeBaselines > 0,
      optional: false,
    },
    {
      id: "set-up-alerts",
      title: "Set up alerts",
      description: `Alerts go to ${input.defaultAlertEmail} for now. Confirm who should get them and how severe a change must be, or add Slack, Discord or a webhook.`,
      href: "/dashboard/notifications",
      actionLabel: "Set up alerts",
      done: input.enabledAlertChannels > 0,
      optional: false,
    },
  ];

  if (input.wordpressDetected || input.wordpressConnected) {
    steps.push({
      id: "install-wordpress-plugin",
      title: "Install the WordPress plugin",
      description:
        "Your site runs WordPress. The free plugin reports plugin, theme and core updates, so you can see which update caused a change.",
      href: "/dashboard/wordpress",
      actionLabel: "Connect WordPress",
      done: input.wordpressConnected,
      optional: false,
    });
  } else {
    steps.push({
      id: "add-chrome-extension",
      title: "Add the Chrome extension",
      description: "Check any page you are looking at and start monitoring it in one click.",
      href: CHROME_EXTENSION_PAGE_PATH,
      actionLabel: "Get the extension",
      done: input.extensionConnected,
      optional: true,
    });
  }

  steps.push({
    id: "invite-teammate",
    title: "Invite a teammate",
    description: "Share the workspace so a change never waits on one person.",
    href: "/dashboard/settings",
    actionLabel: "Invite teammate",
    done: input.members > 1 || input.pendingInvites > 0,
    optional: true,
  });

  // Required first, keeping the order above within each half.
  const ordered = [...steps.filter((s) => !s.optional), ...steps.filter((s) => s.optional)];
  const required = ordered.filter((s) => !s.optional);
  const requiredDone = required.filter((s) => s.done).length;
  const current =
    required.find((s) => !s.done) ?? ordered.find((s) => s.optional && !s.done) ?? null;

  return {
    steps: ordered,
    requiredDone,
    requiredCount: required.length,
    complete: requiredDone === required.length,
    currentStepId: current?.id ?? null,
  };
}
