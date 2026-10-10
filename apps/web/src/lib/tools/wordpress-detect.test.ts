import { describe, expect, it } from "vitest";
import { detectPlugins, detectThemes, detectWordPressSignals, humanizeSlug, parseThemeHeader, safeHttpUrl } from "./wordpress-detect";

const HTML = `<meta name="generator" content="WordPress 6.6.2" />
<link rel='stylesheet' href='https://cdn.example.com/wp-content/themes/astra-child/style.css?ver=1' />
<link rel='stylesheet' href='https://example.com/wp-content/themes/astra/assets/css/main.css' />
<script src='https://example.com/wp-content/themes/astra/assets/js/a.js'></script>
<script src="/wp-content/plugins/contact-form-7/includes/js/index.js"></script>
<script src="/wp-content/plugins/woocommerce/assets/js/x.js"></script>
<script src="/wp-includes/js/jquery/jquery.min.js"></script>
<!-- This site is optimized with the Yoast SEO plugin v23.5 -->`;

describe("wordpress detection", () => {
  it("finds WordPress signals and version", () => {
    const { signals, version } = detectWordPressSignals(HTML);
    expect(version).toBe("6.6.2");
    expect(signals).toContain("/wp-content/ asset paths");
    expect(signals).toContain("/wp-includes/ scripts");
    expect(detectWordPressSignals("<html><body>hi</body></html>").signals).toEqual([]);
  });

  it("ranks themes by references and builds the stylesheet URL on the same base", () => {
    const themes = detectThemes(HTML, "https://example.com/");
    expect(themes.map((t) => t.slug)).toEqual(["astra", "astra-child"]);
    expect(themes[0].stylesheetUrl).toBe("https://example.com/wp-content/themes/astra/style.css");
    expect(themes[1].stylesheetUrl).toBe("https://cdn.example.com/wp-content/themes/astra-child/style.css");
  });

  it("finds plugins from asset paths and fingerprints, with readable names", () => {
    const plugins = detectPlugins(HTML);
    expect(plugins.map((p) => p.name)).toEqual(["Contact Form 7", "WooCommerce", "Yoast SEO"]);
    expect(plugins.find((p) => p.slug === "wordpress-seo")?.evidence).toBe("fingerprint");
  });

  it("parses a theme style.css header", () => {
    const css = `/*\nTheme Name: Astra Child\nTemplate: astra\nVersion: 1.0.2\nAuthor: Brainstorm Force\nTheme URI: https://wpastra.com/\n*/\nbody{}`;
    expect(parseThemeHeader(css)).toMatchObject({ name: "Astra Child", template: "astra", version: "1.0.2", author: "Brainstorm Force" });
    expect(parseThemeHeader("body{color:red}")).toBeNull();
  });

  it("humanizes slugs and only allows http(s) links", () => {
    expect(humanizeSlug("wp-mail-smtp")).toBe("WP Mail Smtp");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://wpastra.com/")).toBe("https://wpastra.com/");
  });
});
