"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** "Join workspace" button on the invite page - accepts, then opens the dashboard. */
export function InviteAcceptButton({
  token,
  workspaceName,
}: {
  token: string;
  workspaceName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/invites/${encodeURIComponent(token)}/accept`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Couldn't accept the invitation. Please try again.");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't accept the invitation. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button onClick={accept} disabled={loading} className="w-full">
        {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Join {workspaceName}
      </Button>
      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
