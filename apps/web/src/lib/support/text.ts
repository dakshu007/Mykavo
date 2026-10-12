/**
 * Text handling for the support assistant: turn a question into the terms the
 * matcher compares. Deterministic and dependency-free so it runs the same in
 * the route, in tests and in the accuracy eval.
 *
 * Pipeline: lowercase → phrase synonyms ("wp" → "wordpress", "sign in" →
 * "login") → split → drop stopwords → light stemming. Stemming is crude on
 * purpose: it only needs to map "scans", "scanning" and "scanned" to one term,
 * not to be linguistically right.
 */

/**
 * Phrase rewrites applied before tokenizing, longest first. Each maps the
 * different ways people say one thing to the words the knowledge base uses.
 * Keys are matched on word boundaries.
 */
const PHRASES: [string, string][] = [
  // Products and platforms
  ["word press", "wordpress"],
  ["wp admin", "wordpress admin"],
  ["wp-admin", "wordpress admin"],
  ["wp", "wordpress"],
  ["woo commerce", "woocommerce"],
  ["woo", "woocommerce"],
  ["shopify store", "shopify"],
  ["chrome extension", "extension"],
  ["browser extension", "extension"],
  ["chrome addon", "extension"],
  ["chrome add on", "extension"],
  ["add-on", "extension"],
  ["addon", "extension"],
  ["plug in", "plugin"],
  ["plug-in", "plugin"],
  ["android app", "android"],
  ["mobile app", "android"],
  ["phone app", "android"],
  ["iphone", "ios"],
  ["search console", "searchconsole"],
  ["gsc", "searchconsole"],
  ["google analytics", "analytics"],
  ["ga4", "analytics"],
  ["tag manager", "gtm"],
  ["claude code", "claude"],
  ["claude desktop", "claude"],
  ["chatgpt", "chatgpt"],
  ["model context protocol", "mcp"],
  ["web hook", "webhook"],
  ["web-hook", "webhook"],
  ["ms teams", "teams"],
  ["microsoft teams", "teams"],
  // Account
  ["sign in", "login"],
  ["sign-in", "login"],
  ["signin", "login"],
  ["log in", "login"],
  ["log-in", "login"],
  ["logon", "login"],
  ["sign up", "signup"],
  ["sign-up", "signup"],
  ["create an account", "signup"],
  ["open an account", "signup"],
  ["open a mykavo account", "signup"],
  ["make an account", "signup"],
  ["new account", "signup"],
  ["get started", "signup"],
  ["sign in with google", "googlelogin"],
  ["log in with google", "googlelogin"],
  ["login with google", "googlelogin"],
  ["continue with google", "googlelogin"],
  ["google account", "googlelogin"],
  ["google login", "googlelogin"],
  ["google sign in", "googlelogin"],
  ["through google", "googlelogin"],
  ["use google", "googlelogin"],
  ["one-time code", "twofactor"],
  ["one time code", "twofactor"],
  ["2-step", "twofactor"],
  ["two step", "twofactor"],
  ["two-step", "twofactor"],
  ["profile picture", "avatar"],
  ["profile photo", "avatar"],
  ["how long", "duration"],
  ["how many", "limit"],
  ["runs out", "expire"],
  ["run out", "expire"],
  ["running out", "expire"],
  ["status page", "statuspage"],
  ["status badge", "statuspage"],
  ["uptime badge", "statuspage"],
  ["known good", "baseline"],
  ["measured against", "baseline"],
  ["compared against", "baseline"],
  ["kick off", "start"],
  ["right away", "manual"],
  ["straight away", "manual"],
  ["look back", "history"],
  ["report a bug", "bug"],
  ["acting weird", "bug"],
  ["acting up", "bug"],
  ["home page", "homepage"],
  ["front page", "homepage"],
  ["page builder", "pagebuilder"],
  ["command line", "wpcli"],
  ["wp-cli", "wpcli"],
  ["wp cli", "wpcli"],
  ["tracking code", "analytics script"],
  ["tracking script", "analytics script"],
  ["rich results", "schema"],
  ["structured data", "schema"],
  ["json-ld", "schema"],
  ["out of search", "noindex"],
  ["out of google", "noindex"],
  ["no cost", "free"],
  ["no-cost", "free"],
  ["zero cost", "free"],
  ["without paying", "free"],
  ["for free", "free"],
  ["move up", "upgrade"],
  ["go up", "upgrade"],
  ["step up", "upgrade"],
  ["move down", "downgrade"],
  ["step down", "downgrade"],
  ["go down", "downgrade"],
  ["third party", "thirdparty"],
  ["third-party", "thirdparty"],
  ["e-mandate", "mandate"],
  ["auto pay", "mandate"],
  ["auto-pay", "mandate"],
  ["autopay", "mandate"],
  ["built by", "founder"],
  ["who made", "founder"],
  ["who built", "founder"],
  ["who runs", "founder"],
  ["who owns", "founder"],
  ["who is behind", "founder"],
  ["safe updates", "safeupdates"],
  ["safe update", "safeupdates"],
  ["update history", "updatehistory"],
  ["create account", "signup"],
  ["log out", "logout"],
  ["sign out", "logout"],
  ["e-mail", "email"],
  ["e mail", "email"],
  ["mail", "email"],
  ["pass word", "password"],
  ["pwd", "password"],
  ["2fa", "twofactor"],
  ["two factor", "twofactor"],
  ["two-factor", "twofactor"],
  // Billing
  ["credit card", "card"],
  ["debit card", "card"],
  ["money back", "refund"],
  ["pay back", "refund"],
  ["charged twice", "doublecharge"],
  ["double charged", "doublecharge"],
  ["free trial", "trial"],
  ["stop subscription", "cancel subscription"],
  ["stop paying", "cancel subscription"],
  ["end subscription", "cancel subscription"],
  ["how much", "price"],
  ["cost", "price"],
  ["costs", "price"],
  ["pricing", "price"],
  ["prices", "price"],
  ["plans", "plan"],
  ["tier", "plan"],
  ["tiers", "plan"],
  ["upgrade", "upgrade"],
  ["receipt", "invoice"],
  ["receipts", "invoice"],
  ["bill", "invoice"],
  ["gst", "tax"],
  ["vat", "tax"],
  // Monitoring vocabulary
  ["false positive", "falsepositive"],
  ["false positives", "falsepositive"],
  ["false alarm", "falsepositive"],
  ["false alarms", "falsepositive"],
  ["false alert", "falsepositive"],
  ["false alerts", "falsepositive"],
  ["noisy alerts", "falsepositive"],
  ["too noisy", "falsepositive"],
  ["so noisy", "falsepositive"],
  ["alert fatigue", "falsepositive"],
  ["spammy alerts", "falsepositive"],
  ["too many alerts", "falsepositive"],
  ["too many emails", "falsepositive"],
  ["screen shot", "screenshot"],
  ["screen-shot", "screenshot"],
  ["screenshots", "screenshot"],
  ["snap shot", "snapshot"],
  ["base line", "baseline"],
  ["base-line", "baseline"],
  ["web site", "website"],
  ["web-site", "website"],
  ["site", "website"],
  ["sites", "website"],
  ["web page", "page"],
  ["webpage", "page"],
  ["webpages", "page"],
  ["link checker", "brokenlink"],
  ["broken link", "brokenlink"],
  ["broken links", "brokenlink"],
  ["dead link", "brokenlink"],
  ["dead links", "brokenlink"],
  ["404s", "404"],
  ["not found", "404"],
  ["no index", "noindex"],
  ["no-index", "noindex"],
  ["meta description", "metadescription"],
  ["meta title", "title"],
  ["title tag", "title"],
  ["robots.txt", "robotstxt"],
  ["robots txt", "robotstxt"],
  ["site map", "sitemap"],
  ["sitemap.xml", "sitemap"],
  ["css selector", "selector"],
  ["ignore selector", "ignoredselector"],
  ["ignored selector", "ignoredselector"],
  ["ignored selectors", "ignoredselector"],
  ["screenshot mask", "mask"],
  ["screenshot masks", "mask"],
  ["call to action", "cta"],
  ["buy button", "cta"],
  ["signup button", "cta"],
  ["checkout button", "cta"],
  ["add to cart", "cta"],
  ["monitored element", "element"],
  ["monitored elements", "element"],
  ["conversion element", "element"],
  ["conversion elements", "element"],
  ["page speed", "performance"],
  ["pagespeed", "performance"],
  ["load time", "performance"],
  ["slow", "performance"],
  ["slower", "performance"],
  ["speed", "performance"],
  ["up time", "uptime"],
  ["up-time", "uptime"],
  ["down time", "downtime"],
  ["is down", "downtime"],
  ["went down", "downtime"],
  ["went offline", "downtime"],
  ["offline", "downtime"],
  ["white label", "whitelabel"],
  ["white-label", "whitelabel"],
  ["client report", "report"],
  ["client reports", "report"],
  ["team member", "member"],
  ["team members", "member"],
  ["teammate", "member"],
  ["teammates", "member"],
  ["coworker", "member"],
  ["colleague", "member"],
  ["colleagues", "member"],
  ["invite", "invite"],
  ["how often", "frequency"],
  ["how frequently", "frequency"],
  ["every day", "daily"],
  ["each day", "daily"],
  ["once a week", "weekly"],
  ["every week", "weekly"],
  ["every hour", "hourly"],
  ["right now", "manual"],
  ["on demand", "manual"],
  ["on-demand", "manual"],
  ["scan now", "manual scan"],
  ["run a scan", "manual scan"],
  ["rescan", "manual scan"],
  ["re-scan", "manual scan"],
  ["re scan", "manual scan"],
  ["check now", "manual scan"],
  ["delete my account", "delete account"],
  ["remove my account", "delete account"],
  ["close my account", "delete account"],
  ["gdpr", "privacy"],
  ["personal data", "privacy"],
  ["my data", "privacy"],
  ["api key", "apikey"],
  ["api keys", "apikey"],
  ["api token", "apikey"],
  ["access token", "apikey"],
  ["dark mode", "darkmode"],
  ["light mode", "darkmode"],
];

