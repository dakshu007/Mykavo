import { Bot, Globe, Smartphone, UserRound } from "lucide-react";
import { ShopifyGlyph, WordPressGlyph } from "@/components/brand/integration-icons";
import { CHANNEL_LABEL, type Channel } from "@/lib/activity/core";
import type { ChannelState, ChannelStatus } from "@/lib/admin/tracking-core";
import { cn } from "@/lib/utils";

/** Admin tracking - small shared pieces for the list and per-user pages. */

export const CHANNEL_ICON: Record<Channel | "account", React.ComponentType<{ className?: string }>> = {
  web: Globe,
  android: Smartphone,
  wordpress: WordPressGlyph,
  shopify: ShopifyGlyph,
  mcp: Bot,
  account: UserRound,
};

/** One colour per channel, for dots and bars. */
export const CHANNEL_DOT: Record<Channel, string> = {
  web: "bg-ink",
  android: "bg-success",
  // WordPress blue: the only channel colour without a theme token of its own.
  wordpress: "bg-[#2f7fc1]",
  shopify: "bg-warning",
  mcp: "bg-accent",
};

const STATUS_TONE: Record<ChannelStatus, string> = {
  active: "bg-success-soft text-success-strong ring-success/30",
  installed: "bg-surface text-ink ring-line",
  pending: "bg-warning-soft text-warning-strong ring-warning/30",
  started: "bg-warning-soft text-warning-strong ring-warning/30",
  stopped: "bg-critical-soft text-critical-strong ring-critical/30",
  none: "bg-transparent text-ink-faint ring-line/60",
};

export const STATUS_WORD: Record<ChannelStatus, string> = {
  active: "Active",
  installed: "Installed",
  pending: "Stuck",
  started: "Started",
  stopped: "Stopped",
  none: "Not used",
};

/** Compact status chip for the users table: icon, coloured by status. */
export function ChannelChip({ channel, state }: { channel: Channel; state: ChannelState }) {
  const Icon = CHANNEL_ICON[channel];
  const title = `${CHANNEL_LABEL[channel]}: ${state.label}${state.detail ? ` - ${state.detail}` : ""}`;
  return (
    <span
      title={title}
      aria-label={title}
      className={cn("inline-flex size-7 items-center justify-center rounded-full ring-1 ring-inset", STATUS_TONE[state.status])}
    >
      <Icon className="size-3.5" />
    </span>
  );
}

/** Full status card for the per-user page. */
export function ChannelCard({ channel, state }: { channel: Channel; state: ChannelState }) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <div className="min-w-0 rounded-card bg-card p-4 shadow-card">
      <p className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-ink-secondary">
        <Icon className="size-4 shrink-0" />
        <span className="truncate">{CHANNEL_LABEL[channel]}</span>
      </p>
      <span
        className={cn(
          "mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
          STATUS_TONE[state.status],
        )}
      >
        {STATUS_WORD[state.status]}
      </span>
      <p className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">{state.label}</p>
      {state.detail && <p className="mt-0.5 text-[12px] text-ink-secondary">{state.detail}</p>}
    </div>
  );
}

/** 14 small columns: which channels the user was active on each day. */
export function ActivitySpark({ spark }: { spark: Channel[][] }) {
  return (
    <span className="inline-flex h-6 items-end gap-[2px]" aria-label={`Active on ${spark.filter((d) => d.length).length} of the last 14 days`}>
      {spark.map((chs, i) =>
        chs.length ? (
          <span key={i} className="flex w-[5px] flex-col-reverse gap-px">
            {chs.map((ch) => (
              <span key={ch} className={cn("h-[5px] w-[5px] rounded-[1px]", CHANNEL_DOT[ch])} />
            ))}
          </span>
        ) : (
          <span key={i} className="h-[5px] w-[5px] rounded-[1px] bg-line" />
        ),
      )}
    </span>
  );
}

export function ChannelLegend() {
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-secondary">
      {(Object.keys(CHANNEL_DOT) as Channel[]).map((ch) => (
        <span key={ch} className="inline-flex items-center gap-1">
          <span className={cn("size-2 rounded-[2px]", CHANNEL_DOT[ch])} />
          {CHANNEL_LABEL[ch]}
        </span>
      ))}
    </span>
  );
}
