"use client";

import { Suspense, useEffect, useId, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Link2, Loader2 } from "lucide-react";
import {
  SERVICE_KINDS,
  SERVICE_KIND_LABELS,
  SERVICE_LIMITS,
  SERVICE_PLATFORMS,
  SERVICE_PLATFORM_LABELS,
  SERVICE_URGENCIES,
  SERVICE_URGENCY_LABELS,
  isChangeId,
  isServiceKind,
  type ServiceKind,
  type ServicePlatform,
  type ServiceUrgency,
} from "@/lib/services/request";

/**
 * The /services request form.
 *
 * Reads two optional query values:
 *  - kind: preselects "One-off fix" or "Care plan" (the "Get a quote"
 *    buttons link to ?kind=...#request).
 *  - change: a change id from the dashboard. The form asks the server for
 *    that change's prefill, which only succeeds for a signed-in member of
 *    the change's workspace. The server checks ownership again on submit.
 */

interface Prefill {
  changeId: string;
  websiteUrl: string;
  title: string;
  message: string;
  email?: string;
}

type PrefillState =
  | { state: "none" }
  | { state: "loading" }
  | { state: "linked"; title: string }
  | { state: "signed_out" }
  | { state: "unavailable" };

function isPrefill(value: unknown): value is Prefill {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.changeId === "string" &&
    typeof v.websiteUrl === "string" &&
    typeof v.title === "string" &&
    typeof v.message === "string"
  );
}

const fieldClass =
  "w-full rounded-xl border border-black/15 bg-[#FBFAF4] px-4 py-3 text-[15px] text-[#151515] placeholder:text-[#8A8A7E] focus:border-[#151515] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-1";

const labelClass = "mb-1.5 block text-[14px] font-medium text-[#151515]";

function Optional() {
  return <span className="font-normal text-[#6B6B60]"> (optional)</span>;
}

function Required() {
  return (
    <span className="text-[#6B6B60]" aria-hidden>
      {" "}
      *
    </span>
  );
}