/** Single-word canonical forms, applied after splitting. */
const WORDS: Record<string, string> = {
  monitor: "monitor",
  monitoring: "monitor",
  monitored: "monitor",
  monitors: "monitor",
  watch: "monitor",
  watching: "monitor",
  track: "monitor",
  tracking: "monitor",
  crawl: "scan",
  crawling: "scan",
  crawled: "scan",
  crawler: "scan",
  check: "scan",
  checks: "scan",
  checking: "scan",
  checked: "scan",
  notification: "alert",
  notifications: "alert",
  notify: "alert",
  notified: "alert",
  alerts: "alert",
  alerting: "alert",
  emails: "email",
  emailed: "email",
  remove: "delete",
  removing: "delete",
  erase: "delete",
  deleted: "delete",
  pause: "pause",
  paused: "pause",
  stop: "pause",
  stopped: "pause",
  disable: "pause",
  disabled: "pause",
  turn: "turn",
  broken: "broken",
  broke: "broken",
  breaks: "broken",
  error: "error",
  errors: "error",
  failed: "fail",
  failing: "fail",
  fails: "fail",
  failure: "fail",
  doesnt: "not",
  dont: "not",
  didnt: "not",
  isnt: "not",
  cant: "not",
  cannot: "not",
  wont: "not",
  aren: "not",
  never: "not",
  colleagues: "member",
  users: "member",
  seats: "member",
  seat: "member",
  approve: "approve",
  approved: "approve",
  accept: "approve",
  accepted: "approve",
  expected: "approve",
  diff: "difference",
  differences: "difference",
  compare: "difference",
  comparison: "difference",
  changed: "change",
  changes: "change",
  changing: "change",
  modified: "change",
  edit: "change",
  edited: "change",
  updated: "update",
  updates: "update",
  updating: "update",
  subscription: "subscription",
  subscriptions: "subscription",
  membership: "subscription",
  connect: "connect",
  connected: "connect",
  connecting: "connect",
  connection: "connect",
  install: "install",
  installed: "install",
  installing: "install",
  installation: "install",
  download: "install",
  setup: "setup",
  configure: "setup",
  configuration: "setup",
  settings: "setting",
  preferences: "setting",
  options: "setting",
  frequency: "frequency",
  schedule: "frequency",
  scheduled: "frequency",
  often: "frequency",
  interval: "frequency",
  refund: "refund",
  refunds: "refund",
  refunded: "refund",
  hi: "hello",
  hey: "hello",
  hello: "hello",
};

