import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * createWebsite against an in-memory store whose transactions honour the
 * advisory lock: $executeRaw waits for the previous holder's transaction to
 * finish, like pg_advisory_xact_lock. Parallel requests on a 1-website plan
 * must yield exactly one website.
 */

type Row = { id: string; workspaceId: string; normalizedUrl: string; url: string; name: string; status: string };
const rows: Row[] = [];
let limit = 1;
let lockTail: Promise<void> = Promise.resolve();
const lockSql: string[] = [];

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function client() {
  return {
    website: {
      findUnique: async ({ where }: { where: { workspaceId_normalizedUrl: { workspaceId: string; normalizedUrl: string } } }) => {
        await tick();
        const key = where.workspaceId_normalizedUrl;
        return rows.find((r) => r.workspaceId === key.workspaceId && r.normalizedUrl === key.normalizedUrl) ?? null;
      },
      count: async ({ where }: { where: { workspaceId: string } }) => {
        await tick();
        return rows.filter((r) => r.workspaceId === where.workspaceId).length;
      },
      create: async ({ data }: { data: Omit<Row, "id"> }) => {
        await tick();
        const row = { id: `w${rows.length + 1}`, ...data };
        rows.push(row);
        return row;
      },
    },
  };
}

vi.mock("@mykavo/database", () => {
  class PrismaClientKnownRequestError extends Error {
    code = "";
  }
  return {
    Prisma: { PrismaClientKnownRequestError },
    prisma: {
      ...client(),
      $transaction: async <T,>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
        let release: () => void = () => {};
        const tx = {
          ...client(),
          $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
            lockSql.push(strings.join("?") + JSON.stringify(values));
            const previous = lockTail;
            lockTail = new Promise<void>((resolve) => {
              release = resolve;
            });
            await previous;
            return 1;
          },
        };
        try {
          return await fn(tx);
        } finally {
          release();
        }
      },
    },
  };
});

class LimitError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
vi.mock("@/lib/limits", () => ({
  LimitError,
  getEffectiveWebsiteLimit: async () => limit,
  assertCanAddWebsite: async (workspaceId: string) => {
    await tick();
    if (rows.filter((r) => r.workspaceId === workspaceId).length >= limit) {
      throw new LimitError("WEBSITE_LIMIT", "Your Free plan monitors up to 1 website.");
    }
  },
}));
vi.mock("@/lib/security/ssrf", () => ({
  assertSafeUrl: async () => undefined,
  UnsafeUrlError: class extends Error {
    code = "";
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { createWebsite } = await import("./website-create");

beforeEach(() => {
  rows.length = 0;
  lockSql.length = 0;
  limit = 1;
  lockTail = Promise.resolve();
});

describe("createWebsite", () => {
  it("creates a website", async () => {
    const result = await createWebsite("ws1", { url: "https://example.com" });
    expect(result.ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(lockSql[0]).toContain("pg_advisory_xact_lock");
    expect(lockSql[0]).toContain("website-create:ws1");
  });

  it("never lets parallel requests exceed the plan limit", async () => {
    const results = await Promise.all(
      ["https://a.example", "https://b.example", "https://c.example", "https://d.example"].map((url) =>
        createWebsite("ws1", { url }),
      ),
    );
    expect(rows).toHaveLength(1);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const refused = results.filter((r) => !r.ok);
    expect(refused).toHaveLength(3);
    for (const r of refused) {
      expect(r.ok === false && r.reason).toBe("LIMIT");
    }
  });

  it("returns EXISTS for a duplicate, also when sent in parallel", async () => {
    limit = 5;
    const results = await Promise.all([
      createWebsite("ws1", { url: "https://example.com" }),
      createWebsite("ws1", { url: "https://example.com/" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(results.map((r) => (r.ok ? "ok" : r.reason)).sort()).toEqual(["EXISTS", "ok"]);
  });

  it("refuses up front when the workspace is already full", async () => {
    await createWebsite("ws1", { url: "https://example.com" });
    const result = await createWebsite("ws1", { url: "https://other.example" });
    expect(result).toMatchObject({ ok: false, reason: "LIMIT", code: "WEBSITE_LIMIT" });
    expect(rows).toHaveLength(1);
  });
});
