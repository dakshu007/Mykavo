/**
 * robots.txt parsing and matching for the free tools, following Google's
 * documented rules (RFC 9309 plus Google's extensions):
 *
 *  - Records are groups of one or more `User-agent` lines followed by rules.
 *    Groups naming the same agent are merged.
 *  - A crawler obeys the group(s) naming its own product token exactly
 *    (case-insensitive; "Googlebot-Image" is not "Googlebot"); if none does it
 *    obeys `*`. If there is no `*` group either, everything is allowed.
 *  - Within the chosen group the rule with the LONGEST matching path wins;
 *    on a tie between allow and disallow, allow wins.
 *  - `*` matches any run of characters, a trailing `$` anchors the end.
 *  - An empty `Disallow:` allows everything (it is not a rule).
 *
 * Pure functions only - fetching lives in the API routes.
 */

export interface RobotsRule {
  type: "allow" | "disallow";
  path: string;
  /** 1-based line number in the original file, for highlighting. */
  line: number;
}

export interface RobotsGroup {
  agents: string[];
  rules: RobotsRule[];
}

export interface ParsedRobots {
  groups: RobotsGroup[];
  sitemaps: string[];
}

export function parseRobotsTxt(text: string): ParsedRobots {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];
  let current: RobotsGroup | null = null;
  let lastWasAgent = false;

  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) return;
    const colon = line.indexOf(":");
    if (colon === -1) return;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      if (value) current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      return;
    }
    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      return; // sitemap lines don't belong to a group
    }
    lastWasAgent = false;
    if ((field === "allow" || field === "disallow") && current) {
      if (value === "") return; // "Disallow:" with no path is not a rule
      current.rules.push({ type: field, path: value, line: index + 1 });
    }
  });

  return { groups, sitemaps };
}

/**
 * The rules a crawler obeys: every group naming its token (merged), else the
 * `*` groups, else none. `matchedAgent` says which token was used, or null
 * when nothing applies.
 */
export function rulesForAgent(
  parsed: ParsedRobots,
  userAgent: string,
): { matchedAgent: string | null; rules: RobotsRule[] } {
  const ua = userAgent.toLowerCase();
  const named = parsed.groups.some((g) => g.agents.includes(ua));
  const token = named ? ua : parsed.groups.some((g) => g.agents.includes("*")) ? "*" : null;
  if (!token) return { matchedAgent: null, rules: [] };
  const rules = parsed.groups.filter((g) => g.agents.includes(token)).flatMap((g) => g.rules);
  return { matchedAgent: token, rules };
}

/** Does a robots.txt path pattern match this path (path + query)? */
export function patternMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const regex = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${regex}${anchored ? "$" : ""}`).test(path);
}

export interface RobotsVerdict {
  allowed: boolean;
  /** The rule that decided it, or null when no rule matched (allowed). */
  rule: RobotsRule | null;
  matchedAgent: string | null;
}

/** Is `path` (pathname + search) allowed for `userAgent`? */
export function isAllowed(parsed: ParsedRobots, userAgent: string, path: string): RobotsVerdict {
  const { matchedAgent, rules } = rulesForAgent(parsed, userAgent);
  let winner: RobotsRule | null = null;
  for (const rule of rules) {
    if (!patternMatches(rule.path, path)) continue;
    if (
      !winner ||
      rule.path.length > winner.path.length ||
      (rule.path.length === winner.path.length && rule.type === "allow")
    ) {
      winner = rule;
    }
  }
  return { allowed: !winner || winner.type === "allow", rule: winner, matchedAgent };
}

/** The path robots.txt rules are matched against: pathname plus query. */
export function robotsPath(url: URL): string {
  return `${url.pathname || "/"}${url.search}`;
}

/** Where a page's robots.txt lives. */
export function robotsTxtUrl(url: URL): string {
  return `${url.origin}/robots.txt`;
}

/**
 * What a robots.txt HTTP status means for crawling, per Google:
 * 2xx - obey the file; 4xx - no restrictions; 5xx - treat as fully
 * disallowed until it recovers.
 */
export function robotsStatusEffect(status: number): "parse" | "allow-all" | "disallow-all" {
  if (status >= 200 && status < 300) return "parse";
  if (status >= 500) return "disallow-all";
  return "allow-all";
}

/** Crawlers the robots.txt tester reports on, with the token each obeys. */
export const ROBOTS_TEST_AGENTS = [
  { token: "Googlebot", label: "Googlebot", owner: "Google Search" },
  { token: "Bingbot", label: "Bingbot", owner: "Bing" },
  { token: "GPTBot", label: "GPTBot", owner: "OpenAI" },
  { token: "ClaudeBot", label: "ClaudeBot", owner: "Anthropic" },
  { token: "PerplexityBot", label: "PerplexityBot", owner: "Perplexity" },
  { token: "CCBot", label: "CCBot", owner: "Common Crawl" },
] as const;

/** What the Robots.txt Tester API returns. */
export interface RobotsTxtReport {
  testedUrl: string;
  robotsUrl: string;
  httpStatus: number;
  effect: "parse" | "allow-all" | "disallow-all";
  results: Array<{
    agent: string;
    owner: string;
    allowed: boolean;
    rule: string | null;
    line: number | null;
    group: string | null;
  }>;
  sitemaps: string[];
  warnings: string[];
  lines: string[];
  truncated: boolean;
}
