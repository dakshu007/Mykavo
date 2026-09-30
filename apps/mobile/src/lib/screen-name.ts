/**
 * The name a screen is reported under for MyKavo's own usage tracking
 * (which screens people use - never what is on them). Null for screens not
 * worth reporting, such as the sign-in screen.
 */
const EXACT: Record<string, string> = {
  "/": "Overview",
  "/websites": "Websites",
  "/changes": "Changes",
  "/scans": "Scans",
  "/usage": "Usage",
  "/settings": "Settings",
  "/website/new": "Add website",
  "/app-requests": "App requests",
  "/blog": "Blog",
  "/search-console": "Search Console",
  "/users": "Users",
  "/licenses": "Licenses",
};

const PREFIX: [string, string][] = [
  ["/website/", "Website detail"],
  ["/change/", "Change detail"],
  ["/scan/", "Scan detail"],
];

export function screenName(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  if (path === "/login") return null;
  if (EXACT[path]) return EXACT[path];
  for (const [prefix, name] of PREFIX) if (path.startsWith(prefix)) return name;
  return null;
}
