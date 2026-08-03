/**
 * E-E-A-T analyzer engine. Deterministic on-page signal detection mapped to
 * Google's Search Quality Rater Guidelines pillars: Experience, Expertise,
 * Authoritativeness, Trust - with Trust weighted double, because the QRG
 * names it "the most important member of the E-E-A-T family".
 *
 * Honesty contract: E-E-A-T is a quality-rater FRAMEWORK, not a Google
 * ranking score. This tool measures the on-page signals raters and
 * algorithms can actually observe (bylines, dates, policies, schema,
 * citations, contact info…) and never pretends to read Google's mind.
 * Every check is reproducible: same HTML in, same result out.
 */

import { parse, type HTMLElement } from "node-html-parser";

export type EeatPillar = "EXPERIENCE" | "EXPERTISE" | "AUTHORITATIVENESS" | "TRUST";
export type EeatStatus = "pass" | "warn" | "fail";

export interface EeatCheck {
  id: string;
  pillar: EeatPillar;
  status: EeatStatus;
  title: string;
  /** What was found (or not). */
  detail: string;
  /** How to improve - the actionable half. */
  fix: string;
  /** Relative importance inside its pillar. */
  weight: number;
}

export interface EeatReport {
  url: string;
  overall: number;
  rating: "Excellent" | "Good" | "Needs work" | "Poor";
  pillars: Record<EeatPillar, number>;
  checks: EeatCheck[];
}

export interface EeatAuxSignals {
  aboutPage: boolean;
  contactPage: boolean;
  privacyPage: boolean;
  termsPage: boolean;
}

/** Common paths probed when the page itself doesn't link to these. */
export const EEAT_AUX_PATHS: Record<keyof EeatAuxSignals, string[]> = {
  aboutPage: ["/about", "/about-us"],
  contactPage: ["/contact", "/contact-us", "/support"],
  privacyPage: ["/privacy", "/privacy-policy"],
  termsPage: ["/terms", "/terms-of-service", "/terms-and-conditions"],
};

const EXPERIENCE_PATTERNS =
  /\b(i|we)('ve|'re)?\s+(personally\s+)?(test(ed)?|tried|use(d)?|review(ed)?|measur(ed)?|visit(ed)?|built|install(ed)?|compar(ed)?|ran|worked with)\b|first-?hand|hands-?on|in my experience|in our experience|our testing/i;
const CREDENTIAL_PATTERNS =
  /years? of experience|certified|licen[cs]ed|accredited|ph\.?d|m\.?d\.?\b|award-?winning|specialist|qualified|degree in/i;
const REVIEWED_BY_PATTERNS = /\b(medically |fact[- ])?(reviewed|checked|verified) by\b/i;
const DATE_PATTERNS =
  /\b(published|updated|last (updated|modified|reviewed))\b[^<]{0,40}\d{4}|datePublished|dateModified/i;
const SOCIAL_HOSTS = /linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|github\.com|threads\.net/i;

function attr(el: HTMLElement, name: string): string {
  return (el.getAttribute(name) ?? "").trim();
}

interface PageFacts {
  https: boolean;
  text: string;
  wordCount: number;
  loremIpsum: boolean;
  h2Count: number;
  imageAlts: string[];
  imagesTotal: number;
  hasTime: boolean;
  metaAuthor: string;
  bylineText: string;
  schemaTypes: Set<string>;
  schemaAuthorNames: string[];
  schemaOrgName: string;
  schemaSameAs: number;
  schemaDates: boolean;
  socialLinks: number;
  externalContentLinks: number;
  mailtoOrTel: boolean;
  copyrightLine: string;
  insecureForms: number;
  mixedContent: number;
  title: string;
  metaDescription: string;
  linkedPages: EeatAuxSignals;
}

/** Parse once into the facts every check reads. Exported for the aux-probe
 *  short-circuit (linked pages found on-page need no network probes). */
