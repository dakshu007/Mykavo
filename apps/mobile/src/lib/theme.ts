/**
 * MyKavo mobile design tokens.
 *
 * Direct port of the dashboard `--fx-*` CSS variables in
 * apps/web/src/app/globals.css (the authoritative source). If a value changes
 * there, change it here. The landing "v4 bright gold" palette (login screens)
 * is ported from apps/web/src/components/landing/style.ts and is identical in
 * light and dark, exactly like the marketing site.
 */

export type ThemeName = "light" | "dark";

export interface FxPalette {
  canvas: string;
  surface: string;
  card: string;
  ink: string;
  inkSecondary: string;
  inkFaint: string;
  inkInverse: string;
  inkHover: string;
  line: string;
  panel: string;
  primary: string;
  primaryHover: string;
  primarySoft: string;
  primaryContrast: string;
  success: string;
  successSoft: string;
  successStrong: string;
  warning: string;
  warningSoft: string;
  warningStrong: string;
  orange: string;
  orangeSoft: string;
  orangeStrong: string;
  critical: string;
  criticalSoft: string;
  criticalStrong: string;
  info: string;
  infoSoft: string;
  chartAmber: string;
  chartViolet: string;
  /** [start, mid, end] stops of the coral stat-tile gradient (135deg on web). */
  gradientCoral: [string, string, string];
  /** [start, mid, end] stops of the mint stat-tile gradient (135deg on web). */
  gradientMint: [string, string, string];
}

export const lightPalette: FxPalette = {
  canvas: "#eceef4",
  surface: "#f6f7fb",
  card: "#ffffff",
  ink: "#16181d",
  inkSecondary: "#5c6270",
  inkFaint: "#9aa1b1",
  inkInverse: "#ffffff",
  inkHover: "#000000",
  line: "#e4e7ee",
  panel: "#16181d",
  primary: "#3556f4",
  primaryHover: "#2a46d6",
  primarySoft: "#e8ecfe",
  primaryContrast: "#ffffff",
  success: "#16a34a",
  successSoft: "#e5f6ec",
  successStrong: "#147a3a",
  warning: "#f59e0b",
  warningSoft: "#fdf3e0",
  warningStrong: "#b45309",
  orange: "#f97316",
  orangeSoft: "#feeee2",
  orangeStrong: "#c2410c",
  critical: "#e5484d",
  criticalSoft: "#fdeaeb",
  criticalStrong: "#b91c1c",
  info: "#666c7a",
  infoSoft: "#eef0f3",
  chartAmber: "#d97706",
  chartViolet: "#7c3aed",
  gradientCoral: ["#fde5d8", "#e9d5f2", "#fbc7b6"],
  gradientMint: ["#d8f4ee", "#bfeef2", "#8fd8ee"],
};

export const darkPalette: FxPalette = {
  canvas: "#0e1015",
  surface: "#14171d",
  card: "#191d24",
  ink: "#e9ecf2",
  inkSecondary: "#a8b0c0",
  inkFaint: "#7d8596",
  inkInverse: "#10131a",
  inkHover: "#ffffff",
  line: "#262b35",
  panel: "#16181d",
  primary: "#7c92fa",
  primaryHover: "#93a5fb",
  primarySoft: "#1c2547",
  primaryContrast: "#0a0e1a",
  success: "#34c979",
  successSoft: "#122b1d",
  successStrong: "#5fd695",
  warning: "#f5a623",
  warningSoft: "#2e2410",
  warningStrong: "#f0b750",
  orange: "#fb8b47",
  orangeSoft: "#33200f",
  orangeStrong: "#ffa06b",
  critical: "#f16a6f",
  criticalSoft: "#371b1e",
  criticalStrong: "#ff9298",
  info: "#9aa3b2",
  infoSoft: "#232833",
  chartAmber: "#f0b750",
  chartViolet: "#a78bfa",
  gradientCoral: ["#39262c", "#2e2542", "#3d2823"],
  gradientMint: ["#12302c", "#123039", "#123a4d"],
};

/** Landing v4 "bright gold" palette - fixed, never theme-dependent. */
export const gold = {
  canvas: "#FBFAF3",
  paper: "#F3F1E6",
  elevated: "#FFFFFF",
  ink: "#151515",
  gold: "#FFD400",
  goldSoft: "#FFF3B0",
  dim: "#6B6B60",
  boneSoft: "#E9EBDF",
  dimOnDark: "#9C9E93",
} as const;

/** Radii from the web @theme block. */
export const radius = {
  card: 24,
  tile: 16,
  field: 12,
  pill: 9999,
} as const;

/**
 * Font families registered in app/_layout.tsx via useFonts.
 * Body = DM Sans (the site's font for everyone without Google Sans installed),
 * headings = Poppins (site-wide h1/h2 rule), mono = Geist Mono (URLs, hashes,
 * HTTP statuses - "precise/technical" data).
 */
