import { describe, expect, it } from "vitest";
import {
  DB_ALERT_AFTER_MS,
  DB_ALERT_REPEAT_MS,
  formatOutageDuration,
  initialDbWatchState,
  isDatabaseUnreachable,
  nextDbWatchState,
  parseAlertRecipients,
  type DbWatchState,
} from "./db-watch";

const T0 = 1_000_000;
const min = (n: number) => n * 60_000;

/** Drive the watch through a sequence of probes, collecting what it decided. */
function run(probes: Array<{ at: number; reachable: boolean }>) {
  let state: DbWatchState = { ...initialDbWatchState };
  const actions: Array<{ at: number; action: ReturnType<typeof nextDbWatchState>["action"] }> = [];
  for (const probe of probes) {
    const decision = nextDbWatchState(state, probe.reachable, probe.at);
    state = decision.state;
    if (decision.action.kind !== "none") actions.push({ at: probe.at, action: decision.action });
  }
  return { state, actions };
}

describe("nextDbWatchState", () => {
  it("says nothing while the database is reachable", () => {
    const { actions } = run([
      { at: T0, reachable: true },
      { at: T0 + min(1), reachable: true },
      { at: T0 + min(2), reachable: true },
    ]);
    expect(actions).toEqual([]);
  });

  /**
   * A restart, a failover or a pooler hiccup recovers on its own. Alerting on
   * the first failed probe would train the reader to ignore the sender, which
   * defeats the point of having an alert at all.
   */
  it("stays quiet through a short blip and its recovery", () => {
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(1), reachable: false },
      { at: T0 + min(2), reachable: true },
    ]);
    expect(actions).toEqual([]);
  });

  it("alerts once the outage outlives the grace period", () => {
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(4), reachable: false },
      { at: T0 + min(6), reachable: false },
    ]);
    expect(actions).toHaveLength(1);
    expect(actions[0].at).toBe(T0 + min(6));
    expect(actions[0].action).toMatchObject({ kind: "down", repeat: false });
  });

  it("does not repeat the alert on every subsequent probe", () => {
    const probes = [{ at: T0, reachable: false }];
    for (let i = 1; i <= 30; i++) probes.push({ at: T0 + min(i), reachable: false });
    const { actions } = run(probes);
    expect(actions).toHaveLength(1);
  });

  /**
   * The counterpart: an outage that alerts once and then goes silent reads
   * exactly like one that recovered. After long enough, say so again.
   */
  it("repeats after the repeat window so a long outage does not go quiet", () => {
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(6), reachable: false },
      { at: T0 + min(6) + DB_ALERT_REPEAT_MS - 1000, reachable: false },
      { at: T0 + min(6) + DB_ALERT_REPEAT_MS, reachable: false },
    ]);
    expect(actions).toHaveLength(2);
    expect(actions[1].action).toMatchObject({ kind: "down", repeat: true });
  });

  it("reports recovery, with the duration, only if the outage was reported", () => {
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(6), reachable: false },
      { at: T0 + min(20), reachable: true },
    ]);
    expect(actions).toHaveLength(2);
    expect(actions[1].action).toEqual({ kind: "recovered", downForMs: min(20) });
  });

  it("does not announce recovery from an outage nobody was told about", () => {
    // Failed for under the grace period, so no "down" email went out.
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(2), reachable: true },
    ]);
    expect(actions).toEqual([]);
  });

  it("resets fully after recovery, so the next outage alerts again", () => {
    const { state } = run([
      { at: T0, reachable: false },
      { at: T0 + min(6), reachable: false },
      { at: T0 + min(10), reachable: true },
    ]);
    expect(state).toEqual(initialDbWatchState);

    const second = run([
      { at: T0 + min(20), reachable: false },
      { at: T0 + min(26), reachable: false },
    ]);
    expect(second.actions).toHaveLength(1);
  });

  it("measures the outage from the first failure, not the first alert", () => {
    const { actions } = run([
      { at: T0, reachable: false },
      { at: T0 + min(9), reachable: false },
    ]);
    expect(actions[0].action).toMatchObject({ downForMs: min(9) });
  });

  it("honours a custom grace period", () => {
    let state = { ...initialDbWatchState };
    let d = nextDbWatchState(state, false, T0, { alertAfterMs: min(1) });
    state = d.state;
    expect(d.action.kind).toBe("none");
    d = nextDbWatchState(state, false, T0 + min(1), { alertAfterMs: min(1) });
    expect(d.action.kind).toBe("down");
  });

  it("uses a five-minute default grace period", () => {
    expect(DB_ALERT_AFTER_MS).toBe(min(5));
  });
});

