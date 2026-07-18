/**
 * Typed API client for the MyKavo backend.
 *
 * Native: attaches the Better Auth session cookie (from SecureStore) plus
 * the app-managed workspace-selection cookie on every request - the backend
 * authenticates exactly as it does for the web dashboard. Web (dev preview):
 * browsers forbid manual Cookie headers, so requests rely on real browser
 * cookies instead.
 *
 * Session-expiry recovery: when an authenticated endpoint answers 401 the
 * client notifies subscribers (the tab shell signs out and returns to the
 * login screen) instead of leaving the user stranded on error states.
 */

import { Platform } from "react-native";

import { API_BASE, authClient } from "./auth";
import { buildQuery } from "./query";
import { safeSecureStorage, WORKSPACE_KEY } from "./secure-storage";
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

/* ------------------------- session-expiry signal -------------------------- */

type UnauthorizedListener = () => void;
const unauthorizedListeners = new Set<UnauthorizedListener>();

/** Subscribe to "the backend no longer accepts our session" events. */
export function onUnauthorized(listener: UnauthorizedListener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

function notifyUnauthorized(): void {
  for (const listener of unauthorizedListeners) {
    try {
      listener();
    } catch {
      // A listener must never break the API client.
    }
  }
}

/* --------------------------------- fetch ---------------------------------- */

function authHeaders(): Record<string, string> {
  if (Platform.OS === "web") return {};
  const parts: string[] = [];
  const sessionCookie = authClient.getCookie();
  if (sessionCookie) parts.push(sessionCookie);
  // The active-workspace cookie is set by the server via Set-Cookie, which
  // plain fetch does not persist on native - we mirror the selection locally
  // and replay it so every workspace-scoped endpoint sees it.
  const workspaceId = safeSecureStorage.getItem(WORKSPACE_KEY);
  if (workspaceId) parts.push(`mykavo-workspace=${workspaceId}`);
  return parts.length > 0 ? { Cookie: parts.join("; ") } : {};
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
    if (res.status === 401) notifyUnauthorized();
    throw new ApiError(res.status, body);
  }

  return (await res.json()) as T;
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
      `/api/mobile/changes${buildQuery({
        status: filters?.status,
        severity: filters?.severity,
        category: filters?.category,
        websiteId: filters?.websiteId,
      })}`,
    ),

  changeDetail: (id: string) =>
    request<ChangeDetailResponse>(`/api/mobile/changes/${id}`),

  scans: (websiteId?: string) =>
    request<ScansListResponse>(`/api/mobile/scans${buildQuery({ websiteId })}`),

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

  switchWorkspace: async (workspaceId: string) => {
    const result = await request<{ ok: true }>("/api/workspace/switch", {
      method: "POST",
      body: { workspaceId },
    });
    // Mirror the server's httpOnly cookie locally so native requests carry it.
    safeSecureStorage.setItem(WORKSPACE_KEY, workspaceId);
    return result;
  },

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
