import { decodeEntities } from "./html";

/**
 * Structured data reading for the free Structured Data Checker.
 *
 * JSON-LD is parsed fully: every <script type="application/ld+json"> block,
 * including top-level arrays and @graph containers. Each top-level entity is
 * listed with its @type, its key properties and a basic check of the common
 * required and recommended properties for a handful of popular types.
 *
 * Those checks are deliberately simple and are labelled as such in the UI:
 * they are the common properties from Google's structured data docs, not
 * Google's full validator, which also checks values, nesting and policy.
 *
 * Microdata and RDFa are only detected and counted, with the types they
 * declare. Pure regex over static HTML; JSON-LD injected by client-side
 * JavaScript after load is not seen.
 */

/** Caps keep the response small whatever the page contains. */
export const MAX_BLOCKS = 50;
export const MAX_ENTITIES = 100;
const MAX_PROPERTIES = 12;
const MAX_PREVIEW_CHARS = 3_000;
const MAX_VALUE_CHARS = 140;
const MAX_TYPES = 30;

export type CheckLevel = "required" | "recommended";

export interface PropertyCheck {
  /** Property path, e.g. "offers.price". */
  property: string;
  level: CheckLevel;
  ok: boolean;
  /** Extra context when the check fails. */
  detail: string | null;
}

export type EntityStatus = "ok" | "warning" | "error";

export interface SchemaEntity {
  blockIndex: number;
  /** Raw @type values, e.g. ["Product"] or ["schema:NewsArticle"]. */
  types: string[];
  /** Short type names used for the checks, e.g. "NewsArticle". */
  shortTypes: string[];
  id: string | null;
  context: string | null;
  /** True when the entity came from an @graph array. */
  fromGraph: boolean;
  properties: Array<{ key: string; value: string }>;
  /** Number of non-@ properties before the display cap. */
  propertyCount: number;
  /** The rule set applied, e.g. "Product", or null when the type has no checks here. */
  checkedAs: string[];
  checks: PropertyCheck[];
  /** Problems with the entity itself (@context, @type) and notes. */
  issues: Array<{ level: "error" | "warning" | "info"; message: string }>;
  status: EntityStatus;
}

export interface JsonLdBlock {
  index: number;
  valid: boolean;
  /** JSON parse error message for invalid blocks. */
  error: string | null;
  /** The block's text, truncated for display. Always rendered as text. */
  preview: string;
  truncated: boolean;
  entityCount: number;
}

export interface TypeCount {
  type: string;
  count: number;
}

export interface StructuredDataReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  jsonLd: {
    totalBlocks: number;
    blocks: JsonLdBlock[];
    totalEntities: number;
    entities: SchemaEntity[];
  };
  microdata: { count: number; types: TypeCount[] };
  rdfa: { count: number; types: TypeCount[]; vocabs: string[] };
  summary: { errors: number; warnings: number; invalidBlocks: number };
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

function isObject(v: Json | undefined): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function present(v: Json | undefined): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.some(present);
  return true;
}

function asArray(v: Json | undefined): Json[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

/** "http://schema.org/Product", "schema:Product" -> "Product". */
export function shortType(t: string): string {
  const s = t.trim();
  const cut = Math.max(s.lastIndexOf("/"), s.lastIndexOf(":"), s.lastIndexOf("#"));
  return cut >= 0 ? s.slice(cut + 1) : s;
}

function typesOf(obj: JsonObject): string[] {
  return asArray(obj["@type"]).filter((t): t is string => typeof t === "string" && t.trim() !== "");
}

/* ---------- Script extraction ---------- */

/** Raw text of every JSON-LD block outside HTML comments, in document order. */
export function extractJsonLdTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<!--[\s\S]*?-->|<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (let m = re.exec(html); m !== null; m = re.exec(html)) {
    if (m[0].startsWith("<!--")) continue;
    const typeMatch = /\stype\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(` ${m[1]}`);
    const type = (typeMatch?.[2] ?? typeMatch?.[3] ?? typeMatch?.[4] ?? "").split(";")[0].trim().toLowerCase();
    if (type === "application/ld+json") out.push(m[2]);
  }
  return out;
}

