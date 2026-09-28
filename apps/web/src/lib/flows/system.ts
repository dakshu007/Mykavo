import { lifecycleSendDays, type AutomationKey, type AutomationSettings } from "@mykavo/email";
import type { FlowDefinition, FlowStep } from "@mykavo/shared";

/**
 * The built-in emails, drawn as flows. They do not run as flows - the
 * activation sweep's rules send them (lifecycle.ts, activation-email.ts) -
 * but the picture is the same decisions in the same order, with the send
 * days an admin set, so the canvas shows how the built-in journey behaves.
 */

export interface SystemFlow {
  id: "system-journey" | "system-baseline";
  name: string;
  triggerLabel: string;
  description: string;
  definition: FlowDefinition;
}

export function isSystemFlowId(id: string): id is SystemFlow["id"] {
  return id === "system-journey" || id === "system-baseline";
}

const email = (id: string, key: AutomationKey): FlowStep => ({ id, type: "email", email: { kind: "builtin", key } });
const wait = (id: string, days: number): FlowStep => ({ id, type: "wait", days: Math.max(1, days) });

export function systemFlows(settings: Record<AutomationKey, AutomationSettings>): SystemFlow[] {
  const d = lifecycleSendDays(settings);
  return [
    {
      id: "system-journey",
      name: "New account journey",
      triggerLabel: "Account created",
      description: "Welcome, a nudge to add a website, then the Day 3 / 6 / 10 series.",
      definition: {
        version: 1,
        exitOnPaid: true,
        steps: [
          email("welcome", "welcome"),
          wait("wait-1", 1),
          { id: "has-site-1", type: "decision", condition: "has_website", yes: [], no: [email("first-website", "first_website")] },
          wait("wait-3", d.day3 - 1),
          {
            id: "has-site-3",
            type: "decision",
            condition: "has_website",
            yes: [email("day3-stats", "day3_stats")],
            no: [email("day3-setup", "day3_setup")],
          },
          wait("wait-6", d.day6 - d.day3),
          {
            id: "has-site-6",
            type: "decision",
            condition: "has_website",
            yes: [{ id: "has-app", type: "decision", condition: "has_android_app", yes: [], no: [email("day6", "day6_android")] }],
            no: [],
          },
          wait("wait-10", d.day10 - d.day6),
          { id: "has-site-10", type: "decision", condition: "has_website", yes: [email("day10", "day10_offer")], no: [] },
        ],
      },
    },
    {
      id: "system-baseline",
      name: "Baseline ready",
      triggerLabel: "First baseline scan finished",
      description: "Once per website, when monitoring starts.",
      definition: { version: 1, exitOnPaid: false, steps: [email("baseline", "baseline_ready")] },
    },
  ];
}
