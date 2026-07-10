"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { selectorLines, validateSelectorLines } from "@fluxen/shared";

/**
 * Comparison settings (spec §25/§36 false-positive controls): per-website
 * ignored selectors and screenshot masks, one CSS selector per line.
 * - Ignored: elements removed from the DOM before hashing and absent from
 *   the screenshot — excluded from change detection entirely.
 * - Masks: elements covered with a solid block in the screenshot only —
 *   their content is still compared.
 * Saved through the website PATCH route; validation mirrors its zod schema
 * so problems surface inline instead of as an opaque 400.
 */

function SelectorField({
  id,
  label,
  help,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  help: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full rounded-field border border-line bg-card px-4 py-3 font-mono text-[13px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
      />
      <p className="mt-1.5 text-[13px] text-ink-faint">{help}</p>
    </div>
  );
}

export function ComparisonSettings({
  websiteId,
  initialIgnored,
  initialMasks,
}: {
  websiteId: string;
  initialIgnored: string[];
  initialMasks: string[];
}) {
  const router = useRouter();
  const [ignoredText, setIgnoredText] = useState(initialIgnored.join("\n"));
  const [masksText, setMasksText] = useState(initialMasks.join("\n"));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const ignoredSelectors = selectorLines(ignoredText);
    const screenshotMasks = selectorLines(masksText);
    const problem =
      validateSelectorLines(ignoredSelectors) ?? validateSelectorLines(screenshotMasks);
    if (problem) {
      setError(problem);
      setSaved(false);
      return;
    }

    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ignoredSelectors, screenshotMasks }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save comparison settings. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-secondary">
        Cut false positives by telling Fluxen which parts of your pages are
        expected to change. One CSS selector per line, up to 20 per list.
      </p>

      <SelectorField
        id="ignored-selectors"
        label="Ignored selectors"
        help="Elements to exclude from change detection entirely — cookie banners, ads, rotating content. One CSS selector per line."
        placeholder={".cookie-banner\n#promo-carousel"}
        value={ignoredText}
        onChange={(v) => {
          setIgnoredText(v);
          setSaved(false);
        }}
      />

      <SelectorField
        id="screenshot-masks"
        label="Screenshot masks"
        help="Areas to hide in screenshots but still compare — e.g. user counts, dates."
        placeholder={".user-count\n[data-testid=\"last-updated\"]"}
        value={masksText}
        onChange={(v) => {
          setMasksText(v);
          setSaved(false);
        }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : saved ? (
            <Check className="size-3.5" aria-hidden />
          ) : null}
          {saved ? "Saved" : "Save comparison settings"}
        </button>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>

      <p className="text-[13px] text-ink-faint">
        Applies from the next scan. If visual alerts fire after changing masks,
        re-approve the baseline once.
      </p>
    </div>
  );
}