describe("isDatabaseUnreachable", () => {
  it("recognises Prisma's connectivity codes", () => {
    for (const code of ["P1000", "P1001", "P1002", "P1008", "P1017"]) {
      expect(isDatabaseUnreachable({ code })).toBe(true);
    }
  });

  /**
   * The exact shape seen in production: pg-boss stored this as the job output
   * when the worker could not authenticate after the password rotation.
   */
  it("recognises the real production failure", () => {
    expect(
      isDatabaseUnreachable({
        code: "P1001",
        name: "PrismaClientKnownRequestError",
        message:
          "Invalid `prisma.scan.findUnique()` invocation:\n\nCan't reach database server at `aws-0-us-east-1.pooler.supabase.com:5432`",
      }),
    ).toBe(true);
  });

  it("recognises raw driver failures with no Prisma code", () => {
    expect(isDatabaseUnreachable({ message: "connect ECONNREFUSED 10.0.0.1:5432" })).toBe(true);
    expect(isDatabaseUnreachable({ message: "Connection terminated unexpectedly" })).toBe(true);
  });

  /**
   * The guard that keeps this from becoming noise. A constraint violation or
   * a missing row is a bug or ordinary data - never an outage, never an
   * email. Treating every Prisma error as an outage is how an alert channel
   * becomes something people filter.
   */
  it("ignores ordinary query errors", () => {
    expect(isDatabaseUnreachable({ code: "P2002", message: "Unique constraint failed" })).toBe(
      false,
    );
    expect(isDatabaseUnreachable({ code: "P2025", message: "Record to update not found" })).toBe(
      false,
    );
    expect(isDatabaseUnreachable(new Error("Cannot read properties of undefined"))).toBe(false);
    expect(isDatabaseUnreachable(null)).toBe(false);
    expect(isDatabaseUnreachable(undefined)).toBe(false);
    expect(isDatabaseUnreachable("P1001")).toBe(false);
  });
});

describe("formatOutageDuration", () => {
  it("reads naturally at every scale", () => {
    expect(formatOutageDuration(30_000)).toBe("less than a minute");
    expect(formatOutageDuration(min(1))).toBe("1 minute");
    expect(formatOutageDuration(min(42))).toBe("42 minutes");
    expect(formatOutageDuration(min(60))).toBe("1 hour");
    expect(formatOutageDuration(min(125))).toBe("2 hours");
    expect(formatOutageDuration(min(60 * 24))).toBe("1 day");
    expect(formatOutageDuration(min(60 * 24 * 5))).toBe("5 days");
  });
});

describe("parseAlertRecipients", () => {
  it("parses a comma-separated list", () => {
    expect(parseAlertRecipients("a@x.com,b@y.com")).toEqual(["a@x.com", "b@y.com"]);
  });

  /**
   * Set by hand in a .env on a server. A stray comma or a trailing space must
   * not silence the one alert that survives a database outage.
   */
  it("survives sloppy hand-editing", () => {
    expect(parseAlertRecipients(" a@x.com , , b@y.com, ")).toEqual(["a@x.com", "b@y.com"]);
    expect(parseAlertRecipients("a@x.com,a@x.com")).toEqual(["a@x.com"]);
  });

  it("returns nothing when unset or meaningless", () => {
    expect(parseAlertRecipients(undefined)).toEqual([]);
    expect(parseAlertRecipients("")).toEqual([]);
    expect(parseAlertRecipients(",,,")).toEqual([]);
    expect(parseAlertRecipients("not-an-address")).toEqual([]);
  });
});
