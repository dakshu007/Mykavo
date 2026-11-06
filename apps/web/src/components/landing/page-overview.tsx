import { AiOverview } from "@/components/blog/ai-overview";
import { MonitorUrlCta } from "@/components/cta/monitor-url-cta";
import { pageOverview } from "@/config/page-overviews";

/**
 * The AI Overview for a tool or landing page (config/page-overviews), and
 * optionally the "enter your website" CTA right under it: readers who got
 * their answer from the overview see the next step before they leave.
 */
export function PageOverviewBlock({
  path,
  cta = true,
  className = "",
}: {
  path: string;
  /** Show MonitorUrlCta under the overview. Off on tool pages, which already open with a URL box. */
  cta?: boolean;
  className?: string;
}) {
  const overview = pageOverview(path);
  if (!overview) return null;
  return (
    <div className={`not-prose mx-auto max-w-3xl space-y-6 text-left [&_ul]:list-none! [&_ul]:pl-0! ${className}`}>
      <AiOverview answer={overview.answer} takeaways={overview.takeaways} />
      {cta && <MonitorUrlCta from={`page:${path}`.slice(0, 60)} />}
    </div>
  );
}