/**
 * Words that carry no topic. Kept short: "not", "how", "why" and "what"
 * stay because "not working" and "why" questions are real signals.
 */
const STOPWORDS = new Set(
  (
    "a an the and or but if then so to of in on at by for with from into onto about as is are was were be been " +
    "being am do does did doing have has had having i me my mine myself we our ours you your yours he she it its " +
    "they them their this that these those there here can could would should will shall may might must " +
    "please pls plz thanks thank ok okay just really very also any some all much many more most " +
    "get got getting gets want wanted wanna need needed needs like would im ive id youre whats thats " +
    "anyone someone something anything thing things way still even now yet ever again too only " +
    "how what where when which who whom whose why does there use using used possible able " +
    "tell know help question let lets guys sir maam kavo mykavo"
  ).split(" "),
);

const SUFFIXES = ["ations", "ation", "ingly", "ings", "ing", "edly", "ies", "ied", "ed", "ly", "es", "s"];

/** Crude suffix stripping; keeps at least four characters of stem. */
export function stem(word: string): string {
  if (word.length <= 4 || /\d/.test(word)) return word;
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      const base = word.slice(0, -suffix.length);
      if (suffix === "ies" || suffix === "ied") return `${base}y`;
      return base;
    }
  }
  return word;
}

const PHRASE_PATTERNS: [RegExp, string][] = [...PHRASES]
  .sort((a, b) => b[0].length - a[0].length)
  .map(([from, to]) => [new RegExp(`(^|[^a-z0-9])${escape(from)}(?=$|[^a-z0-9])`, "g"), `$1${to}`]);

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&");
}

