/**
 * Screen cache: the last good response of each screen, in memory and on disk,
 * so a screen paints its previous state instantly - even on a cold start -
 * while useLive fetches the fresh one behind it.
 *
 * Wiped on sign-out (clearLiveCache), and keyed by workspace, so nobody ever
 * sees another account's or another workspace's data.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { decodeEntry, encodeEntry, entryKey } from "./live-entry";
import { safeSecureStorage, WORKSPACE_KEY } from "./secure-storage";

const memory = new Map<string, unknown>();

export function liveKey(name: string, deps: string): string {
  return entryKey(safeSecureStorage.getItem(WORKSPACE_KEY), name, deps);
}

/** Synchronous: what this session already loaded. */
export function readMemory<T>(key: string): T | undefined {
  return memory.get(key) as T | undefined;
}

/** From disk, for the first paint after a cold start. Never throws. */
export async function readDisk<T>(key: string): Promise<T | undefined> {
  try {
    const hit = decodeEntry<T>(await AsyncStorage.getItem(key));
    if (!hit) return undefined;
    memory.set(key, hit.data);
    return hit.data;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, data: T): void {
  memory.set(key, data);
  const raw = encodeEntry(data);
  if (raw) AsyncStorage.setItem(key, raw).catch(() => undefined);
}

/** Forget every cached screen (sign-out, account reset). */
export async function clearLiveCache(): Promise<void> {
  memory.clear();
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith("mk-live:"));
    if (keys.length) await AsyncStorage.multiRemove(keys);
  } catch {
    // Nothing more to do; entries also expire on their own.
  }
}
