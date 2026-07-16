import {
  Bell,
  Eye,
  Gauge,
  Globe,
  Link2Off,
  MousePointerClick,
  Search,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";

/**
 * Static browser-chrome product mock (ballpark/playground-style): a fixed,
 * hand-drawn "changes feed" state of the MyKavo dashboard inside a crisp
 * ink-bordered browser frame, plus a dark terminal "scan log" rail
 * (hydradb-style). Pure server markup — the only motion is a CSS pulse on
 * the live dot, disabled under prefers-reduced-motion.
 */

const changeRows = [
  {
    severity: "Critical",
    dot: "#151515",
    chip: "bg-[#FFD400] text-[#151515]",
    icon: Search,
    title: "robots meta flipped to noindex",
    site: "aurora-outdoor.com",
    page: "/tents",
    time: "4 min ago",
    highlight: true,
  },
  {
    severity: "High",
    dot: "#151515",
    chip: "bg-[#151515] text-[#F5F5F0]",
    icon: Link2Off,
    title: "17 internal links now return 404",
    site: "meridianlegal.co",
    page: "site-wide",
    time: "1 h ago",
    highlight: false,
  },
  {
    severity: "Medium",
    dot: "#6B6B60",
    chip: "border border-black/15 bg-white text-[#151515]",
    icon: Eye,
    title: "Visual diff 12.4% on homepage hero",
    site: "bloomandroot.shop",
    page: "/",
    time: "3 h ago",
    highlight: false,
  },
  {
    severity: "Medium",
    dot: "#6B6B60",
    chip: "border border-black/15 bg-white text-[#151515]",
    icon: Gauge,
    title: "Page weight up 38% after deploy",
    site: "northwinddental.com",
    page: "/booking",
    time: "Yesterday",
    highlight: false,
  },
  {
    severity: "Low",
    dot: "#9C9E93",
    chip: "border border-black/15 bg-white text-[#151515]",
    icon: MousePointerClick,
    title: "CTA text changed on pricing page",
    site: "aurora-outdoor.com",
    page: "/pricing",
    time: "Yesterday",
    highlight: false,
  },
];

const scanLog = [
  { t: "09:41:02", line: "scan #482 started · 9 pages", tone: "dim" },
  { t: "09:41:11", line: "GET /tents → 200 · 1.2s", tone: "ok" },
  { t: "09:41:12", line: "screenshot captured · diff 0.2%", tone: "ok" },
  { t: "09:41:14", line: "robots: index → noindex", tone: "alert" },
  { t: "09:41:14", line: "severity: CRITICAL · alert queued", tone: "alert" },
  { t: "09:41:19", line: "8/9 pages match baseline v3", tone: "dim" },
];

export function DashboardMock() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl px-0 sm:px-4">
      {/* Browser frame */}
      <div className="overflow-hidden rounded-2xl border border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
        {/* Chrome bar */}
        <div className="flex items-center gap-3 border-b border-black/10 bg-[#F7F6EE] px-4 py-2.5">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full border border-black/20 bg-white" />
            <span className="size-2.5 rounded-full border border-black/20 bg-white" />
            <span className="size-2.5 rounded-full border border-black/20 bg-[#FFD400]" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1 font-mono text-[11px] text-[#151515]/70">
              <Globe className="size-3 text-[#151515]/40" aria-hidden />
              app.mykavo.app/changes
            </span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-full bg-[#151515] px-2.5 py-1 text-[10px] font-semibold text-[#F5F5F0] sm:flex">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full rounded-full bg-[#FFD400] opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex size-1.5 rounded-full bg-[#FFD400]" />
            </span>
            LIVE
          </span>
        </div>

        <div className="grid lg:grid-cols-[1fr_260px]">
          {/* Changes feed */}
          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <LogoMark size={18} />
                <p className="text-[15px] font-semibold text-[#151515]">Changes</p>
                <span className="rounded-full bg-[#FFD400] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#151515]">
                  5 open
                </span>
              </div>
              <div className="flex gap-1.5" aria-hidden>
                {["All sites", "Critical", "High"].map((f, i) => (
                  <span
                    key={f}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      i === 0
                        ? "bg-[#151515] text-[#F5F5F0]"
                        : "border border-black/15 text-[#151515]/60"
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {changeRows.map((row) => (
                <div
                  key={row.title}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 ${
                    row.highlight
                      ? "border-[#151515] bg-[#FFF7CC] shadow-[3px_3px_0_#151515]"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <row.icon className="size-4 shrink-0 text-[#151515]/70" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#151515]">{row.title}</p>
                    <p className="truncate font-mono text-[10.5px] text-[#151515]/50">
                      {row.site} · {row.page} · {row.time}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${row.chip}`}
                  >
                    {row.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Terminal scan-log rail */}
          <div className="hidden flex-col border-l border-black/10 bg-[#151515] p-5 lg:flex">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-[#9C9E93]">
                Scan log
              </p>
              <Bell className="size-3.5 text-[#FFD400]" aria-hidden />
            </div>
            <div className="mt-4 space-y-2.5 font-mono text-[11px] leading-relaxed">
              {scanLog.map((l) => (
                <p key={l.t + l.line} className="flex gap-2">
                  <span className="shrink-0 text-[#9C9E93]/60">{l.t}</span>
                  <span
                    className={
                      l.tone === "alert"
                        ? "font-semibold text-[#FFD400]"
                        : l.tone === "ok"
                          ? "text-[#E9EBDF]"
                          : "text-[#9C9E93]"
                    }
                  >
                    {l.line}
                  </span>
                </p>
              ))}
            </div>
            <div className="mt-auto rounded-lg border border-white/15 bg-white/[0.06] p-3">
              <p className="font-mono text-[10.5px] text-[#9C9E93]">next scheduled scan</p>
              <p className="mt-0.5 font-mono text-[13px] font-semibold text-[#E9EBDF]">
                tomorrow · 09:41 UTC
              </p>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[#6B6B60]">
        Illustrative dashboard state
      </p>
    </div>
  );
}