/** Segmented radio group: one visible choice per option, keyboard-native. */
function ChoiceGroup<T extends string>({
  legend,
  name,
  options,
  labels,
  value,
  onChange,
  required,
}: {
  legend: string;
  name: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | "";
  onChange: (value: T) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className={labelClass}>
        {legend}
        {required ? <Required /> : null}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = value === option;
          return (
            <label
              key={option}
              className={`relative inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-[14px] font-medium transition-colors has-focus-visible:ring-2 has-focus-visible:ring-[#FFD400] has-focus-visible:ring-offset-1 ${
                checked
                  ? "border-[#151515] bg-[#FFD400] text-[#151515]"
                  : "border-black/15 bg-[#FBFAF4] text-[#151515] hover:border-[#151515]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={checked}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {checked && <Check className="mr-1.5 size-3.5" aria-hidden />}
              {labels[option]}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function RequestFormInner({
  kindParam,
  changeParam,
}: {
  kindParam: string | null;
  changeParam: string | null;
}) {
  const uid = useId();
  const id = (field: string) => `${uid}-${field}`;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [message, setMessage] = useState("");
  const [urgency, setUrgency] = useState<ServiceUrgency | "">("");
  const [platform, setPlatform] = useState<ServicePlatform | "">("");
  const [kind, setKind] = useState<ServiceKind>(isServiceKind(kindParam) ? kindParam : "fix");
  const [honeypot, setHoneypot] = useState("");
  const [changeEventId, setChangeEventId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<PrefillState>(
    isChangeId(changeParam) ? { state: "loading" } : { state: "none" },
  );
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");

  // "Get a quote" links change ?kind= without remounting the form, so the
  // choice follows the URL (adjusted during render, not in an effect).
  const [seenKindParam, setSeenKindParam] = useState(kindParam);
  if (kindParam !== seenKindParam) {
    setSeenKindParam(kindParam);
    if (isServiceKind(kindParam)) setKind(kindParam);
  }
  const [seenChangeParam, setSeenChangeParam] = useState(changeParam);
  if (changeParam !== seenChangeParam) {
    setSeenChangeParam(changeParam);
    setPrefill(isChangeId(changeParam) ? { state: "loading" } : { state: "none" });
  }

  useEffect(() => {
    if (!isChangeId(changeParam)) return;
    const controller = new AbortController();
    fetch(`/api/services/request?change=${encodeURIComponent(changeParam)}`, {
      signal: controller.signal,
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (res.status === 401) {
          setPrefill({ state: "signed_out" });
          return;
        }
        const data: unknown = res.ok ? await res.json() : null;
        if (!isPrefill(data)) {
          setPrefill({ state: "unavailable" });
          return;
        }
        setChangeEventId(data.changeId);
        // Never overwrite something the visitor already typed.
        setWebsiteUrl((current) => current || data.websiteUrl);
        setMessage((current) => current || data.message);
        if (data.email) setEmail((current) => current || (data.email ?? ""));
        setKind("fix");
        setPrefill({ state: "linked", title: data.title });
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setPrefill({ state: "unavailable" });
      });
    return () => controller.abort();
  }, [changeParam]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!urgency) {
      setError("Choose how urgent this is.");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/services/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          websiteUrl,
          message,
          urgency,
          kind,
          ...(platform ? { platform } : {}),
          ...(changeEventId ? { changeEventId } : {}),
          company_website_url: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please email support@mykavo.app.");
        setStatus("idle");
        return;
      }
      setSentTo(email.trim());
      setStatus("sent");
    } catch {
      setError("Could not reach MyKavo. Check your connection, or email support@mykavo.app.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[#151515] bg-white px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515] sm:px-10"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#FFD400]">
          <Check className="size-6 text-[#151515]" aria-hidden />
        </span>
        <p className="mt-5 text-[20px] font-semibold text-[#151515]">Thanks, we have it.</p>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-[#6B6B60]">
          We will look at your site and reply to{" "}
          <span className="font-medium text-[#151515]">{sentTo}</span> with a fixed quote,
          usually within 1 to 2 business days. Nothing happens until you approve it.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      aria-describedby={`${id("intro")}`}
      className="relative rounded-2xl border border-[#151515] bg-white px-5 py-7 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515] sm:px-8 sm:py-8"
    >
      <p id={id("intro")} className="sr-only">
        Fields marked with an asterisk are required.
      </p>

      {prefill.state === "linked" && (
        <p className="mb-6 flex items-start gap-2.5 rounded-xl bg-[#FFF3B0] px-4 py-3 text-[14px] leading-6 text-[#151515]">
          <Link2 className="mt-1 size-4 shrink-0" aria-hidden />
          <span>
            Linked to your MyKavo change: <span className="font-semibold">{prefill.title}</span>.
            We will see the full before-and-after.
          </span>
        </p>
      )}
      {prefill.state === "signed_out" && (
        <p className="mb-6 rounded-xl bg-[#F3F1E6] px-4 py-3 text-[14px] leading-6 text-[#151515]">
          Sign in to MyKavo and open the change again to attach its details, or just describe
          the problem below.
        </p>
      )}
      {prefill.state === "unavailable" && (
        <p className="mb-6 rounded-xl bg-[#F3F1E6] px-4 py-3 text-[14px] leading-6 text-[#151515]">
          We could not attach that change. Describe the problem below and we will take it from
          there.
        </p>
      )}

      <div className="grid gap-5">
        <ChoiceGroup
          legend="What do you need?"
          name="kind"
          options={SERVICE_KINDS}
          labels={SERVICE_KIND_LABELS}
          value={kind}
          onChange={setKind}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={id("name")} className={labelClass}>
              Your name
              <Required />
            </label>
            <input
              id={id("name")}
              name="name"
              type="text"
              autoComplete="name"
              required
              maxLength={SERVICE_LIMITS.name}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={id("email")} className={labelClass}>
              Email
              <Required />
            </label>
            <input
              id={id("email")}
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={SERVICE_LIMITS.email}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={id("website")} className={labelClass}>
              Website address
              <Required />
            </label>
            <input
              id={id("website")}
              name="websiteUrl"
              type="text"
              inputMode="url"
              autoComplete="url"
              placeholder="example.com"
              required
              maxLength={SERVICE_LIMITS.websiteUrl}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor={id("platform")} className={labelClass}>
              Platform
              <Optional />
            </label>
            <select
              id={id("platform")}
              name="platform"
              value={platform}
              onChange={(e) => {
                const next = e.target.value;
                setPlatform(
                  (SERVICE_PLATFORMS as readonly string[]).includes(next)
                    ? (next as ServicePlatform)
                    : "",
                );
              }}
              className={fieldClass}
            >
              <option value="">Choose one</option>
              {SERVICE_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SERVICE_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={id("message")} className={labelClass}>
            What&apos;s wrong?
            <Required />
          </label>
          <textarea
            id={id("message")}
            name="message"
            rows={6}
            required
            minLength={SERVICE_LIMITS.messageMin}
            maxLength={SERVICE_LIMITS.message}
            placeholder="For example: the checkout button on /cart stopped working after yesterday's plugin update."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-describedby={id("message-help")}
            className={fieldClass}
          />
          <p id={id("message-help")} className="mt-1.5 text-[13px] leading-5 text-[#6B6B60]">
            Which page, what you expected, what happens instead. Please do not include passwords.
          </p>
        </div>

        <ChoiceGroup
          legend="How urgent is it?"
          name="urgency"
          options={SERVICE_URGENCIES}
          labels={SERVICE_URGENCY_LABELS}
          value={urgency}
          onChange={setUrgency}
          required
        />
      </div>

      {/* Honeypot: off-screen rather than display:none (which some bots
          detect), out of the tab order and hidden from assistive tech. */}
      <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-0 w-0 overflow-hidden opacity-0">
        <label htmlFor={id("hp")}>Leave this empty</label>
        <input
          id={id("hp")}
          name="company_website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-5 text-[14px] leading-6 text-[#B42318]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending" || prefill.state === "loading"}
        className="mt-7 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#151515] text-[15px] font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2 disabled:opacity-70"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending
          </>
        ) : (
          "Send for a fixed quote"
        )}
      </button>
      <p className="mt-3 text-center text-[12.5px] leading-5 text-[#6B6B60]">
        Free to ask. You get a fixed quote first, and nothing happens until you approve it.
      </p>
    </form>
  );
}

function RequestFormFromParams() {
  const params = useSearchParams();
  return <RequestFormInner kindParam={params.get("kind")} changeParam={params.get("change")} />;
}

/**
 * Suspense keeps the rest of /services statically prerendered: only this
 * form waits for the URL. The fallback is the same form without prefill, so
 * the prerendered HTML already shows a usable form.
 */
export function ServiceRequestForm() {
  return (
    <Suspense fallback={<RequestFormInner kindParam={null} changeParam={null} />}>
      <RequestFormFromParams />
    </Suspense>
  );
}
