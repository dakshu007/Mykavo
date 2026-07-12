"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Importance = "NORMAL" | "IMPORTANT" | "CRITICAL";

export interface ElementView {
  id: string;
  name: string;
  selector: string;
  importance: Importance;
  expectedExistence: boolean;
  expectedVisibility: boolean;
  expectedText: string | null;
  expectedHref: string | null;
  enabled: boolean;
  latest: { exists: boolean; visible: boolean } | null;
}

const IMPORTANCE_OPTIONS: { value: Importance; label: string; hint: string }[] = [
  { value: "NORMAL", label: "Normal", hint: "Medium alerts" },
  { value: "IMPORTANT", label: "Important", hint: "High alerts" },
  { value: "CRITICAL", label: "Critical", hint: "Critical alerts" },
];

interface FormState {
  name: string;
  selector: string;
  importance: Importance;
  expectedText: string;
  expectedHref: string;
  expectedExistence: boolean;
  expectedVisibility: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  selector: "",
  importance: "IMPORTANT",
  expectedText: "",
  expectedHref: "",
  expectedExistence: true,
  expectedVisibility: true,
};

function importanceClasses(importance: Importance): string {
  if (importance === "CRITICAL") return "bg-critical-soft text-critical-strong";
  if (importance === "IMPORTANT") return "bg-primary-soft text-primary";
  return "bg-surface text-ink-secondary";
}

function statusOf(el: ElementView): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  if (!el.latest) return { label: "Not scanned yet", tone: "muted" };
  const { exists, visible } = el.latest;
  if (el.expectedExistence) {
    if (!exists) return { label: "Missing", tone: "bad" };
    if (el.expectedVisibility && !visible) return { label: "Hidden", tone: "warn" };
    return { label: "Present", tone: "ok" };
  }
  return exists
    ? { label: "Present (unexpected)", tone: "warn" }
    : { label: "Absent", tone: "ok" };
}

const TONE_CLASSES: Record<"ok" | "warn" | "bad" | "muted", string> = {
  ok: "bg-success-soft text-success-strong",
  warn: "bg-warning-soft text-warning-strong",
  bad: "bg-critical-soft text-critical-strong",
  muted: "bg-surface text-ink-faint",
};

export function MonitoredElementsManager({
  websiteId,
  pageId,
  elements,
}: {
  websiteId: string;
  pageId: string;
  elements: ElementView[];
}) {
  const router = useRouter();
  // null = form closed, "new" = adding, or an element id = editing.
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const base = `/api/websites/${websiteId}/pages/${pageId}/elements`;

  function openAdd() {
    setForm(EMPTY_FORM);
    setError("");
    setEditing("new");
  }

  function openEdit(el: ElementView) {
    setForm({
      name: el.name,
      selector: el.selector,
      importance: el.importance,
      expectedText: el.expectedText ?? "",
      expectedHref: el.expectedHref ?? "",
      expectedExistence: el.expectedExistence,
      expectedVisibility: el.expectedVisibility,
    });
    setError("");
    setEditing(el.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const isNew = editing === "new";
    try {
      const res = await fetch(isNew ? base : `${base}/${editing}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          selector: form.selector.trim(),
          importance: form.importance,
          expectedExistence: form.expectedExistence,
          expectedVisibility: form.expectedVisibility,
          expectedText: form.expectedText.trim(),
          expectedHref: form.expectedHref.trim(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save the element.");
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the element.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    if (!window.confirm("Stop monitoring this element?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not delete the element.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the element.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-field border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">Conversion elements</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            Get alerted the moment a critical button, form, or CTA goes missing, hidden, or changes.
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-ink-inverse transition-colors hover:bg-ink-hover"
          >
            <Plus className="size-4" aria-hidden /> Add element
          </button>
        )}
      </div>

      {editing !== null && (
        <form
          onSubmit={submit}
          className="mt-4 space-y-4 rounded-tile border border-line bg-surface/60 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="el-name" className="mb-1.5 block text-[13px] font-medium text-ink">
                Name
              </label>
              <input
                id="el-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Start free trial button"
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="el-selector" className="mb-1.5 block text-[13px] font-medium text-ink">
                CSS selector
              </label>
              <input
                id="el-selector"
                value={form.selector}
                onChange={(e) => setForm((f) => ({ ...f, selector: e.target.value }))}
                placeholder="a.cta-primary, #signup-btn"
                className={cn(inputClass, "font-mono")}
                required
              />
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-ink">Importance</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {IMPORTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, importance: opt.value }))}
                  className={cn(
                    "rounded-tile border px-3 py-2 text-left transition-colors",
                    form.importance === opt.value
                      ? "border-primary bg-primary-soft"
                      : "border-line bg-card hover:border-ink-faint",
                  )}
                >
                  <span className="block text-[13px] font-medium text-ink">{opt.label}</span>
                  <span className="block text-xs text-ink-faint">{opt.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="el-text" className="mb-1.5 block text-[13px] font-medium text-ink">
                Expected text <span className="text-ink-faint">(optional)</span>
              </label>
              <input
                id="el-text"
                value={form.expectedText}
                onChange={(e) => setForm((f) => ({ ...f, expectedText: e.target.value }))}
                placeholder="Start free trial"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="el-href" className="mb-1.5 block text-[13px] font-medium text-ink">
                Expected link <span className="text-ink-faint">(optional)</span>
              </label>
              <input
                id="el-href"
                value={form.expectedHref}
                onChange={(e) => setForm((f) => ({ ...f, expectedHref: e.target.value }))}
                placeholder="/signup"
                className={cn(inputClass, "font-mono")}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.expectedExistence}
                onChange={(e) => setForm((f) => ({ ...f, expectedExistence: e.target.checked }))}
                className="size-4 accent-primary"
              />
              <span className="text-[13px] text-ink">Must be present</span>
            </label>
            <label className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.expectedVisibility}
                onChange={(e) => setForm((f) => ({ ...f, expectedVisibility: e.target.checked }))}
                className="size-4 accent-primary"
              />
              <span className="text-[13px] text-ink">Must be visible</span>
            </label>
          </div>

          {error && (
            <p className="text-[13px] text-critical-strong" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {editing === "new" ? "Add element" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="inline-flex h-9 items-center rounded-full px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {elements.length > 0 ? (
        <ul className="mt-4 divide-y divide-line">
          {elements.map((el) => {
            const status = statusOf(el);
            return (
              <li key={el.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{el.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        importanceClasses(el.importance),
                      )}
                    >
                      {el.importance.charAt(0) + el.importance.slice(1).toLowerCase()}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        TONE_CLASSES[status.tone],
                      )}
                    >
                      {status.label}
                    </span>
                    {!el.enabled && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-faint">
                        Paused
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-ink-faint">{el.selector}</p>
                  {(el.expectedText || el.expectedHref) && (
                    <p className="mt-0.5 truncate text-xs text-ink-faint">
                      {el.expectedText && <>text “{el.expectedText}”</>}
                      {el.expectedText && el.expectedHref && " · "}
                      {el.expectedHref && <>link {el.expectedHref}</>}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(el)}
                    aria-label={`Edit ${el.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface hover:text-ink"
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(el.id)}
                    aria-label={`Delete ${el.name}`}
                    className="inline-flex size-8 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-critical-soft hover:text-critical-strong"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        editing === null && (
          <p className="mt-4 rounded-tile border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-secondary">
            No conversion elements yet. Add a critical button, form, or CTA to be alerted the moment
            it breaks.
          </p>
        )
      )}
    </div>
  );
}