export const fonts = {
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
  heading: "Poppins_500Medium",
  headingSemiBold: "Poppins_600SemiBold",
  mono: "GeistMono_400Regular",
  monoMedium: "GeistMono_500Medium",
} as const;

/** Type scale (web docs/DESIGN_SYSTEM.md, adapted for handset). */
export const type = {
  h1: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.heading, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.headingSemiBold, fontSize: 17, lineHeight: 24 },
  cardTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.9 },
  badge: { fontFamily: fonts.bodySemiBold, fontSize: 12, lineHeight: 16 },
  chip: { fontFamily: fonts.bodySemiBold, fontSize: 11, lineHeight: 14 },
  status: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
} as const;

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WebsiteStatus = "PENDING" | "DISCOVERING" | "BASELINING" | "ACTIVE" | "PAUSED" | "ERROR";
export type ScanStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED";
export type ChangeStatus = "NEW" | "REVIEWED" | "APPROVED" | "RESOLVED" | "IGNORED";
export type ChangeCategory =
  | "AVAILABILITY"
  | "VISUAL"
  | "SEO"
  | "CONTENT"
  | "LINKS"
  | "SCRIPT"
  | "PERFORMANCE"
  | "CONVERSION";

/** SeverityBadge colors: chip background / text / dot (mirrors ui/badge.tsx). */
export function severityColors(p: FxPalette, severity: Severity): { bg: string; text: string; dot: string; label: string } {
  switch (severity) {
    case "CRITICAL":
      return { bg: p.criticalSoft, text: p.criticalStrong, dot: p.critical, label: "Critical" };
    case "HIGH":
      return { bg: p.orangeSoft, text: p.orangeStrong, dot: p.orange, label: "High" };
    case "MEDIUM":
      return { bg: p.warningSoft, text: p.warningStrong, dot: p.warning, label: "Medium" };
    case "LOW":
      return { bg: p.primarySoft, text: p.primary, dot: p.primary, label: "Low" };
    case "INFO":
      return { bg: p.infoSoft, text: p.info, dot: p.info, label: "Info" };
  }
}

/** WebsiteStatusBadge: dot + colored text, no chip background. */
export function websiteStatusColors(p: FxPalette, status: WebsiteStatus): { dot: string; text: string; label: string } {
  switch (status) {
    case "PENDING":
      return { dot: p.primary, text: p.primary, label: "Ready to baseline" };
    case "DISCOVERING":
      return { dot: p.warning, text: p.warningStrong, label: "Discovering" };
    case "BASELINING":
      return { dot: p.warning, text: p.warningStrong, label: "Baselining" };
    case "ACTIVE":
      return { dot: p.success, text: p.successStrong, label: "Monitoring" };
    case "PAUSED":
      return { dot: p.inkFaint, text: p.inkFaint, label: "Paused" };
    case "ERROR":
      return { dot: p.critical, text: p.criticalStrong, label: "Error" };
  }
}

/** ScanStatusBadge: filled chip, no dot. */
export function scanStatusColors(p: FxPalette, status: ScanStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case "QUEUED":
      return { bg: p.infoSoft, text: p.info, label: "Queued" };
    case "RUNNING":
      return { bg: p.primarySoft, text: p.primary, label: "Running" };
    case "COMPLETED":
      return { bg: p.successSoft, text: p.successStrong, label: "Completed" };
    case "PARTIAL":
      return { bg: p.warningSoft, text: p.warningStrong, label: "Partial" };
    case "FAILED":
      return { bg: p.criticalSoft, text: p.criticalStrong, label: "Failed" };
  }
}

/** ChangeStatusBadge: small filled chip, no dot. */
export function changeStatusColors(p: FxPalette, status: ChangeStatus): { bg: string; text: string; label: string } {
  switch (status) {
    case "NEW":
      return { bg: p.primarySoft, text: p.primary, label: "New" };
    case "REVIEWED":
      return { bg: p.infoSoft, text: p.info, label: "Reviewed" };
    case "APPROVED":
      return { bg: p.successSoft, text: p.successStrong, label: "Approved" };
    case "RESOLVED":
      return { bg: p.successSoft, text: p.successStrong, label: "Resolved" };
    case "IGNORED":
      return { bg: p.infoSoft, text: p.inkFaint, label: "Ignored" };
  }
}

export const categoryLabels: Record<ChangeCategory, string> = {
  AVAILABILITY: "Availability",
  VISUAL: "Visual",
  SEO: "SEO",
  CONTENT: "Content",
  LINKS: "Links",
  SCRIPT: "Scripts",
  PERFORMANCE: "Performance",
  CONVERSION: "Conversion",
};

/** Card shadow (approximation of --fx-shadow-card for native surfaces). */
export function cardShadow(theme: ThemeName) {
  return {
    shadowColor: "#000000",
    shadowOpacity: theme === "dark" ? 0.4 : 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  } as const;
}
