/**
 * Waitlist persistence behind an interface so Phase 1 can swap in Prisma
 * without touching the API route. Phase 0 uses an append-only JSONL file.
 */

import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export interface WaitlistEntry {
  email: string;
  source: string;
  createdAt: string;
}

export interface WaitlistStore {
  add(entry: WaitlistEntry): Promise<{ created: boolean }>;
}

class FileWaitlistStore implements WaitlistStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async existingEmails(): Promise<Set<string>> {
    try {
      const raw = await readFile(this.filePath, "utf-8");
      const emails = new Set<string>();
      for (const line of raw.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line) as WaitlistEntry;
          emails.add(parsed.email);
        } catch {
          // skip malformed line
        }
      }
      return emails;
    } catch {
      return new Set();
    }
  }

  async add(entry: WaitlistEntry): Promise<{ created: boolean }> {
    const existing = await this.existingEmails();
    if (existing.has(entry.email)) return { created: false };
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, JSON.stringify(entry) + "\n", "utf-8");
    return { created: true };
  }
}

const defaultPath =
  process.env.WAITLIST_FILE ?? join(process.cwd(), ".data", "waitlist.jsonl");

let store: WaitlistStore | null = null;

export function getWaitlistStore(): WaitlistStore {
  if (!store) store = new FileWaitlistStore(defaultPath);
  return store;
}
