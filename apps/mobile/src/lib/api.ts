/**
 * Typed API client for the MyKavo backend.
 *
 * Native: attaches the Better Auth session cookie (from SecureStore) as a
 * Cookie header on every request - the backend authenticates exactly as it
 * does for the web dashboard. Web (dev preview): browsers forbid manual
 * Cookie headers, so requests rely on real browser cookies instead.
 */

import { Platform } from "react-native";

import { API_BASE, authClient } from "./auth";
import type {
  ApiErrorBody,
  ChangeAction,
  ChangeDetailResponse,
  ChangesListResponse,
  MeResponse,
  OverviewResponse,
  ScanDetailResponse,
  ScansListResponse,
  ScanTriggerResponse,
  WebsiteDetailResponse,
  WebsitesListResponse,
} from "./types";

export class ApiError extends Error {
  status: number;
  code?: string;
  scanId?: string;

  constructor(status: number, body: ApiErrorBody | null) {
    super(body?.error || `Request failed (${status})`);
    this.name = "ApiError";
    this.status = status;
    this.code = body?.code;
    this.scanId = body?.scanId;
  }
}

function authHeaders(): Record<string, string> {
  if (Platform.OS === "web") return {};
  const cookie = authClient.getCookie();
  return cookie ? { Cookie: cookie } : {};
}

async function request<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(init?.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...authHeaders(),
    },
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    ...(Platform.OS === "web" ? { credentials: "include" as const } : {}),
  });

  if (!res.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // Non-JSON error body (e.g. HTML error page) - fall through.
    }
    throw new ApiError(res.status, body);
  }

  return (await res.json()) as T;
}

function query(params: Record<string, string | undefined>): string {
  const pairs = Object.entries(params).filter(
    (pair): pair is [string, string] => Boolean(pair[1]),
  );
  if (pairs.length === 0) return "";
  return `?${new URLSearchParams(pairs).toString()}`;
}

/* --------------------------------- reads --------------------------------- */

export const api = {
  me: () => request<MeResponse>("/api/mobile/me"),

  overview: () => request<OverviewResponse>("/api/mobile/overview"),

  websites: () => request<WebsitesListResponse>("/api/websites"),

  websiteDetail: (id: string) =>
    request<WebsiteDetailResponse>(`/api/mobile/websites/${id}`),

  changes: (filters?: {
    status?: "open" | "all";
    severity?: string;
    category?: string;
    websiteId?: string;
  }) =>
    request<ChangesListResponse>(
      `/api/mobile/changes${query({
        status: filters?.status,
        severity: filters?.severity,
        category: filters?.category,
        websiteId: filters?.websiteId,
      })}`,
    ),

  changeDetail: (id: string) =>
    request<ChangeDetailResponse>(`/api/mobile/changes/${id}`),

  scans: (websiteId?: string) =>
    request<ScansListResponse>(`/api/mobile/scans${query({ websiteId })}`),

  scanDetail: (id: string) =>
    request<ScanDetailResponse>(`/api/mobile/scans/${id}`),

  /* ------------------------------ mutations ------------------------------ */

  runScan: (websiteId: string) =>
    request<ScanTriggerResponse>(`/api/websites/${websiteId}/scan`, {
      method: "POST",
    }),

  triageChange: (id: string, action: ChangeAction) =>
    request<{ change: unknown }>(`/api/changes/${id}`, {
      method: "PATCH",
      body: { action },
    }),

  updateBaselineFromChange: (id: string) =>
    request<{ ok: true }>(`/api/changes/${id}/update-baseline`, {
      method: "POST",
    }),

  approveScan: (id: string) =>
    request<{ pagesBaselined: number; approvedChanges: number }>(
      `/api/scans/${id}/approve`,
      { method: "POST" },
    ),

  switchWorkspace: (workspaceId: string) =>
    request<{ ok: true }>("/api/workspace/switch", {
      method: "POST",
      body: { workspaceId },
    }),

  pauseWebsite: (id: string, paused: boolean) =>
    request<{ website: unknown }>(`/api/websites/${id}`, {
      method: "PATCH",
      body: { paused },
    }),

  muteWebsite: (id: string, muteHours: 1 | 8 | 24 | null) =>
    request<{ website: unknown }>(`/api/websites/${id}`, {
      method: "PATCH",
      body: { muteHours },
    }),
};

/** Source props for an authenticated backend image (screenshots, diffs). */
export function authedImageSource(path: string): {
  uri: string;
  headers?: Record<string, string>;
} {
  const headers = authHeaders();
  return {
    uri: `${API_BASE}${path}`,
    ...(Object.keys(headers).length > 0 ? { headers } : {}),
  };
}

export function screenshotPath(snapshotId: string): string {
  return `/api/snapshots/${snapshotId}/screenshot`;
}

export function diffPath(changeId: string): string {
  return `/api/changes/${changeId}/diff`;
}
