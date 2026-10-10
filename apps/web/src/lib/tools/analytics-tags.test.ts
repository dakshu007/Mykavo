import { describe, expect, it } from "vitest";
import { analyzeAnalyticsTags } from "./analytics-tags";

const GTM_SNIPPET = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-ABC1234');</script>`;
const GTM_NOSCRIPT = `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-ABC1234" height="0" width="0"></iframe></noscript>`;
const GA4 = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-TEST12345"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-TEST12345');</script>`;

const tag = (html: string, key: string) => analyzeAnalyticsTags(html).tags.find((t) => t.key === key);

describe("analytics tag detection", () => {
  it("finds a GA4 measurement ID in the gtag.js src and the config call", () => {
    const ga4 = tag(GA4, "ga4");
    expect(ga4?.ids).toEqual([{ id: "G-TEST12345", locations: ["script src", "inline script"] }]);
  });

  it("finds GTM in the inline snippet and the noscript iframe", () => {
    const result = analyzeAnalyticsTags(GTM_SNIPPET + GTM_NOSCRIPT);
    const gtm = result.tags.find((t) => t.key === "gtm");
    expect(gtm?.ids).toEqual([{ id: "GTM-ABC1234", locations: ["inline script", "noscript"] }]);
    expect(result.warnings.map((w) => w.text).join(" ")).toContain("can't see into");
    expect(result.warnings.some((w) => w.text.includes("<noscript> iframe isn't"))).toBe(false);
  });

  it("notes a missing GTM noscript and suggests checking GA4 + GTM double tagging", () => {
    const { warnings } = analyzeAnalyticsTags(GTM_SNIPPET + GA4);
    const text = warnings.map((w) => w.text).join(" ");
    expect(text).toContain("<noscript> iframe isn't on this page");
    expect(text).toContain("counted twice");
  });

  it("flags a GA4 ID configured twice", () => {
    const html = GA4 + `<script>gtag('config', "G-TEST12345", {send_page_view: true});</script>`;
    const dup = analyzeAnalyticsTags(html).warnings.find((w) => w.text.startsWith("G-TEST12345 is configured 2 times"));
    expect(dup?.level).toBe("warning");
  });

  it("flags Universal Analytics as retired", () => {
    const html = `<script src="https://www.google-analytics.com/analytics.js"></script><script>ga('create', 'UA-1234567-1', 'auto');</script>`;
    const result = analyzeAnalyticsTags(html);
    expect(result.tags.find((t) => t.key === "ua")?.ids[0].id).toBe("UA-1234567-1");
    expect(result.warnings.find((w) => w.text.includes("July 1, 2023"))?.level).toBe("warning");
  });

  it("detects consent mode default", () => {
    const html = `<script>gtag('consent', 'default', {ad_storage: 'denied'});</script>` + GA4;
    expect(analyzeAnalyticsTags(html).consentModeDefault).toBe(true);
    expect(analyzeAnalyticsTags(GA4).consentModeDefault).toBe(false);
  });

  it("reads ad pixels and other analytics vendors", () => {
    const html = `
<script>fbq('init', '123456789012345'); fbq('track', 'PageView');</script>
<noscript><img src="https://www.facebook.com/tr?id=123456789012345&ev=PageView&noscript=1"/></noscript>
<script>_linkedin_partner_id = "1234567";</script>
<script>ttq.load('C4ABCDEFGHIJKLMNOPQR');</script>
<script>(function(c,l,a,r,i,t,y){})(window, document, "clarity", "script", "abc123def4");</script>
<script>(function(h,o,t,j,a,r){h._hjSettings={hjid:3456789,hjsv:6};})(window,document);</script>
<script defer data-domain="example.com" src="https://plausible.io/js/script.js"></script>
<script src="https://cdn.usefathom.com/script.js" data-site="ABCDEFG" defer></script>
<script>var _paq = window._paq || []; _paq.push(['setSiteId', '7']);</script>
<script>analytics.load("abcdefghijklmnop1234");</script>
<script>mixpanel.init("0123456789abcdef0123456789abcdef");</script>
<script>amplitude.getInstance().init("fedcba9876543210fedcba9876543210");</script>
<script>posthog.init('phc_abcdefghijklmnopqrstuvwxyz012345', {api_host: 'https://us.i.posthog.com'});</script>
<script>gtag('config', 'AW-123456789');</script>`;
    const result = analyzeAnalyticsTags(html);
    const ids = Object.fromEntries(result.tags.map((t) => [t.key, t.ids.map((i) => i.id)]));
    expect(ids["meta-pixel"]).toEqual(["123456789012345"]);
    expect(ids.linkedin).toEqual(["1234567"]);
    expect(ids.tiktok).toEqual(["C4ABCDEFGHIJKLMNOPQR"]);
    expect(ids.clarity).toEqual(["abc123def4"]);
    expect(ids.hotjar).toEqual(["3456789"]);
    expect(ids.plausible).toEqual(["example.com"]);
    expect(ids.fathom).toEqual(["ABCDEFG"]);
    expect(ids.matomo).toEqual(["7"]);
    expect(ids.segment).toEqual(["abcdefghijklmnop1234"]);
    expect(ids.mixpanel).toEqual(["0123456789abcdef0123456789abcdef"]);
    expect(ids.amplitude).toEqual(["fedcba9876543210fedcba9876543210"]);
    expect(ids.posthog).toEqual(["phc_abcdefghijklmnopqrstuvwxyz012345"]);
    expect(ids["google-ads"]).toEqual(["AW-123456789"]);
  });

  it("warns when nothing is found and does not confuse GTM IDs with GA4", () => {
    const empty = analyzeAnalyticsTags("<html><body><p>Hello G-NOTATAG</p></body></html>");
    expect(empty.tags).toEqual([]);
    expect(empty.warnings[0].level).toBe("warning");
    expect(tag(GTM_SNIPPET, "ga4")).toBeUndefined();
    expect(tag(GTM_SNIPPET, "google-tag")).toBeUndefined();
  });
});