/* ---------- Context ---------- */

function isSchemaOrg(s: string): boolean {
  return /^https?:\/\/(www\.)?schema\.org\/?$/i.test(s.trim());
}

/** Is this @context schema.org? Handles strings, @vocab objects and arrays. */
export function contextIsSchemaOrg(ctx: Json | undefined): boolean {
  if (typeof ctx === "string") return isSchemaOrg(ctx);
  if (Array.isArray(ctx)) return ctx.some((c) => contextIsSchemaOrg(c));
  if (isObject(ctx)) {
    const vocab = ctx["@vocab"];
    if (typeof vocab === "string" && isSchemaOrg(vocab)) return true;
    return Object.values(ctx).some((v) => typeof v === "string" && isSchemaOrg(v));
  }
  return false;
}

function describeContext(ctx: Json | undefined): string | null {
  if (ctx === undefined || ctx === null) return null;
  if (typeof ctx === "string") return ctx;
  if (isObject(ctx) && typeof ctx["@vocab"] === "string") return ctx["@vocab"];
  return clip(JSON.stringify(ctx), MAX_VALUE_CHARS);
}

/* ---------- Property summary ---------- */

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}

export function summarizeValue(v: Json): string {
  if (v === null) return "null";
  if (typeof v === "string") return clip(v.replace(/\s+/g, " ").trim(), MAX_VALUE_CHARS);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "(empty list)";
    if (v.every((x) => typeof x === "string" || typeof x === "number")) {
      return clip(v.join(", "), MAX_VALUE_CHARS);
    }
    const types = [...new Set(v.filter(isObject).flatMap((o) => typesOf(o).map(shortType)))];
    return `${v.length} item${v.length === 1 ? "" : "s"}${types.length ? ` (${types.slice(0, 3).join(", ")})` : ""}`;
  }
  const types = typesOf(v).map(shortType);
  const label = typeof v.name === "string" ? v.name : typeof v["@id"] === "string" ? v["@id"] : typeof v.url === "string" ? v.url : null;
  const head = types.length ? types.join(", ") : "object";
  return clip(label ? `${head}: ${label}` : head, MAX_VALUE_CHARS);
}

/* ---------- Type checks ---------- */

type Checker = (e: JsonObject) => PropertyCheck[];

const need = (e: JsonObject, property: string, level: CheckLevel, detail: string | null = null): PropertyCheck => {
  const ok = present(e[property]);
  return { property, level, ok, detail: ok ? null : detail };
};

const ARTICLE: Checker = (e) => {
  const checks = [need(e, "headline", "recommended"), need(e, "image", "recommended"), need(e, "datePublished", "recommended")];
  const authors = asArray(e.author);
  if (!present(e.author)) {
    checks.push({ property: "author", level: "recommended", ok: false, detail: null });
  } else {
    const nameless = authors.some((a) => isObject(a) && !present(a.name) && !present(a["@id"]));
    checks.push({
      property: "author.name",
      level: "recommended",
      ok: !nameless,
      detail: nameless ? "An author object has no name." : null,
    });
  }
  return checks;
};

const PRODUCT: Checker = (e) => {
  const checks = [need(e, "name", "required")];
  const hasOffers = present(e.offers);
  const hasReview = present(e.review) || present(e.aggregateRating);
  checks.push({
    property: "offers, review or aggregateRating",
    level: "required",
    ok: hasOffers || hasReview,
    detail: hasOffers || hasReview ? null : "Google needs at least one of these for product snippets.",
  });
  if (hasOffers) {
    const offers = asArray(e.offers).filter(isObject);
    const missing = (pred: (o: JsonObject) => boolean) => offers.length > 0 && offers.some((o) => !pred(o));
    const noPrice = missing((o) => present(o.price) || present(o.lowPrice) || isObject(o.priceSpecification));
    checks.push({ property: "offers.price", level: "required", ok: !noPrice, detail: noPrice ? "An offer has no price (or lowPrice for an AggregateOffer)." : null });
    const noCurrency = missing((o) => present(o.priceCurrency) || isObject(o.priceSpecification));
    checks.push({ property: "offers.priceCurrency", level: "required", ok: !noCurrency, detail: noCurrency ? "An offer has no priceCurrency, e.g. USD." : null });
    const noAvailability = missing((o) => present(o.availability) || present(o.offerCount));
    checks.push({ property: "offers.availability", level: "recommended", ok: !noAvailability, detail: null });
  }
  return checks;
};