export function extractEeatFacts(url: string, html: string): PageFacts {
  const base = new URL(url);
  const root = parse(html, { blockTextElements: { script: true, style: true, noscript: true } });

  const text = (root.querySelector("body")?.text ?? root.text).replace(/\s+/g, " ").trim();

  // Structured data: types, authors, org identity, sameAs, dates.
  const schemaTypes = new Set<string>();
  const schemaAuthorNames: string[] = [];
  let schemaOrgName = "";
  let schemaSameAs = 0;
  let schemaDates = false;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    const type = obj["@type"];
    for (const t of Array.isArray(type) ? type : [type]) {
      if (typeof t === "string") schemaTypes.add(t);
    }
    if (typeof obj.name === "string" && (type === "Organization" || (Array.isArray(type) && type.includes("Organization"))))
      schemaOrgName = obj.name;
    if (obj.author) {
      for (const a of Array.isArray(obj.author) ? obj.author : [obj.author]) {
        if (a && typeof a === "object" && typeof (a as Record<string, unknown>).name === "string")
          schemaAuthorNames.push((a as Record<string, string>).name);
        else if (typeof a === "string") schemaAuthorNames.push(a);
      }
    }
    if (Array.isArray(obj.sameAs)) schemaSameAs += obj.sameAs.length;
    if (typeof obj.datePublished === "string" || typeof obj.dateModified === "string") schemaDates = true;
    for (const value of Object.values(obj)) walk(value);
  };
  for (const block of root.querySelectorAll('script[type="application/ld+json" i]')) {
    try {
      walk(JSON.parse(block.text));
    } catch {
      // invalid JSON-LD is scored by the site audit, not here
    }
  }

  // Byline: meta author, rel=author, common byline classes, "By Name" text.
  const metaAuthor = attr(root.querySelector('meta[name="author" i]') ?? parse("<i/>"), "content");
  const bylineEl = root.querySelector('[rel="author"], .author, .byline, [class*="author-name"], [itemprop="author"]');
  const bylineMatch = text.match(/\b[Bb]y ([A-Z][a-zA-Z'.-]+(?: [A-Z][a-zA-Z'.-]+){0,3})\b/);
  const bylineText = (bylineEl?.text.trim() || bylineMatch?.[1] || "").slice(0, 80);

  // Links: social, external citations, linked trust pages, contact handles.
  let socialLinks = 0;
  let externalContentLinks = 0;
  let mailtoOrTel = false;
  const linkedPages: EeatAuxSignals = { aboutPage: false, contactPage: false, privacyPage: false, termsPage: false };
  for (const a of root.querySelectorAll("a[href]")) {
    const href = attr(a, "href");
    const label = `${href} ${a.text}`.toLowerCase();
    if (/^mailto:|^tel:/i.test(href)) mailtoOrTel = true;
    if (/about/.test(label)) linkedPages.aboutPage = true;
    if (/contact|support|help-?cent/.test(label)) linkedPages.contactPage = true;
    if (/privacy/.test(label)) linkedPages.privacyPage = true;
    if (/terms|conditions/.test(label)) linkedPages.termsPage = true;
    try {
      const resolved = new URL(href, base);
      if (!/^https?:$/.test(resolved.protocol)) continue;
      if (SOCIAL_HOSTS.test(resolved.host)) socialLinks++;
      else if (resolved.host !== base.host) externalContentLinks++;
    } catch {
      // unparseable href
    }
  }

  const images = root.querySelectorAll("img");
  const imageAlts = images.map((i) => attr(i, "alt")).filter(Boolean);

  let insecureForms = 0;
  for (const form of root.querySelectorAll("form[action]")) {
    if (/^http:\/\//i.test(attr(form, "action"))) insecureForms++;
  }
  let mixedContent = 0;
  if (base.protocol === "https:") {
    for (const el of root.querySelectorAll("img[src], script[src], iframe[src]")) {
      if (/^http:\/\//i.test(attr(el, "src"))) mixedContent++;
    }
  }

  const footerText = root.querySelector("footer")?.text ?? "";
  const copyrightLine = (footerText.match(/(©|\(c\)|copyright)[^.\n]{0,80}/i)?.[0] ?? "").trim();

  return {
    https: base.protocol === "https:",
    text,
    wordCount: text ? text.split(" ").length : 0,
    loremIpsum: /lorem ipsum/i.test(text),
    h2Count: root.querySelectorAll("h2").length,
    imageAlts,
    imagesTotal: images.length,
    hasTime: Boolean(root.querySelector("time")) || DATE_PATTERNS.test(html),
    metaAuthor,
    bylineText,
    schemaTypes,
    schemaAuthorNames,
    schemaOrgName,
    schemaSameAs,
    schemaDates,
    socialLinks,
    externalContentLinks,
    mailtoOrTel,
    copyrightLine,
    insecureForms,
    mixedContent,
    title: root.querySelector("title")?.text.trim() ?? "",
    metaDescription: attr(root.querySelector('meta[name="description" i]') ?? parse("<i/>"), "content"),
    linkedPages,
  };
}

const RATING_BANDS: [number, EeatReport["rating"]][] = [
  [90, "Excellent"],
  [70, "Good"],
  [50, "Needs work"],
];

export function analyzeEeat(url: string, html: string, aux: EeatAuxSignals): EeatReport {
  const f = extractEeatFacts(url, html);
  const checks: EeatCheck[] = [];
  const add = (
    id: string, pillar: EeatPillar, status: EeatStatus, weight: number,
    title: string, detail: string, fix: string,
  ) => checks.push({ id, pillar, status, weight, title, detail, fix });

  // ---------- Experience ----------
  const hasExperienceLanguage = EXPERIENCE_PATTERNS.test(f.text);
  add("first-hand-language", "EXPERIENCE", hasExperienceLanguage ? "pass" : "warn", 3,
    "First-hand experience signals",
    hasExperienceLanguage
      ? "The content uses first-person experience language (tested, tried, used…)."
      : "No first-person experience language detected.",
    "Show you've actually used what you write about: 'we tested', 'in my experience', original observations. Google added the first E to E-E-A-T specifically for this.");
  add("visible-dates", "EXPERIENCE", f.hasTime || f.schemaDates ? "pass" : "fail", 2,
    "Published / updated dates",
    f.hasTime || f.schemaDates ? "The page carries visible or structured dates." : "No publish or update date found.",
    "Add a visible 'Published' / 'Last updated' date and datePublished/dateModified in schema - raters check content freshness.");
  add("original-media", "EXPERIENCE",
    f.imageAlts.length >= 2 ? "pass" : f.imagesTotal > 0 ? "warn" : "fail", 1,
    "Supporting media",
    f.imageAlts.length >= 2
      ? `${f.imagesTotal} images with descriptive alt text.`
      : f.imagesTotal > 0
        ? "Images exist but mostly lack descriptive alt text."
        : "No images on the page.",
    "Include original photos/screenshots with descriptive alt text - stock-free visuals are strong experience evidence.");

  // ---------- Expertise ----------
  const hasByline = Boolean(f.metaAuthor || f.bylineText || f.schemaAuthorNames.length > 0);
  const authorName = f.schemaAuthorNames[0] || f.metaAuthor || f.bylineText;
  add("author-byline", "EXPERTISE", hasByline ? "pass" : "fail", 3,
    "Author identified",
    hasByline ? `Author found: ${authorName.slice(0, 60)}` : "No author byline, meta author, or schema author.",
    "Name the human behind the content: a visible byline plus an author property in Article schema.");
  const hasCredentials = CREDENTIAL_PATTERNS.test(f.text);
  add("author-credentials", "EXPERTISE", hasCredentials ? "pass" : "warn", 2,
    "Credentials / bio signals",
    hasCredentials ? "Credential language found (experience, certification, qualifications…)." : "No credential or bio language detected.",
    "Add a short author bio stating relevant qualifications, and link it to a full author page.");
  add("reviewed-by", "EXPERTISE", REVIEWED_BY_PATTERNS.test(f.text) ? "pass" : "warn", 1,
    "Editorial review marker",
    REVIEWED_BY_PATTERNS.test(f.text) ? "A 'reviewed by / fact-checked' marker is present." : "No review/fact-check marker.",
    "For YMYL-adjacent topics, add 'Reviewed by {expert}' - it is a direct QRG trust signal.");
  add("content-depth", "EXPERTISE",
    f.wordCount >= 600 ? "pass" : f.wordCount >= 250 ? "warn" : "fail", 2,
    "Content depth",
    `~${f.wordCount} words of visible text.`,
    "Thin pages rarely demonstrate expertise - cover the topic properly or consolidate.");
  add("content-structure", "EXPERTISE", f.h2Count >= 2 ? "pass" : "warn", 1,
    "Structured content",
    f.h2Count >= 2 ? `${f.h2Count} section headings.` : "Little heading structure.",
    "Organize long content with descriptive H2/H3 sections.");

  // ---------- Authoritativeness ----------
  const hasOrgSchema = f.schemaTypes.has("Organization") || f.schemaTypes.has("Person") || Boolean(f.schemaOrgName);
  add("entity-schema", "AUTHORITATIVENESS", hasOrgSchema ? "pass" : "fail", 3,
    "Organization / Person schema",
    hasOrgSchema
      ? `Structured identity present${f.schemaOrgName ? `: ${f.schemaOrgName.slice(0, 50)}` : ""}.`
      : "No Organization or Person schema.",
    "Declare who publishes this site with Organization (or Person) JSON-LD including name, logo, and sameAs.");
  const socialTotal = f.schemaSameAs + f.socialLinks;
  add("social-profiles", "AUTHORITATIVENESS", socialTotal >= 2 ? "pass" : socialTotal === 1 ? "warn" : "fail", 2,
    "Connected profiles",
    socialTotal > 0 ? `${socialTotal} social/profile link${socialTotal === 1 ? "" : "s"} found.` : "No social or profile links.",
    "Link your real profiles (LinkedIn, X, GitHub…) via sameAs and the footer - entities Google can corroborate.");
  add("about-page", "AUTHORITATIVENESS", aux.aboutPage ? "pass" : "fail", 2,
    "About page",
    aux.aboutPage ? "An about page exists." : "No about page found (link or /about).",
    "Publish an about page saying who you are and why you're qualified to run this site - raters look for it explicitly.");
  add("citations", "AUTHORITATIVENESS", f.externalContentLinks >= 2 ? "pass" : "warn", 1,
    "Outbound citations",
    f.externalContentLinks > 0 ? `${f.externalContentLinks} external reference link${f.externalContentLinks === 1 ? "" : "s"}.` : "No external references.",
    "Cite reputable sources for claims - referencing evidence is an expertise and trust marker.");
  add("ownership-line", "AUTHORITATIVENESS", f.copyrightLine ? "pass" : "warn", 1,
    "Ownership statement",
    f.copyrightLine ? `Footer identity: "${f.copyrightLine.slice(0, 60)}"` : "No copyright/ownership line in the footer.",
    "State who owns the site in the footer (© Year Company).");

  // ---------- Trust (the most important member of the family) ----------
  add("https", "TRUST", f.https ? "pass" : "fail", 3,
    "HTTPS", f.https ? "Served over HTTPS." : "Page is served over plain HTTP.",
    "Serve everything over HTTPS - table stakes for trust.");
  const contact = aux.contactPage || f.mailtoOrTel;
  add("contact-info", "TRUST", contact ? "pass" : "fail", 3,
    "Contact information",
    contact ? "A contact page or direct contact details exist." : "No contact page, email, or phone found.",
    "Make yourself reachable: a /contact page or visible email/phone. The QRG treats unreachable sites as low trust.");
  add("privacy-policy", "TRUST", aux.privacyPage ? "pass" : "fail", 2,
    "Privacy policy",
    aux.privacyPage ? "A privacy policy exists." : "No privacy policy found.",
    "Publish a privacy policy and link it from the footer - users, ad platforms, and raters all expect it.");
  add("terms-page", "TRUST", aux.termsPage ? "pass" : "warn", 1,
    "Terms page",
    aux.termsPage ? "Terms page exists." : "No terms page found.",
    "Add terms of service, especially if you sell anything.");
  add("no-placeholder", "TRUST", f.loremIpsum ? "fail" : "pass", 2,
    "No placeholder content",
    f.loremIpsum ? "Lorem Ipsum text found on the page." : "No template placeholder text.",
    "Replace placeholder text - nothing erodes trust faster.");
  add("secure-embeds", "TRUST", f.insecureForms + f.mixedContent === 0 ? "pass" : "fail", 2,
    "Secure forms & resources",
    f.insecureForms + f.mixedContent === 0
      ? "No insecure forms or mixed content."
      : `${f.insecureForms} insecure form${f.insecureForms === 1 ? "" : "s"}, ${f.mixedContent} mixed-content resource${f.mixedContent === 1 ? "" : "s"}.`,
    "Point every form action and embedded resource at https://.");
  const describesItself = Boolean(f.title && f.metaDescription);
  add("page-transparency", "TRUST", describesItself ? "pass" : "warn", 1,
    "Page describes itself",
    describesItself ? "Title and meta description present." : "Missing title or meta description.",
    "An honest title + description tells users (and raters) what the page is before they commit a click.");

  // ---------- Scores ----------
  const STATUS_VALUE: Record<EeatStatus, number> = { pass: 1, warn: 0.5, fail: 0 };
  const pillarScore = (pillar: EeatPillar) => {
    const rows = checks.filter((c) => c.pillar === pillar);
    const possible = rows.reduce((sum, c) => sum + c.weight, 0);
    const earned = rows.reduce((sum, c) => sum + c.weight * STATUS_VALUE[c.status], 0);
    return Math.round((earned / possible) * 100);
  };
  const pillars: Record<EeatPillar, number> = {
    EXPERIENCE: pillarScore("EXPERIENCE"),
    EXPERTISE: pillarScore("EXPERTISE"),
    AUTHORITATIVENESS: pillarScore("AUTHORITATIVENESS"),
    TRUST: pillarScore("TRUST"),
  };
  // Trust counts double - per the QRG's own emphasis.
  const overall = Math.round(
    (pillars.EXPERIENCE + pillars.EXPERTISE + pillars.AUTHORITATIVENESS + pillars.TRUST * 2) / 5,
  );
  const rating = RATING_BANDS.find(([min]) => overall >= min)?.[1] ?? "Poor";

  const order: Record<EeatStatus, number> = { fail: 0, warn: 1, pass: 2 };
  checks.sort((a, b) => order[a.status] - order[b.status] || b.weight - a.weight);

  return { url, overall, rating, pillars, checks };
}
