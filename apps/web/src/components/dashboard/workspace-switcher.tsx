"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface WorkspaceOption {
  id: string;
  name: string;
}

/**
 * Compact workspace selector for the sidebar - rendered only when the user
 * belongs to more than one workspace. Switching POSTs to /api/workspace/switch
 * (membership re-verified server-side, httpOnly cookie set there) and
 * refreshes the tree so every page re-resolves against the new workspace.
 */
export function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: WorkspaceOption[];
  currentWorkspaceId: string;
}) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function switchTo(workspaceId: string) {
    if (switching || workspaceId === currentWorkspaceId) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <label className="mt-1 block px-3">
      <span className="sr-only">Switch workspace</span>
      <select
        value={currentWorkspaceId}
        onChange={(e) => switchTo(e.target.value)}
        disabled={switching}
        className={cn(
          "w-full cursor-pointer truncate rounded-full border border-line bg-card px-3 py-1.5 text-[12px] font-medium text-ink-secondary",
          "focus:border-primary focus:outline-none disabled:opacity-60",
        )}
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>
  );
}