/** Lowercase, straighten quotes, fold accents and apply phrase synonyms. */
export function normalizeText(input: string): string {
  let text = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    // "don't" → "dont" so the contraction survives tokenizing.
    .replace(/([a-z])'([a-z])/g, "$1$2");
  for (const [pattern, replacement] of PHRASE_PATTERNS) text = text.replace(pattern, replacement);
  return text;
}

/**
 * Concept groups: different words people use for one idea, folded into one
 * token so "snooze", "silence" and "mute" all find the muting answer. Matched
 * on the word and on its stem. Kept to words that mean the same thing in a
 * MyKavo support question; a word with two common meanings stays out.
 */
const CONCEPTS: Record<string, string[]> = {
  password: ["password", "passcode", "credential", "credentials"],
  forgot: ["forgot", "forget", "forgotten", "remember", "recall", "slipped", "recover", "recovery", "reset"],
  signup: ["signup", "join", "joining", "enroll", "enrol", "onboard", "onboarding"],
  delete: ["delete", "erase", "wipe", "destroy", "purge"],
  android: ["android", "phone", "mobile", "pixel", "samsung", "apk", "smartphone", "cellphone", "oneplus"],
  extension: ["extension", "chrome", "browser", "addon"],
  wordpress: ["wordpress", "blog"],
  shop: ["shop", "store", "storefront", "ecommerce", "webshop", "merchant"],
  price: ["price", "pricing", "cost", "expensive", "cheap", "bucks", "dollar", "dollars", "usd", "fee", "fees", "afford"],
  plan: ["plan", "tier", "subscription", "package", "membership", "license", "licence"],
  cancel: ["cancel", "cancellation", "quit", "terminate"],
  refund: ["refund", "reimburse", "reimbursement", "chargeback", "reverse"],
  card: ["card", "visa", "mastercard", "amex"],
  invoice: ["invoice", "receipt", "statement"],
  fail: ["fail", "declined", "decline", "bounced", "refused", "rejected"],
  discount: ["discount", "coupon", "promo", "promotion", "voucher", "deal", "sale", "student", "students", "charity", "nonprofit"],
  member: ["member", "teammate", "colleague", "staff", "employee", "contractor", "collaborator", "seat", "user"],
  alert: ["alert", "alarm", "warn", "warning", "remind", "reminder", "ping"],
  mute: ["mute", "snooze", "silence", "quiet", "suppress", "hush"],
  pause: ["pause", "freeze", "froze", "frozen", "suspend", "hold"],
  resume: ["resume", "unpause", "reenable", "reactivate"],
  scan: ["scan", "crawl", "spider", "inspect", "verify", "verified", "rescan"],
  frequency: ["frequency", "often", "frequently", "regularly", "cadence", "interval", "schedule"],
  history: ["history", "past", "previous", "archive", "earlier", "older"],
  approve: ["approve", "accept", "acknowledge"],
  ignore: ["ignore", "exclude", "skip", "mask"],
  dynamic: ["dynamic", "rotating", "carousel", "slider", "banner", "ads", "advert", "counter", "timestamp", "clock", "random"],
  redirect: ["redirect", "forward", "forwarding", "hop", "hops", "301", "302"],
  ssl: ["ssl", "tls", "https", "certificate", "cert", "padlock"],
  downtime: ["downtime", "outage", "down", "unreachable", "unavailable"],
  ranking: ["ranking", "rankings", "serp", "rank"],
  noindex: ["noindex", "deindexed", "deindex"],
  schema: ["schema", "jsonld"],
  script: ["script", "javascript", "js", "snippet"],
  analytics: ["analytics", "ga", "gtm"],
  performance: ["performance", "speed", "slow", "fast", "faster", "weight", "heavy", "bloat", "bloated", "lighthouse"],
  element: ["element", "cta", "selector"],
  report: ["report", "summary", "pdf", "digest"],
  bug: ["bug", "defect", "glitch", "misbehave", "misbehaving", "weird", "buggy"],
  feature: ["feature", "idea", "suggestion", "improvement", "roadmap", "pitch", "wish"],
  contact: ["contact", "reach"],
  reply: ["reply", "response", "respond", "hear", "wait", "turnaround"],
  data: ["data", "information", "info"],
  security: ["security", "secure", "protected", "protect", "hash", "hashed", "encrypt", "encrypted", "encryption"],
  founder: ["founder", "creator", "maker"],
  workspace: ["workspace", "organization", "organisation", "org"],
  connect: ["connect", "integrate", "integration", "hookup", "authorize", "authorise", "pair"],
  disconnect: ["disconnect", "unhook", "unlink", "detach", "uninstall"],
  install: ["install", "download", "grab"],
  theme: ["theme", "template"],
  client: ["client", "customer"],
  homepage: ["homepage"],
  limit: ["limit", "maximum", "max", "allowance", "quota", "cap", "capacity"],
  expire: ["expire", "expiry", "expiration", "lapse", "lapsed"],
  export: ["export", "csv", "spreadsheet", "excel", "dump"],
  twofactor: ["twofactor", "mfa", "authenticator", "otp", "totp"],
  avatar: ["avatar", "photo", "picture"],
  multisite: ["multisite", "subsite", "subsites", "subdirectory"],
  ai: ["ai", "claude", "chatgpt", "cursor", "mcp", "llm", "gpt"],
  apikey: ["apikey", "key", "token"],
  webhook: ["webhook", "zapier", "n8n"],
  currency: ["currency", "inr", "rupee", "rupees", "euro", "eur", "gbp"],
  annual: ["annual", "yearly", "lifetime"],
  ios: ["ios", "apple", "ipad"],
};

const CONCEPT_OF = new Map<string, string>();
for (const [concept, words] of Object.entries(CONCEPTS)) {
  for (const w of words) {
    CONCEPT_OF.set(w, concept);
    CONCEPT_OF.set(stem(w), concept);
  }
}

/** The comparable terms of a question, in order, stopwords removed. */
export function terms(input: string): string[] {
  const words = normalizeText(input).split(/[^a-z0-9]+/).filter(Boolean);
  const out: string[] = [];
  for (const raw of words) {
    const word = WORDS[raw] ?? raw;
    if (STOPWORDS.has(word) || word.length < 2) continue;
    const stemmed = stem(word);
    out.push(CONCEPT_OF.get(word) ?? CONCEPT_OF.get(stemmed) ?? stemmed);
  }
  return out;
}

/** Damerau-Levenshtein distance capped at `max` (returns max + 1 when over). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    let rowMin = Number.POSITIVE_INFINITY;
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length][b.length];
}