const FAQ: Checker = (e) => {
  if (!present(e.mainEntity)) return [need(e, "mainEntity", "required", "An FAQPage needs a list of Question items.")];
  const questions = asArray(e.mainEntity).filter(isObject);
  const noName = questions.filter((q) => !present(q.name)).length;
  const noAnswer = questions.filter((q) => !asArray(q.acceptedAnswer).some((a) => isObject(a) && present(a.text))).length;
  return [
    { property: "mainEntity", level: "required", ok: questions.length > 0, detail: questions.length > 0 ? null : "mainEntity holds no Question objects." },
    { property: "mainEntity.name", level: "required", ok: noName === 0, detail: noName ? `${noName} question(s) have no name (the question text).` : null },
    { property: "mainEntity.acceptedAnswer.text", level: "required", ok: noAnswer === 0, detail: noAnswer ? `${noAnswer} question(s) have no acceptedAnswer with text.` : null },
  ];
};

const BREADCRUMB: Checker = (e) => {
  if (!present(e.itemListElement)) return [need(e, "itemListElement", "required", "A BreadcrumbList needs a list of ListItem entries.")];
  const items = asArray(e.itemListElement).filter(isObject);
  const noPosition = items.filter((i) => !present(i.position)).length;
  const noName = items.filter((i) => !present(i.name) && !(isObject(i.item) && present(i.item.name))).length;
  // Google allows the last crumb (the current page) to omit item.
  const noItem = items.slice(0, -1).filter((i) => !present(i.item)).length;
  return [
    { property: "itemListElement.position", level: "required", ok: noPosition === 0, detail: noPosition ? `${noPosition} crumb(s) have no position.` : null },
    { property: "itemListElement.name", level: "required", ok: noName === 0, detail: noName ? `${noName} crumb(s) have no name.` : null },
    { property: "itemListElement.item", level: "required", ok: noItem === 0, detail: noItem ? `${noItem} crumb(s) before the last have no item URL.` : null },
  ];
};

