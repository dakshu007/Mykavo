"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Sparkles } from "lucide-react";
import { VIDEO_TONES } from "@mykavo/brand-video/pure";
import { cn } from "@/lib/utils";
import { Alert, BusyButton, errorOf, field, hero, label, postJson, secondary } from "./ui";

const TONE_LABEL: Record<(typeof VIDEO_TONES)[number], string> = {
  professional: "Professional",
  friendly: "Friendly",
  bold: "Bold",
  premium: "Premium",
};

export function CreateVideo({
  websiteId,
  scriptsLeft,
  disabled,
}: {
  websiteId: string;
  /** null = unlimited */
  scriptsLeft: number | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [duration, setDuration] = useState<30 | 60>(30);
  const [tone, setTone] = useState<(typeof VIDEO_TONES)[number]>("professional");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<"ai" | "template" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async (mode: "ai" | "template") => {
    setBusy(mode);
    setError(null);
    const { ok, data } = await postJson(`/api/brand-video/${websiteId}/videos`, { mode, durationSec: duration, tone, notes });
    if (!ok || typeof data.videoId !== "string") {
      setBusy(null);
      return setError(errorOf(data));
    }
    router.push(`/dashboard/brand-video/videos/${data.videoId}`);
  };

  const noScripts = scriptsLeft !== null && scriptsLeft <= 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,220px)]">
        <fieldset>
          <legend className={label}>Length</legend>
          <div className="mt-1 inline-flex rounded-full border border-line p-0.5" role="radiogroup">
            {([30, 60] as const).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                onClick={() => setDuration(d)}
                className={cn(
                  "h-8 rounded-full px-4 text-[13px] font-semibold transition-colors",
                  duration === d ? "bg-ink text-white" : "text-ink-secondary hover:text-ink",
                )}
              >
                {d} seconds
              </button>
            ))}
          </div>
        </fieldset>
        <label className={label}>
          Tone
          <select className={field} value={tone} onChange={(e) => setTone(e.target.value as (typeof VIDEO_TONES)[number])}>
            {VIDEO_TONES.map((t) => (
              <option key={t} value={t}>
                {TONE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        What should the video focus on? <span className="text-ink-faint">(optional)</span>
        <textarea
          className={field}
          rows={2}
          maxLength={400}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="For example: our new payroll service, for restaurant owners"
        />
      </label>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap items-center gap-2">
        <BusyButton
          busy={busy === "ai"}
          busyLabel="Starting"
          icon={<Sparkles className="size-4" aria-hidden />}
          className={hero}
          disabled={disabled || busy !== null || noScripts}
          onClick={() => void create("ai")}
        >
          Write my video with AI
        </BusyButton>
        <BusyButton
          busy={busy === "template"}
          busyLabel="Building"
          icon={<LayoutTemplate className="size-3.5" aria-hidden />}
          className={secondary}
          disabled={disabled || busy !== null}
          onClick={() => void create("template")}
        >
          Start from a template
        </BusyButton>
        <span className="text-[12px] text-ink-faint">
          {scriptsLeft === null ? "Unlimited AI scripts" : `${scriptsLeft} AI ${scriptsLeft === 1 ? "script" : "scripts"} left`} · a template uses none
        </span>
      </div>
    </div>
  );
}
