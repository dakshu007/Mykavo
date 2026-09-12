import { CalendarClock, AlertTriangle } from "lucide-react";
import { assessExpiry, blockingStatuses, type ExpiryUrgency } from "@mykavo/shared";
import { CardHeader } from "@/components/ui/card";

/**
 * When does this domain expire?
 *
 * An expired domain takes the website and every email address on it down at
 * once, and unlike an outage nobody gets paged - the renewal notice went to an
 * inbox someone left the company with. It is the most expensive website failure
 * there is and the cheapest to prevent, and no monitoring tool warns about it.
 *
 * Renders nothing until a lookup has run, and says plainly when the registry
 * could not be read rather than implying the domain is fine.
 */

export interface DomainInfo {
  domainName: string | null;
  domainExpiresAt: Date | null;
  domainRegistrar: string | null;
  domainStatuses: unknown;
  domainCheckedAt: Date | null;
  domainLookupError: string | null;
}

const TONE: Record<ExpiryUrgency, string> = {
  expired: "bg-critical-soft text-critical-strong",
  critical: "bg-critical-soft text-critical-strong",
  warning: "bg-warning-soft text-warning-strong",
  notice: "bg-primary-soft text-accent",
  ok: "bg-success-soft text-success-strong",
};

const LABEL: Record<ExpiryUrgency, string> = {
  expired: "Expired",
  critical: "Renew now",
  warning: "Renew soon",
  notice: "Coming up",
  ok: "In good standing",
};

/** Why a lookup failed, in language that does not blame the user. */
const ERROR_COPY: Record<string, string> = {
  NO_REGISTRABLE_DOMAIN: "This address has no public domain registration to check.",
  NOT_FOUND: "The registry has no record for this domain.",
  RATE_LIMITED: "The registry rate-limited us. MyKavo will retry on the next sweep.",
  UNSUPPORTED_TLD: "This domain's registry does not publish expiry data.",
  BLOCKED_URL: "The registry lookup was blocked by MyKavo's request guard.",
  LOOKUP_FAILED: "The registry could not be reached.",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

export function DomainExpiryPanel({ domain }: { domain: DomainInfo }) {
  // Nothing to show until the weekly sweep has run at least once.
  if (!domain.domainCheckedAt) return null;

  const { daysRemaining, urgency, message } = assessExpiry(domain.domainExpiresAt);
  const statuses = Array.isArray(domain.domainStatuses)
    ? domain.domainStatuses.filter((s): s is string => typeof s === "string")
    : [];
  const blocking = blockingStatuses(statuses);

  return (
    <>
      <CardHeader
        icon={CalendarClock}
        title="Domain registration"
        action={
          domain.domainExpiresAt ? (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONE[urgency]}`}>
              {LABEL[urgency]}
            </span>
          ) : null
        }
      />

      {domain.domainExpiresAt ? (
        <>
          <p className="text-sm text-ink">
            <span className="font-semibold">{domain.domainName}</span> expires{" "}
            <span className="font-semibold">{formatDate(domain.domainExpiresAt)}</span>
            {daysRemaining !== null && daysRemaining >= 0 && (
              <span className="text-ink-secondary"> · {daysRemaining} days</span>
            )}
          </p>
          {message && (
            <p
              className={`mt-2 text-[13px] ${urgency === "expired" || urgency === "critical" ? "text-critical-strong" : "text-ink-secondary"}`}
            >
              {message}
            </p>
          )}
          {domain.domainRegistrar && (
            <p className="mt-2 text-[12.5px] text-ink-secondary">
              Registrar: {domain.domainRegistrar}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-secondary">
          {ERROR_COPY[domain.domainLookupError ?? ""] ??
            "MyKavo could not read an expiry date for this domain."}
        </p>
      )}

      {blocking.length > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-critical-soft px-3 py-2 text-[13px] text-critical-strong">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>
            The registry has this domain on hold ({blocking.join(", ")}). It may already
            be unreachable — contact the registrar.
          </span>
        </p>
      )}

      <p className="mt-3 text-[12px] text-ink-faint">
        Read from the public registry (RDAP) on {formatDate(domain.domainCheckedAt)}.
        MyKavo checks weekly — it cannot renew for you.
      </p>
    </>
  );
}