const RULES: Array<{ label: string; types: string[]; check: Checker; note?: string }> = [
  {
    label: "Organization",
    types: ["Organization", "Corporation", "NGO", "EducationalOrganization", "OnlineStore"],
    check: (e) => [need(e, "name", "recommended"), need(e, "url", "recommended"), need(e, "logo", "recommended")],
  },
  {
    label: "WebSite",
    types: ["WebSite"],
    check: (e) => [need(e, "name", "recommended"), need(e, "url", "recommended")],
  },
  { label: "Article", types: ["Article", "BlogPosting", "NewsArticle", "TechArticle", "Report"], check: ARTICLE },
  { label: "Product", types: ["Product", "ProductGroup", "IndividualProduct"], check: PRODUCT },
  {
    label: "FAQPage",
    types: ["FAQPage"],
    check: FAQ,
    note: "Google only shows FAQ rich results for a small set of well-known government and health sites, so valid FAQ markup may not produce a rich result.",
  },
  { label: "BreadcrumbList", types: ["BreadcrumbList"], check: BREADCRUMB },
  {
    label: "LocalBusiness",
    types: [
      "LocalBusiness", "Restaurant", "CafeOrCoffeeShop", "Bakery", "BarOrPub", "Store", "AutoRepair", "Dentist",
      "Physician", "MedicalClinic", "LegalService", "Attorney", "RealEstateAgent", "HomeAndConstructionBusiness",
      "Plumber", "Electrician", "HVACBusiness", "HairSalon", "BeautySalon", "DaySpa", "HealthClub", "Hotel",
      "ProfessionalService", "FinancialService", "AccountingService", "ChildCare", "AutoDealer", "VeterinaryCare",
    ],
    check: (e) => [need(e, "name", "required"), need(e, "address", "required"), need(e, "telephone", "recommended")],
  },
  {
    label: "Event",
    types: [
      "Event", "MusicEvent", "SportsEvent", "TheaterEvent", "BusinessEvent", "EducationEvent", "Festival",
      "ComedyEvent", "ExhibitionEvent", "FoodEvent", "SocialEvent", "DanceEvent", "ScreeningEvent",
    ],
    check: (e) => [need(e, "name", "required"), need(e, "startDate", "required"), need(e, "location", "required")],
  },
  {
    label: "Recipe",
    types: ["Recipe"],
    check: (e) => [
      need(e, "name", "required"),
      need(e, "image", "required"),
      need(e, "recipeIngredient", "recommended"),
      need(e, "recipeInstructions", "recommended"),
      need(e, "author", "recommended"),
    ],
  },
  {
    label: "VideoObject",
    types: ["VideoObject"],
    check: (e) => [
      need(e, "name", "required"),
      need(e, "thumbnailUrl", "required"),
      need(e, "uploadDate", "required"),
      need(e, "description", "recommended"),
    ],
  },
];

/* ---------- Entity building ---------- */

export function analyzeEntity(obj: JsonObject, blockIndex: number, inheritedContext: Json | undefined, fromGraph: boolean): SchemaEntity {
  const types = typesOf(obj);
  const shortTypes = types.map(shortType);
  const ctx = obj["@context"] ?? inheritedContext;
  const issues: SchemaEntity["issues"] = [];

  if (ctx === undefined || ctx === null) {
    issues.push({ level: "error", message: "No @context. Without it, search engines can't tell this is schema.org vocabulary." });
  } else if (!contextIsSchemaOrg(ctx)) {
    issues.push({ level: "warning", message: "The @context is not schema.org, so search engines may ignore this entity." });
  }
  if (types.length === 0) {
    issues.push({ level: "error", message: "No @type, so there is no way to know what this entity describes." });
  }

  const checks: PropertyCheck[] = [];
  const checkedAs: string[] = [];
  for (const rule of RULES) {
    if (!shortTypes.some((t) => rule.types.includes(t))) continue;
    checkedAs.push(rule.label);
    for (const c of rule.check(obj)) {
      if (!checks.some((x) => x.property === c.property)) checks.push(c);
    }
    if (rule.note) issues.push({ level: "info", message: rule.note });
  }

  const keys = Object.keys(obj).filter((k) => !k.startsWith("@"));
  const properties = keys.slice(0, MAX_PROPERTIES).map((key) => ({ key, value: summarizeValue(obj[key]) }));

  const hasError = issues.some((i) => i.level === "error") || checks.some((c) => !c.ok && c.level === "required");
  const hasWarning = issues.some((i) => i.level === "warning") || checks.some((c) => !c.ok);

  return {
    blockIndex,
    types,
    shortTypes,
    id: typeof obj["@id"] === "string" ? obj["@id"] : null,
    context: describeContext(ctx),
    fromGraph,
    properties,
    propertyCount: keys.length,
    checkedAs,
    checks,
    issues,
    status: hasError ? "error" : hasWarning ? "warning" : "ok",
  };
}

