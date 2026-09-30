/**
 * AI crawlers: who they are, and whether a robots.txt lets them in.
 *
 * Shared by the change monitor (alert when a site starts blocking them), the
 * Site Audit (an "AI search" check) and mykavo.app's own robots.txt, so all
 * three agree on the same list and the same reading of robots.txt.
 *
 * A site that blocks these crawlers stops being read - and so stops being
 * cited - by ChatGPT, Claude, Perplexity and Google's AI features. It
 * usually happens by accident: a security plugin, a CDN "block AI bots"
 * toggle, or a theme update rewriting robots.txt.
 */

export type AiCrawlerPurpose =
  /** Builds the index an AI answer engine searches - blocking it removes you from answers. */
  | "search"
  /** Fetches a page because a person asked the assistant to - blocking it breaks "read this link". */
  | "user"
  /** Collects training data - blocking it is often a deliberate choice. */
  | "training";

export interface AiCrawler {
  /** The robots.txt user-agent token. */
  agent: string;
  /** Who runs it and what for, for alert copy. */
  owner: string;
  purpose: AiCrawlerPurpose;
}

export const AI_CRAWLERS: readonly AiCrawler[] = [
  { agent: "OAI-SearchBot", owner: "ChatGPT search", purpose: "search" },
  { agent: "ChatGPT-User", owner: "ChatGPT", purpose: "user" },
  { agent: "GPTBot", owner: "OpenAI", purpose: "training" },
  { agent: "Claude-SearchBot", owner: "Claude search", purpose: "search" },
  { agent: "Claude-User", owner: "Claude", purpose: "user" },
  { agent: "ClaudeBot", owner: "Anthropic", purpose: "training" },
  { agent: "PerplexityBot", owner: "Perplexity", purpose: "search" },
  { agent: "Perplexity-User", owner: "Perplexity", purpose: "user" },
  { agent: "Google-Extended", owner: "Google Gemini", purpose: "training" },
  { agent: "Applebot-Extended", owner: "Apple Intelligence", purpose: "training" },
  { agent: "Amazonbot", owner: "Amazon", purpose: "search" },
  { agent: "DuckAssistBot", owner: "DuckDuckGo", purpose: "search" },
  { agent: "Meta-ExternalAgent", owner: "Meta AI", purpose: "training" },
  { agent: "MistralAI-User", owner: "Mistral", purpose: "user" },
  { agent: "CCBot", owner: "Common Crawl", purpose: "training" },
];

/**
 * The crawlers whose blocking removes a site from AI answers people see
 * today, plus the two best-known training bots, which owners also expect to
 * hear about. These decide the alert's severity.
 */
export const HIGH_IMPACT_AI_AGENTS = new Set([
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
]);

/**
 * AI crawlers the WordPress plugin counts visits from, by the token each one
 * sends in its User-Agent header. Differs from AI_CRAWLERS: Google-Extended
 * and Applebot-Extended are robots.txt tokens only (those companies crawl as
 * Googlebot and Applebot), and Bytespider identifies itself but has no
 * robots.txt opt-out worth alerting on.
 */
export const AI_VISIT_AGENTS: readonly AiCrawler[] = [
  { agent: "OAI-SearchBot", owner: "ChatGPT search", purpose: "search" },
  { agent: "ChatGPT-User", owner: "ChatGPT", purpose: "user" },
  { agent: "GPTBot", owner: "OpenAI", purpose: "training" },
  { agent: "Claude-SearchBot", owner: "Claude search", purpose: "search" },
  { agent: "Claude-User", owner: "Claude", purpose: "user" },
  { agent: "ClaudeBot", owner: "Anthropic", purpose: "training" },
  { agent: "PerplexityBot", owner: "Perplexity", purpose: "search" },
  { agent: "Perplexity-User", owner: "Perplexity", purpose: "user" },
  { agent: "Amazonbot", owner: "Amazon", purpose: "search" },
  { agent: "DuckAssistBot", owner: "DuckDuckGo", purpose: "search" },
  { agent: "Meta-ExternalAgent", owner: "Meta AI", purpose: "training" },
  { agent: "MistralAI-User", owner: "Mistral", purpose: "user" },
  { agent: "CCBot", owner: "Common Crawl", purpose: "training" },
  { agent: "Bytespider", owner: "ByteDance", purpose: "training" },
];

/** The canonical AI_VISIT_AGENTS entry for a name, case-insensitively. */
export function aiVisitAgent(name: string): AiCrawler | undefined {
  const lower = name.toLowerCase();
  return AI_VISIT_AGENTS.find((c) => c.agent.toLowerCase() === lower);
}

interface Group {
  agents: string[];
  rules: Array<{ allow: boolean; path: string }>;
}

function parseGroups(content: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (field === "user-agent") {
      // Consecutive User-agent lines share one group (RFC 9309).
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (field === "allow" || field === "disallow") {
      current.rules.push({ allow: field === "allow", path: value });
    }
  }
  return groups;
}

/** Does a robots.txt path pattern match the site root "/"? */
function matchesRoot(pattern: string): boolean {
  if (pattern === "") return false; // "Disallow:" with no value allows everything
  const p = pattern.endsWith("$") ? pattern.slice(0, -1) : pattern;
  // "/", "/*", "*" all cover the root; "/$" is exactly the root.
  return p === "/" || p === "/*" || p === "*" || p === "";
}

/**
 * Whether robots.txt blocks `agent` from the whole site - i.e. the home page
 * "/" is disallowed. The agent's own group(s) apply if any exist, otherwise
 * the `*` group(s), per RFC 9309; within them the longest matching rule
 * wins and Allow wins a tie. Conservative on purpose: a crawler that is only
 * kept out of some folders is NOT reported as blocked.
 */
export function robotsBlocksAgent(content: string, agent: string): boolean {
  const token = agent.toLowerCase();
  const groups = parseGroups(content);
  const own = groups.filter((g) => g.agents.includes(token));
  const applicable = own.length > 0 ? own : groups.filter((g) => g.agents.includes("*"));
  let best: { allow: boolean; length: number } | null = null;
  for (const g of applicable) {
    for (const r of g.rules) {
      if (!matchesRoot(r.path)) continue;
      const length = r.path.length;
      if (!best || length > best.length || (length === best.length && r.allow)) {
        best = { allow: r.allow, length };
      }
    }
  }
  return best !== null && !best.allow;
}

/** The AI crawlers a robots.txt blocks from the whole site, in AI_CRAWLERS order. */
export function blockedAiCrawlers(content: string | null): AiCrawler[] {
  if (!content) return []; // no robots.txt: everything is allowed
  return AI_CRAWLERS.filter((c) => robotsBlocksAgent(content, c.agent));
}
