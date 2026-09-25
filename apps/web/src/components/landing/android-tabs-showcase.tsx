"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Bell, Check, Globe, LayoutGrid, Plus, RefreshCw, ScanLine, Settings, Sparkle } from "lucide-react";

/**
 * The five tabs of the Android app, one phone and one list. Picking a tab
 * swaps the screen; left alone it steps through them on its own, and stops
 * for good the moment someone chooses one. With reduced motion it never
 * advances by itself.
 *
 * The screens are drawn from the real app's layout (Overview, Websites,
 * Changes, Scans, Settings and the floating tab bar), filled with sample
 * data rather than screenshots so they stay sharp at any size.
 */

type TabKey = "overview" | "websites" | "changes" | "scans" | "settings";

const TABS: Array<{ key: TabKey; label: string; icon: typeof Bell; title: string; desc: string }> = [
  {
    key: "overview",
    label: "Overview",
    icon: LayoutGrid,
    title: "Everything that needs you, first",
    desc: "Open changes, your websites and uptime at a glance, with the most severe change at the top.",
  },
  {
    key: "websites",
    label: "Websites",
    icon: Globe,
    title: "Every site, one tap away",
    desc: "Status, last and next scan for each site. Run a scan, mute alerts or pause monitoring from the site's page - or add a new site.",
  },
  {
    key: "changes",
    label: "Changes",
    icon: Sparkle,
    title: "Triage on the train",
    desc: "Filter by status, severity and type. Approve, resolve, ignore or update the baseline without opening a laptop.",
  },
  {
    key: "scans",
    label: "Scans",
    icon: ScanLine,
    title: "Scan history that keeps up",
    desc: "Every scheduled and manual scan, live while it runs. Approve an entire scan in one go when the changes were expected.",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    title: "Alerts the way you want them",
    desc: "Push alerts for critical and high changes, light or dark mode, and a test notification to be sure it works.",
  },
];

const SEV: Record<string, { dot: string; bg: string; fg: string }> = {
  Critical: { dot: "#e5484d", bg: "#FDECEC", fg: "#B4232A" },
  High: { dot: "#f97316", bg: "#FFF1E6", fg: "#B4530A" },
  Medium: { dot: "#EAB308", bg: "#FFF8D6", fg: "#8A6A00" },
  Low: { dot: "#3B82F6", bg: "#EAF2FF", fg: "#1D4ED8" },
};

