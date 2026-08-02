/** Shared server-safe presentation helpers for the Site Audit UI. */

export function healthTone(score: number): string {
  if (score >= 90) return "text-success-strong";
  if (score >= 70) return "text-warning-strong";
  return "text-critical-strong";
}

export function healthStroke(score: number): string {
  if (score >= 90) return "var(--color-success)";
  if (score >= 70) return "var(--color-warning)";
  return "var(--color-critical)";
}

export const SEVERITY_CHIP: Record<string, { label: string; className: string }> = {
  ERROR: { label: "Error", className: "bg-critical-soft text-critical-strong" },
  WARNING: { label: "Warning", className: "bg-warning-soft text-warning-strong" },
  NOTICE: { label: "Notice", className: "bg-info-soft text-ink-secondary" },
};

/** Ahrefs-style half gauge, pure SVG so it renders server-side. */
export function HealthGauge({ score }: { score: number }) {
  const radius = 64;
  const circumference = Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <svg viewBox="0 0 160 96" className="w-44" role="img" aria-label={`Health score ${score} out of 100`}>
      <path
        d="M 16 88 A 64 64 0 0 1 144 88"
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 16 88 A 64 64 0 0 1 144 88"
        fill="none"
        stroke={healthStroke(score)}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      <text
        x="80"
        y="78"
        textAnchor="middle"
        className="fill-[var(--color-ink)]"
        style={{ fontSize: "34px", fontWeight: 600, letterSpacing: "-0.02em" }}
      >
        {score}
      </text>
    </svg>
  );
}
