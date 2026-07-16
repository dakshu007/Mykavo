"use client";

import { useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampSliderPercent,
  modeAvailability,
  sliderPercentForKey,
  type CompareMode,
} from "@/lib/screenshot-compare";

/**
 * Before/after screenshot comparison (spec §33 - "Make comparison extremely
 * easy"). Three modes behind a segmented pill control: side by side, a
 * draggable slider (pointer + keyboard), and the pixel-diff overlay when the
 * comparison engine produced one. All images live in identical aspect boxes
 * so the layout never shifts while they load.
 */

const MODES: { id: CompareMode; label: string; disabledTitle: string }[] = [
  {
    id: "side-by-side",
    label: "Side by side",
    disabledTitle: "No screenshots available",
  },
  {
    id: "slider",
    label: "Slider",
    disabledTitle: "Needs both a before and an after screenshot",
  },
  {
    id: "diff",
    label: "Diff",
    disabledTitle: "No pixel diff image for this change",
  },
];

export function ScreenshotCompare({
  beforeSrc,
  afterSrc,
  diffSrc,
  beforeLabel,
  afterLabel,
  initialMode,
}: {
  beforeSrc?: string | null;
  afterSrc?: string | null;
  diffSrc?: string | null;
  beforeLabel?: string | null;
  afterLabel?: string | null;
  initialMode?: CompareMode;
}) {
  const available = modeAvailability({
    hasBefore: !!beforeSrc,
    hasAfter: !!afterSrc,
    hasDiff: !!diffSrc,
  });
  const [mode, setMode] = useState<CompareMode>(() =>
    initialMode && available[initialMode] ? initialMode : "side-by-side",
  );
  const [percent, setPercent] = useState(50);

  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  function percentFromClientX(clientX: number): number | null {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return clampSliderPercent(((clientX - rect.left) / rect.width) * 100);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = percentFromClientX(event.clientX);
    if (next !== null) setPercent(next);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const next = percentFromClientX(event.clientX);
    if (next !== null) setPercent(next);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const next = sliderPercentForKey(percent, event.key);
    if (next === null) return;
    event.preventDefault();
    setPercent(next);
  }

  return (
    <div className="space-y-4">
      {/* Segmented mode control */}
      <div
        role="group"
        aria-label="Screenshot comparison mode"
        className="inline-flex rounded-full bg-surface p-1"
      >
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            disabled={!available[m.id]}
            aria-pressed={mode === m.id}
            title={available[m.id] ? undefined : m.disabledTitle}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              mode === m.id ? "bg-ink text-ink-inverse" : "text-ink-secondary hover:text-ink",
              !available[m.id] && "cursor-not-allowed opacity-40 hover:text-ink-secondary",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "side-by-side" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <figure>
            <figcaption className="mb-2">
              <LabelChip kind="before" label={beforeLabel} />
            </figcaption>
            <Shot src={beforeSrc} alt="Baseline screenshot" />
          </figure>
          <figure>
            <figcaption className="mb-2">
              <LabelChip kind="after" label={afterLabel} />
            </figcaption>
            <Shot src={afterSrc} alt="Current screenshot" />
          </figure>
        </div>
      )}

      {mode === "slider" && beforeSrc && afterSrc && (
        <div
          ref={frameRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative mx-auto aspect-[3/4] w-full max-w-xl cursor-ew-resize touch-none overflow-hidden rounded-tile border border-line bg-surface select-none"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt="Baseline screenshot"
            loading="lazy"
            decoding="async"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          {/* After image clipped to the right of the divider */}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${percent}%)` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={afterSrc}
              alt="Current screenshot"
              loading="lazy"
              decoding="async"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          </div>
          {/* Divider + focusable handle */}
          <div
            aria-hidden
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(22_24_29/25%)]"
            style={{ left: `${percent}%` }}
          />
          <button
            type="button"
            role="slider"
            aria-label="Comparison divider - left/right arrows move it, Home and End snap to the edges"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            aria-valuetext={`${Math.round(percent)}% baseline visible`}
            onKeyDown={onHandleKeyDown}
            className="absolute top-1/2 flex size-9 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border border-line bg-card text-ink-secondary shadow-float"
            style={{ left: `${percent}%` }}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
          <span className="pointer-events-none absolute top-3 left-3">
            <LabelChip kind="before" label={beforeLabel} overlay />
          </span>
          <span className="pointer-events-none absolute top-3 right-3">
            <LabelChip kind="after" label={afterLabel} overlay />
          </span>
        </div>
      )}

      {mode === "diff" && diffSrc && (
        <figure className="mx-auto w-full max-w-xl">
          <Shot src={diffSrc} alt="Visual difference between baseline and current screenshots" />
          <figcaption className="mt-2 text-center text-[13px] text-ink-secondary">
            Changed pixels highlighted.
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/** Before/After pill chip - a colored dot paired with a text label. */
function LabelChip({
  kind,
  label,
  overlay = false,
}: {
  kind: "before" | "after";
  label?: string | null;
  overlay?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        overlay ? "bg-panel/75 text-white backdrop-blur-sm" : "bg-surface text-ink-secondary",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          kind === "before" ? "bg-success" : "bg-primary",
        )}
      />
      {kind === "before" ? "Before" : "After"}
      {label ? ` · ${label}` : ""}
    </span>
  );
}

/** Fixed-aspect screenshot tile - reserves space before the image loads. */
function Shot({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-tile border border-line bg-surface text-[13px] text-ink-faint">
        No screenshot
      </div>
    );
  }
  return (
    <div className="aspect-[3/4] overflow-hidden rounded-tile border border-line bg-surface">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover object-top"
      />
    </div>
  );
}