function SevBadge({ level }: { level: keyof typeof SEV }) {
  const s = SEV[level];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="size-1 rounded-full" style={{ background: s.dot }} />
      {level}
    </span>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-black/10 bg-white ${className}`}>{children}</div>;
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-black/[0.07] px-3 py-2.5 first:border-t-0">
      {children}
    </div>
  );
}

function OverviewScreen() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#E6C200] bg-[#FFF3B0] p-2.5">
          <p className="font-mono text-[8px] font-semibold uppercase tracking-wide text-[#6B6B60]">Open</p>
          <p className="text-[18px] font-semibold leading-tight">3</p>
        </div>
        <Card className="p-2.5">
          <p className="font-mono text-[8px] font-semibold uppercase tracking-wide text-[#6B6B60]">Sites</p>
          <p className="text-[18px] font-semibold leading-tight">4</p>
        </Card>
      </div>
      <Card className="mt-2 flex items-center justify-between px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10.5px] font-medium">
          <span className="size-1.5 rounded-full bg-[#16a34a]" /> Uptime, 24 hours
        </span>
        <span className="font-mono text-[10px] font-semibold">100%</span>
      </Card>
      <p className="mt-3 px-0.5 text-[10.5px] font-semibold">Recent changes</p>
      <Card className="mt-1.5 overflow-hidden">
        <Row>
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-medium">&quot;Add to cart&quot; button missing</span>
            <span className="font-mono text-[8.5px] text-[#6B6B60]">/shop/beans</span>
          </span>
          <SevBadge level="Critical" />
        </Row>
        <Row>
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-medium">Canonical URL changed</span>
            <span className="font-mono text-[8.5px] text-[#6B6B60]">/pricing</span>
          </span>
          <SevBadge level="High" />
        </Row>
        <Row>
          <span className="min-w-0">
            <span className="block truncate text-[10.5px] font-medium">Title tag changed</span>
            <span className="font-mono text-[8.5px] text-[#6B6B60]">/</span>
          </span>
          <SevBadge level="Medium" />
        </Row>
      </Card>
    </>
  );
}

function WebsitesScreen() {
  const sites = [
    { name: "Northwind Coffee", host: "northwind.example", dot: "#e5484d", open: 2, scan: "12m ago" },
    { name: "Acme Studio", host: "acme.example", dot: "#16a34a", open: 0, scan: "1h ago" },
    { name: "Lumen Docs", host: "docs.lumen.example", dot: "#f97316", open: 1, scan: "3h ago" },
    { name: "Harbor Dental", host: "harbor.example", dot: "#16a34a", open: 0, scan: "5h ago" },
  ];
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] text-[#6B6B60]">4 websites</p>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#151515] bg-[#FFD400] px-2 py-0.5 text-[9.5px] font-semibold">
          <Plus className="size-2.5" /> Add
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {sites.map((s) => (
          <Card key={s.name} className="px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: s.dot }} />
                <span className="truncate text-[11px] font-semibold">{s.name}</span>
              </span>
              {s.open > 0 ? (
                <span className="rounded-full bg-[#151515] px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-[#FFD400]">
                  {s.open} open
                </span>
              ) : (
                <Check className="size-3.5 text-[#16a34a]" />
              )}
            </div>
            <p className="mt-0.5 flex justify-between font-mono text-[8.5px] text-[#6B6B60]">
              <span className="truncate">{s.host}</span>
              <span className="shrink-0">scanned {s.scan}</span>
            </p>
          </Card>
        ))}
      </div>
    </>
  );
}

function ChangesScreen() {
  return (
    <>
      <div className="flex gap-1.5">
        <span className="rounded-full bg-[#151515] px-2.5 py-1 text-[9.5px] font-semibold text-white">Open</span>
        <span className="rounded-full border border-black/15 bg-white px-2.5 py-1 text-[9.5px] font-medium">Any severity</span>
        <span className="rounded-full border border-black/15 bg-white px-2.5 py-1 text-[9.5px] font-medium">Any type</span>
      </div>
      <Card className="mt-2.5 p-3">
        <div className="flex items-center justify-between gap-2">
          <SevBadge level="Critical" />
          <span className="font-mono text-[8.5px] text-[#6B6B60]">Conversion · 4m</span>
        </div>
        <p className="mt-1.5 text-[11.5px] font-semibold leading-snug">&quot;Add to cart&quot; button is missing</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-black/10 bg-[#FBFAF3] p-1.5">
            <p className="text-[8px] font-semibold text-[#B4232A]">Before</p>
            <p className="font-mono text-[9px]">Add to cart</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-[#FBFAF3] p-1.5">
            <p className="text-[8px] font-semibold text-[#15803d]">Now</p>
            <p className="font-mono text-[9px] italic text-[#6B6B60]">(empty)</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          <span className="rounded-full border border-[#151515] bg-[#FFD400] px-2 py-1 text-[9px] font-semibold">Approve & update baseline</span>
          <span className="rounded-full border border-black/15 px-2 py-1 text-[9px] font-medium">Resolve</span>
          <span className="rounded-full border border-black/15 px-2 py-1 text-[9px] font-medium">Ignore</span>
        </div>
      </Card>
      <Card className="mt-2 overflow-hidden">
        <Row>
          <span className="truncate text-[10.5px] font-medium">Canonical URL changed</span>
          <SevBadge level="High" />
        </Row>
        <Row>
          <span className="truncate text-[10.5px] font-medium">3 internal links broke</span>
          <SevBadge level="High" />
        </Row>
      </Card>
    </>
  );
}

function ScansScreen() {
  const scans = [
    { kind: "Manual", status: "Running", pages: "8 / 12 pages", tone: "#FFD400", live: true },
    { kind: "Scheduled", status: "2 changes", pages: "12 pages · 1m 48s", tone: "#f97316", live: false },
    { kind: "Scheduled", status: "No changes", pages: "12 pages · 1m 52s", tone: "#16a34a", live: false },
    { kind: "Baseline", status: "Approved", pages: "12 pages · 2m 10s", tone: "#151515", live: false },
  ];
  return (
    <div className="space-y-2">
      {scans.map((s, i) => (
        <Card key={i} className="px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold">
              {s.live ? (
                <RefreshCw className="size-3 animate-spin text-[#151515] motion-reduce:animate-none" />
              ) : (
                <span className="size-2 rounded-full" style={{ background: s.tone }} />
              )}
              {s.kind}
            </span>
            <span className="font-mono text-[9px] font-semibold">{s.status}</span>
          </div>
          <p className="mt-0.5 font-mono text-[8.5px] text-[#6B6B60]">{s.pages}</p>
          {s.live && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/10">
              <div className="h-full w-2/3 rounded-full bg-[#FFD400]" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`flex h-4 w-7 items-center rounded-full p-0.5 ${on ? "justify-end bg-[#151515]" : "bg-black/15"}`}>
      <span className={`size-3 rounded-full ${on ? "bg-[#FFD400]" : "bg-white"}`} />
    </span>
  );
}

function SettingsScreen() {
  return (
    <>
      <Card className="p-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold">
            <Bell className="size-3.5" /> Push alerts
          </span>
          <Toggle on />
        </div>
        <p className="mt-1 text-[9.5px] leading-4 text-[#6B6B60]">
          Critical and high-severity changes are pushed to this device as soon as a scan finds them.
        </p>
        <span className="mt-2 inline-flex rounded-full border border-black/15 px-2 py-0.5 text-[9px] font-medium">
          Send a test notification
        </span>
      </Card>
      <Card className="mt-2 p-3">
        <p className="text-[11px] font-semibold">Appearance</p>
        <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-full bg-[#F3F1E6] p-0.5 text-center text-[9px] font-medium">
          <span className="rounded-full py-1">System</span>
          <span className="rounded-full py-1">Light</span>
          <span className="rounded-full bg-[#151515] py-1 text-white">Dark</span>
        </div>
      </Card>
      <Card className="mt-2 overflow-hidden">
        <Row>
          <span className="text-[10.5px] font-medium">Two-factor authentication</span>
          <span className="font-mono text-[9px] font-semibold text-[#15803d]">On</span>
        </Row>
        <Row>
          <span className="text-[10.5px] font-medium">Plan</span>
          <span className="font-mono text-[9px] font-semibold">Pro</span>
        </Row>
      </Card>
    </>
  );
}

const SCREENS: Record<TabKey, () => ReactNode> = {
  overview: OverviewScreen,
  websites: WebsitesScreen,
  changes: ChangesScreen,
  scans: ScansScreen,
  settings: SettingsScreen,
};

function Phone({ active }: { active: TabKey }) {
  const Screen = SCREENS[active];
  const tab = TABS.find((t) => t.key === active) ?? TABS[0];
  return (
    <div className="relative mx-auto w-[272px] shrink-0 sm:w-[300px]">
      <div aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgba(255,212,0,0.35),transparent)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2.6rem] border-[3px] border-[#151515] bg-[#FBFAF3] shadow-[10px_10px_0_#FFD400,10px_10px_0_2px_#151515]">
        <div className="flex items-center justify-between px-6 pt-3">
          <span className="font-mono text-[10px] font-semibold">9:41</span>
          <span className="size-2.5 rounded-full bg-[#151515]" />
          <span className="font-mono text-[10px] text-[#6B6B60]">5G</span>
        </div>
        <div className="h-[470px] px-3.5 pb-20 pt-3 sm:h-[500px]">
          <p className="px-0.5 text-[17px] font-semibold tracking-tight">{tab.label}</p>
          <div key={active} className="mt-2.5 motion-safe:animate-[android-screen_380ms_ease-out]">
            <Screen />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center">
          <div className="flex items-center gap-1 rounded-full bg-[#151515] p-1.5 shadow-lg">
            {TABS.map((t) => (
              <span
                key={t.key}
                className={`flex size-8 items-center justify-center rounded-full transition-colors ${
                  t.key === active ? "bg-[#FFD400] text-[#151515]" : "text-[#9C9E93]"
                }`}
              >
                <t.icon className="size-3.5" aria-hidden />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AndroidTabsShowcase() {
  const [active, setActive] = useState<TabKey>("overview");
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (pinned) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setActive((cur) => {
        const i = TABS.findIndex((t) => t.key === cur);
        return TABS[(i + 1) % TABS.length].key;
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, [pinned]);

  return (
    <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-20">
      <style>{`@keyframes android-screen { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }`}</style>
      <div role="tablist" aria-label="Tabs in the MyKavo Android app" className="space-y-2">
        {TABS.map((t, i) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setActive(t.key);
                setPinned(true);
              }}
              className={`group flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition-all sm:px-5 ${
                on
                  ? "border-[#151515] bg-white shadow-[5px_5px_0_#151515]"
                  : "border-transparent hover:border-black/10 hover:bg-white/60"
              }`}
            >
              <span
                className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  on ? "border-[#151515] bg-[#FFD400]" : "border-black/10 bg-[#F3F1E6]"
                }`}
              >
                <t.icon className="size-4.5 text-[#151515]" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[10px] font-semibold text-[#6B6B60]">0{i + 1}</span>
                  <span className="text-[16px] font-semibold text-[#151515]">{t.label}</span>
                  <span className="hidden text-[14px] text-[#6B6B60] sm:inline">- {t.title}</span>
                </span>
                <span
                  className={`mt-1 block text-[14px] leading-6 text-[#6B6B60] ${on ? "" : "hidden lg:line-clamp-1 lg:block"}`}
                >
                  {t.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" aria-label={`${TABS.find((t) => t.key === active)?.label} tab`}>
        <Phone active={active} />
      </div>
    </div>
  );
}