/** Top-level entities in one parsed block: plain objects, arrays and @graph. */
export function entitiesFromBlock(parsed: Json, blockIndex: number): SchemaEntity[] {
  const out: SchemaEntity[] = [];
  const visit = (node: Json, ctx: Json | undefined, fromGraph: boolean) => {
    if (Array.isArray(node)) {
      for (const n of node) visit(n, ctx, fromGraph);
      return;
    }
    if (!isObject(node)) return;
    const graph = node["@graph"];
    if (Array.isArray(graph) || isObject(graph)) {
      const graphCtx = node["@context"] ?? ctx;
      for (const n of asArray(graph)) visit(n, graphCtx, true);
      // A wrapper that is only @context + @graph is not an entity itself.
      if (!Object.keys(node).some((k) => k !== "@context" && k !== "@graph")) return;
    }
    out.push(analyzeEntity(node, blockIndex, ctx, fromGraph));
  };
  visit(parsed, undefined, false);
  return out;
}

/* ---------- Microdata and RDFa ---------- */

/** An attribute value, matched only as a whole attribute name (not `data-typeof`). */
function exactAttr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

function tally(values: string[]): TypeCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
    .slice(0, MAX_TYPES);
}

export function detectMicrodataAndRdfa(html: string): Pick<StructuredDataReport, "microdata" | "rdfa"> {
  const cleaned = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");
  let microCount = 0;
  let rdfaCount = 0;
  const microTypes: string[] = [];
  const rdfaTypes: string[] = [];
  const vocabs = new Set<string>();

  for (const tag of cleaned.match(/<[a-z][a-z0-9-]*\b[^>]*>/gi) ?? []) {
    if (/\sitemscope(?=[\s=/>])/i.test(tag)) {
      microCount += 1;
      const itemtype = exactAttr(tag, "itemtype");
      if (itemtype) microTypes.push(...itemtype.split(/\s+/).filter(Boolean).map(shortType));
    }
    const typeofValue = exactAttr(tag, "typeof");
    if (typeofValue !== null) {
      rdfaCount += 1;
      rdfaTypes.push(...typeofValue.split(/\s+/).filter(Boolean).map(shortType));
    }
    const vocab = exactAttr(tag, "vocab");
    if (vocab) vocabs.add(vocab.trim());
  }

  return {
    microdata: { count: microCount, types: tally(microTypes) },
    rdfa: { count: rdfaCount, types: tally(rdfaTypes), vocabs: [...vocabs].slice(0, 10) },
  };
}

/* ---------- Report ---------- */

export function buildStructuredDataReport(input: {
  url: string;
  finalUrl: string;
  httpStatus: number;
  html: string;
}): StructuredDataReport {
  const texts = extractJsonLdTexts(input.html);
  const blocks: JsonLdBlock[] = [];
  const entities: SchemaEntity[] = [];
  let totalEntities = 0;

  texts.slice(0, MAX_BLOCKS).forEach((raw, index) => {
    const text = raw.trim();
    const preview = text.length > MAX_PREVIEW_CHARS ? text.slice(0, MAX_PREVIEW_CHARS) : text;
    const base = { index, preview, truncated: text.length > MAX_PREVIEW_CHARS };
    if (text === "") {
      blocks.push({ ...base, valid: false, error: "The script tag is empty.", entityCount: 0 });
      return;
    }
    let parsed: Json;
    try {
      parsed = JSON.parse(text) as Json;
    } catch (e) {
      blocks.push({ ...base, valid: false, error: e instanceof Error ? e.message : "Invalid JSON.", entityCount: 0 });
      return;
    }
    const found = entitiesFromBlock(parsed, index);
    totalEntities += found.length;
    entities.push(...found.slice(0, Math.max(0, MAX_ENTITIES - entities.length)));
    blocks.push({ ...base, valid: true, error: null, entityCount: found.length });
  });

  const invalidBlocks = blocks.filter((b) => !b.valid).length;
  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    jsonLd: { totalBlocks: texts.length, blocks, totalEntities, entities },
    ...detectMicrodataAndRdfa(input.html),
    summary: {
      errors: entities.filter((e) => e.status === "error").length + invalidBlocks,
      warnings: entities.filter((e) => e.status === "warning").length,
      invalidBlocks,
    },
  };
}

/** Link to Google's Rich Results Test, prefilled with the page URL. */
export function richResultsTestUrl(pageUrl: string): string {
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(pageUrl)}`;
}
