import type { WriterPage } from "./types";

/**
 * AI Writer cluster, batch C: the WordPress page and two honest comparison
 * pages (Jasper, Surfer). Every claim must match config/ai-writer/facts.md.
 */
export const pagesC: WriterPage[] = [
  {
    path: "/ai-blog-writer-for-wordpress",
    navLabel: "For WordPress",
    navBlurb: "Posts saved straight to your WordPress drafts, never auto-published.",
    primaryKeyword: "ai blog writer for wordpress",
    metaTitle: "AI Blog Writer for WordPress: Drafts, Never Auto-Published",
    metaDescription:
      "MyKavo is the AI blog writer for WordPress that finds what to write from your search data and saves each post as a WordPress draft with a free plugin.",
    keywords: [
      "ai blog writer for wordpress",
      "wordpress ai writer",
      "wordpress ai content generator",
      "ai content generator wordpress",
      "ai writer wordpress plugin",
      "wordpress blog writer",
    ],
    hero: {
      ring: "MyKavo for WordPress",
      pre: "The AI blog writer for",
      solid: "WORD",
      outline: "PRESS",
      joined: true,
      accent: "drafts you approve.",
      lede: "MyKavo finds the searches your WordPress site can win, writes the full post, and drops it into your drafts with a free plugin. You press publish, not a robot.",
      chips: ["Free plugin on WordPress.org", "Saves drafts, never publishes", "Title, slug, meta, FAQ, schema"],
      cta: "Write your first WordPress post free",
    },
    capsule:
      "MyKavo is an AI blog writer for WordPress that starts from your own Search Console data, Google suggestions and today's results, writes the complete post, and saves it to WordPress as a draft through the free MyKavo plugin. It never publishes on its own. You review the draft in WP Admin and publish when it is ready. The free plan includes one post a month.",
    widget: {
      kind: "topics",
      title: "Find your next WordPress post",
      intro:
        "Type what your WordPress site is about. These are real searches people type into Google right now, grouped into posts. Pick one and MyKavo writes it, ready for your drafts.",
    },
    sections: [
      {
        id: "from-keyword-to-wp-draft",
        eyebrow: "The workflow",
        title: "From a real search to a WordPress draft, without copy and paste.",
        body: [
          "MyKavo reads your site and writes a short business profile that you confirm. Then it builds a keyword report from your Search Console data, Google's suggestions and today's live results, ranked by what to write first. Pick a keyword and the post is written in one click.",
          "When the post looks right in MyKavo's editor, click Save as draft in WordPress. MyKavo queues it, and the free plugin collects it the next time someone opens WP Admin, and every 15 minutes in the background. The post lands in Posts as a normal WordPress draft.",
        ],
        bullets: [
          "Keyword report built from real search data",
          "Full post written in one click",
          "Edit in MyKavo, then save as draft in WordPress",
          "Review, add images and publish from WP Admin",
        ],
        links: [{ label: "How the AI blog writer finds topics", href: "/ai-blog-writer" }],
      },
      {
        id: "the-free-plugin",
        eyebrow: "The plugin",
        title: "One free plugin from WordPress.org. No API keys to paste around.",
        body: [
          "The MyKavo plugin is free and listed on WordPress.org, so you install it the same way as any other plugin: search for it in Plugins, install, activate and connect. Save as draft in WordPress needs plugin version 1.3.2 or newer, so update it if you installed an older copy.",
          "The same free plugin also connects the site to MyKavo's website monitoring, which is included on every plan. One install covers both the writing and the watching, so the site you are growing is also the site you are keeping an eye on.",
        ],
        links: [
          { label: "About the WordPress plugin", href: "/wordpress-plugin" },
          { label: "Plans and pricing", href: "/pricing" },
        ],
      },
      {
        id: "why-drafts-not-autopublish",
        eyebrow: "Why drafts",
        title: "Auto-publishing is fast. Drafts are safer for a site you care about.",
        body: [
          "An AI post that goes live by itself can carry a wrong price, a claim you would never make, or advice that does not fit your business. On a real site, that is published under your name before anyone reads it. A draft gives you one calm step to catch it.",
          "Drafts also make the post better, not just safer. Every MyKavo post comes with review notes that point to the facts to double check and the places where your own experience belongs. Google rewards helpful, original content however it is made, and that original part is something only you can add.",
        ],
        bullets: [
          "Nothing goes live without a human click",
          "Room to add photos, internal links and your own examples",
          "Clients and editors can review in the WordPress screen they know",
        ],
        links: [{ label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" }],
      },
      {
        id: "how-drafts-update",
        eyebrow: "Edits and rewrites",
        title: "Change the post in MyKavo, and the draft follows.",
        body: [
          "If you edit a post in MyKavo after sending it, save it as a draft in WordPress again. The plugin updates the draft it created before, as long as that post is still a draft. You do not end up with a pile of near duplicates in your Posts list.",
          "Once you publish the post in WordPress, MyKavo stops touching it. Your published content is yours to manage. Each post also includes one free rewrite in MyKavo, so you can try a different angle before it ever reaches WordPress.",
        ],
      },
      {
        id: "for-agencies-and-owners",
        eyebrow: "Who it is for",
        title: "Built for WordPress owners and the agencies who run their sites.",
        body: [
          "If you run your own WordPress site, MyKavo replaces the blank page: it tells you what to write from searches you already appear for, then hands you a finished draft. The free plan covers one keyword report and one post a month, with no card.",
          "If you run WordPress sites for clients, the Agency plan covers 30 websites, 30 keyword reports and 40 posts a month, up to 15 team members and white-label client reports. Drafts land in each client's WP Admin, where the client or your editor can approve them.",
        ],
        links: [
          { label: "What to blog about", href: "/blog/what-to-blog-about" },
          { label: "SEO blog post checklist", href: "/blog/seo-blog-post-checklist" },
        ],
      },
    ],
    compare: {
      title: "MyKavo vs AI writer plugins that auto-publish",
      intro:
        "Some WordPress AI plugins generate and publish posts on a schedule. That suits some sites. Here is how the draft-first approach differs.",
      columns: ["MyKavo", "Auto-publish AI plugins"],
      rows: [
        { label: "What happens after writing", mykavo: "Saved as a WordPress draft for you to review", other: "Published or scheduled automatically" },
        { label: "Where topics come from", mykavo: "Your Search Console data, Google suggestions, today's results", other: "Usually a keyword or prompt you supply" },
        { label: "Checks page one first", mykavo: "Yes, today's live Google results", other: "Depends on the plugin" },
        { label: "SEO package", mykavo: "Title, slug, meta description, FAQ, JSON-LD", other: "Varies by plugin" },
        { label: "Review notes", mykavo: "Facts to check, where to add experience", other: "Depends on the plugin" },
        { label: "Speed to live", mykavo: "As fast as you review it", other: "Fastest: no human step" },
        { label: "Risk of a bad post going live", mykavo: "Low: nothing publishes without you", other: "Higher: errors can go live unseen" },
      ],
      note: "Auto-publishing wins on speed. If you fully trust the output and want posts live with no human step, an auto-publish plugin gets you there faster. MyKavo deliberately never publishes for you.",
    },
    faqs: [
      {
        q: "Is there a free AI writer plugin for WordPress?",
        a: "The MyKavo plugin is free on WordPress.org, and MyKavo's free plan includes one keyword report and one blog post a month with no card. The writing happens in MyKavo, and the plugin saves the finished post into WordPress as a draft.",
      },
      {
        q: "Will MyKavo publish posts on my WordPress site automatically?",
        a: "No. MyKavo never publishes anything to your site, and it does not schedule posts either. The plugin creates a draft, and you publish it from WP Admin when you are happy with it.",
      },
      {
        q: "How long does it take for a post to appear in WordPress?",
        a: "After you click Save as draft in WordPress, MyKavo queues the post. The plugin collects it when someone opens WP Admin, and every 15 minutes in the background, so it usually appears the next time you log in.",
      },
      {
        q: "Which plugin version do I need?",
        a: "Save as draft in WordPress needs MyKavo plugin version 1.3.2 or newer. If you installed the plugin earlier, update it from your Plugins screen first.",
      },
      {
        q: "What if I edit the post after sending it to WordPress?",
        a: "Save it as a draft in WordPress again. The plugin updates the draft it made before, as long as that post is still a draft in WordPress. Once published, MyKavo leaves it alone.",
      },
      {
        q: "Does the plugin do anything besides saving drafts?",
        a: "Yes. The same free plugin also connects the site to MyKavo's website monitoring, which is included on every MyKavo plan.",
      },
      {
        q: "Can I use MyKavo if my site is not on WordPress?",
        a: "Yes. On Shopify, Webflow, Wix or a custom site, you copy the finished post from MyKavo's editor. The Save as draft in WordPress button is the only part that is WordPress only.",
      },
      {
        q: "Is AI content safe to publish on WordPress for SEO?",
        a: "Google says it rewards helpful, original content however it is produced. Mass-producing low-value pages to game rankings breaks its spam policies. That is why MyKavo writes one focused post per real search and keeps it as a draft for you to review.",
      },
    ],
    cta: {
      title: "Your next WordPress draft, written from real searches.",
      body: "Start free. Install the plugin, let MyKavo find a search you can win, and find the finished post waiting in your drafts.",
    },
    related: [
      "/ai-blog-writer",
      "/free-ai-blog-writer",
      "/seo-blog-writer",
      "/blog-post-generator",
      "/best-ai-blog-writer",
    ],
  },
  {
    path: "/alternatives/jasper-alternative",
    navLabel: "Jasper alternative",
    navBlurb: "An honest look at MyKavo vs Jasper for SEO blog posts.",
    primaryKeyword: "jasper alternative",
    metaTitle: "Jasper Alternative for SEO Blog Posts: MyKavo vs Jasper",
    metaDescription:
      "Looking for a Jasper alternative? MyKavo writes SEO blog posts from your own Search Console data, with a free plan and paid plans from $7 a month.",
    keywords: [
      "jasper alternative",
      "jasper ai alternative",
      "jasper ai alternatives",
      "cheaper jasper alternative",
      "jasper vs mykavo",
    ],
    breadcrumb: [{ name: "Alternatives", path: "/alternatives" }],
    checkedOn: "November 15, 2026",
    sources: [{ label: "Jasper pricing", url: "https://www.jasper.ai/pricing" }],
    hero: {
      ring: "MyKavo vs Jasper",
      pre: "The Jasper alternative that's a",
      solid: "BETTER",
      outline: "FIT",
      accent: "for blog posts that rank.",
      lede: "Jasper is a strong platform for marketing teams. If the job is SEO blog posts for your own site, MyKavo starts from your search data and costs less.",
      chips: ["Free plan, no card", "Paid plans from $7 a month", "Keywords from your Search Console"],
      cta: "Try MyKavo free",
    },
    capsule:
      "A good Jasper alternative depends on the job. For marketing teams that need one brand voice across many content types, Jasper is hard to beat. For SEO blog posts on your own site, MyKavo is a focused alternative: it finds what to write from your Search Console data and today's results, writes the full post, and has a free plan, with paid plans from $7 a month.",
    widget: {
      kind: "anatomy",
      title: "What one MyKavo post includes",
      intro:
        "Jasper helps you write across many channels. MyKavo does one thing: an SEO blog post. Click through each part to see what comes with every post.",
    },
    sections: [
      {
        id: "different-jobs",
        eyebrow: "Start here",
        title: "Jasper and MyKavo are built for different jobs.",
        body: [
          "Jasper is built for marketing teams. Its own pricing page centers on brand voice, Canvas, agents, Knowledge assets and Audiences, with Jasper Grid on the Business plan. It is meant to keep many people writing many kinds of content in one consistent voice.",
          "MyKavo writes one kind of content: SEO blog posts for your own site. It does not write ads, emails or social posts. In exchange, everything it does points at one question: which search can this site win next, and what post would win it?",
        ],
      },
      {
        id: "where-topics-come-from",
        eyebrow: "The core difference",
        title: "MyKavo decides what to write from your own search data.",
        body: [
          "Jasper's pricing page does not list keyword research from your own Search Console data. With Jasper, you usually bring the topic. With MyKavo, the topic comes from three sources: your Search Console data, Google's autocomplete suggestions and today's live Google results for the keyword.",
          "That matters most for striking distance searches, the ones your site already ranks for in positions 8 to 20. A focused post there starts with Google already treating you as relevant, which is often the shortest path to page one. MyKavo ranks keywords by what to write first, so you are not guessing.",
        ],
        links: [
          { label: "What striking distance keywords are", href: "/blog/striking-distance-keywords" },
          { label: "Keyword research with Search Console", href: "/blog/google-search-console-keyword-research" },
        ],
      },
      {
        id: "price-for-a-blog",
        eyebrow: "Cost",
        title: "What you pay for a steady blog.",
        body: [
          "Jasper Pro is $59 per seat per month billed yearly, or $69 billed monthly, for one seat. Business is custom pricing. There is a 7-day free trial of Pro and no free plan. Those prices buy a broad marketing platform, which is worth it if you use all of it.",
          "MyKavo's free plan includes one keyword report and one post a month and never expires. Starter is $7 a month for 3 posts, Pro is $20 for 10 posts with up to 3 team members, and Agency is $79 for 40 posts across 30 websites. Billing is monthly and you can cancel anytime. Every plan also includes MyKavo's website monitoring.",
        ],
        links: [{ label: "Compare MyKavo plans", href: "/pricing" }],
      },
      {
        id: "what-you-get-per-post",
        eyebrow: "The output",
        title: "A finished SEO post, not a blank canvas.",
        body: [
          "Each MyKavo post includes a title, a URL slug, a meta description, the full article with H2 and H3 structure, an FAQ section, JSON-LD structured data and review notes. The notes tell you what to check and where your own experience will lift the post above page one.",
          "You edit it in MyKavo's editor, with one free rewrite per post, then copy it to any site or save it as a draft in WordPress with the free plugin. MyKavo never publishes for you, so a person always reads the post before it goes live.",
        ],
        links: [
          { label: "SEO blog post checklist", href: "/blog/seo-blog-post-checklist" },
          { label: "The free WordPress plugin", href: "/wordpress-plugin" },
        ],
      },
      {
        id: "when-to-stay-with-jasper",
        eyebrow: "Be honest",
        title: "When Jasper is still the right call.",
        body: [
          "If your team writes landing pages, ads, emails and social posts and needs them all in a controlled brand voice, Jasper does far more than MyKavo. Brand Voices, Knowledge assets and Audiences are built for exactly that, and MyKavo does not try to compete there.",
          "If your real bottleneck is the blog, and you want to know what to write and get a post that targets a real search, MyKavo is the narrower and cheaper tool. Some teams will reasonably use both: Jasper for brand content, MyKavo for search-led posts.",
        ],
        links: [{ label: "More honest comparisons", href: "/alternatives" }],
      },
    ],
    compare: {
      title: "MyKavo vs Jasper",
      intro: "Jasper facts are from its own pricing page, checked November 15, 2026.",
      columns: ["MyKavo", "Jasper"],
      rows: [
        { label: "Built for", mykavo: "SEO blog posts for your own site", other: "Marketing teams writing many content types" },
        { label: "Free plan", mykavo: "Yes: 1 keyword report + 1 post a month, no card", other: "No, 7-day free trial of Pro" },
        { label: "Entry paid price", mykavo: "$7 a month (Starter)", other: "$59 per seat a month yearly, or $69 monthly (Pro)" },
        { label: "Keywords from your Search Console", mykavo: "Yes, including positions 8 to 20", other: "Not listed on its pricing page" },
        { label: "Brand voice controls", mykavo: "A business profile you confirm once", other: "2 Brand Voices, 5 Knowledge assets, 3 Audiences on Pro" },
        { label: "Seats", mykavo: "Up to 3 team members on Pro, 15 on Agency", other: "1 seat on Pro, priced per seat" },
        { label: "Content types", mykavo: "Blog posts only", other: "Many, with Canvas and agents" },
        { label: "Top tier", mykavo: "Agency $79: 30 websites, white-label client reports", other: "Business: custom pricing, adds Jasper Grid" },
      ],
      note: "Jasper wins if you need one brand voice across ads, emails, landing pages and social content for a marketing team. MyKavo wins if you need SEO blog posts built from your own search data, for less.",
    },
    faqs: [
      {
        q: "What is the best Jasper alternative for SEO blog posts?",
        a: "If your goal is blog posts that target real searches on your own site, MyKavo is a strong fit: it finds keywords from your Search Console data, Google suggestions and today's results, then writes the full post with meta, FAQ and schema. For broad marketing content in one brand voice, Jasper remains the better tool.",
      },
      {
        q: "Is there a cheaper alternative to Jasper?",
        a: "For blog posts, yes. MyKavo has a free plan with one post a month, and paid plans of $7, $20 and $79 a month. Jasper Pro is $59 per seat per month billed yearly or $69 billed monthly, and it has no free plan.",
      },
      {
        q: "Does Jasper have a free plan?",
        a: "Not according to its pricing page, checked November 15, 2026. It offers a 7-day free trial of Pro. MyKavo's free plan does not expire and needs no card.",
      },
      {
        q: "Can MyKavo match my brand voice like Jasper?",
        a: "Partly. MyKavo writes from a short profile of your business, audience, services, market and language that you confirm. It does not offer multiple Brand Voices, Knowledge assets or Audiences the way Jasper does, so teams that need tight voice control across many channels should look at Jasper.",
      },
      {
        q: "Can MyKavo write ads, emails or social posts?",
        a: "No. MyKavo writes SEO blog posts for your own site. If you need many content types, Jasper or a general chatbot is a better choice for that work.",
      },
      {
        q: "Will MyKavo posts rank better than Jasper posts?",
        a: "No tool can guarantee rankings. MyKavo's advantage is where the topic comes from: real searches, often ones you already rank 8 to 20 for, checked against what page one shows today. Your review and original experience still matter most.",
      },
      {
        q: "Does MyKavo show search volume?",
        a: "No. It shows a 1 to 5 popularity estimate from Google autocomplete and competition from today's results. Use Google Keyword Planner alongside it if you need monthly volume.",
      },
    ],
    cta: {
      title: "Try the blog-first Jasper alternative.",
      body: "Start free with no card. MyKavo learns your site, finds a search you can win and writes your first post today.",
    },
    related: [
      "/ai-blog-writer",
      "/best-ai-blog-writer",
      "/alternatives/surfer-seo-alternative",
      "/ai-content-writer",
      "/seo-blog-writer",
      "/free-ai-blog-writer",
    ],
  },
  {
    path: "/alternatives/surfer-seo-alternative",
    navLabel: "Surfer SEO alternative",
    navBlurb: "An honest look at MyKavo vs Surfer for SEO content.",
    primaryKeyword: "surfer seo alternative",
    metaTitle: "Surfer SEO Alternative That Writes the Post: MyKavo vs Surfer",
    metaDescription:
      "A Surfer SEO alternative that finds topics in your own Search Console data and writes the full post. MyKavo has a free plan and paid plans from $7 a month.",
    keywords: [
      "surfer seo alternative",
      "surfer alternative",
      "surfer ai alternative",
      "surferseo alternative",
      "cheaper surfer seo alternative",
      "surfer vs mykavo",
    ],
    breadcrumb: [{ name: "Alternatives", path: "/alternatives" }],
    checkedOn: "November 15, 2026",
    sources: [{ label: "Surfer pricing", url: "https://surfer.ai/pricing/" }],
    hero: {
      ring: "MyKavo vs Surfer",
      pre: "The Surfer SEO alternative:",
      solid: "SWITCH",
      outline: "SMART",
      accent: "if the blank page is the problem.",
      lede: "Surfer is excellent at scoring and optimizing content. MyKavo starts one step earlier: it finds what to write from your own search data, then writes the whole post.",
      chips: ["Free plan, no card", "$7 to $79 a month", "Topics from your Search Console"],
      cta: "Try MyKavo free",
    },
    capsule:
      "A good Surfer SEO alternative depends on what slows you down. If you want a Content Editor that scores drafts and tracks AI search visibility, Surfer is the stronger tool. If you want to find what to write from your own Search Console data and get the full post written, MyKavo is a focused alternative, with a free plan and paid plans from $7 to $79 a month.",
    widget: {
      kind: "grader",
      title: "Check a post before you publish it",
      intro:
        "MyKavo does not have a content-score editor like Surfer's. This free check looks at the basics every post needs. Paste a draft and see what to fix before you publish.",
    },
    sections: [
      {
        id: "optimizer-vs-writer",
        eyebrow: "Start here",
        title: "Surfer optimizes content. MyKavo decides what to write and writes it.",
        body: [
          "Surfer's strength is on-page optimization. Its Content Editor scores a draft against what ranks, and it tracks how your brand shows up in AI search. If you already know your topics and want to tune every page, that is a real advantage.",
          "MyKavo works at the other end of the process. It reads your site, builds a keyword report from your own data, ranks the searches you can win first, and writes a complete post for the one you pick. It is a writer with research built in, not an optimization editor.",
        ],
      },
      {
        id: "research-from-your-data",
        eyebrow: "The core difference",
        title: "Your next topic is already in your Search Console.",
        body: [
          "Many sites already rank for searches they never targeted on purpose, often sitting in positions 8 to 20. These striking distance searches are some of the easiest wins, because Google already sees your site as relevant. MyKavo pulls them from your Search Console data and puts them near the top of the report.",
          "It adds Google's autocomplete suggestions, which are real searches people type, and today's live results for each keyword, used to judge competition and intent. Popularity is shown as a 1 to 5 estimate, not a monthly search volume, and MyKavo says so plainly.",
        ],
        links: [
          { label: "What striking distance keywords are", href: "/blog/striking-distance-keywords" },
          { label: "How to find keywords for your website", href: "/blog/how-to-find-keywords-for-your-website" },
        ],
      },
      {
        id: "pricing-side-by-side",
        eyebrow: "Cost",
        title: "Priced for a blog, not a content operation.",
        body: [
          "Surfer's plans are billed yearly: Discovery is $49 a month for 120 documents, Standard is $99 a month for 360 documents with WordPress and Google Docs and AI prompt tracking, Pro is $182, Peace of Mind is $299 and Enterprise is custom. Surfer also offers a Start for Free option.",
          "MyKavo bills monthly and you can cancel anytime. Free is $0 for one keyword report and one post a month. Starter is $7 for 3 posts, Pro is $20 for 10 posts, and Agency is $79 for 40 posts across 30 websites. If you publish a few strong posts a month, that is a much smaller bill.",
        ],
        links: [{ label: "Compare MyKavo plans", href: "/pricing" }],
      },
      {
        id: "what-a-post-includes",
        eyebrow: "The output",
        title: "Every post arrives as a full SEO package.",
        body: [
          "A MyKavo post includes a title, a URL slug, a meta description, the full article with H2 and H3 structure, an FAQ section, JSON-LD structured data and review notes. The notes flag facts to check and the spots where your own experience will make the post better than page one.",
          "Edit it in MyKavo's editor, use the free rewrite if you want a different angle, then copy it anywhere or save it as a draft in WordPress with the free plugin. MyKavo never publishes on its own.",
        ],
        links: [
          { label: "Check meta tags on a live page", href: "/tools/meta-tag-checker" },
          { label: "Validate structured data", href: "/tools/structured-data-checker" },
        ],
      },
      {
        id: "when-surfer-wins",
        eyebrow: "Be honest",
        title: "When Surfer is the better choice.",
        body: [
          "If your team lives inside a content editor and wants a score to optimize against, Surfer does that and MyKavo does not. The same goes for AI search visibility tracking: Surfer measures it, MyKavo does not. MyKavo also has no rank tracking and no backlink analysis.",
          "If your problem is not knowing what to write, or not having time to write it, MyKavo fits better and costs less. Some teams will use both: MyKavo to find the topic and draft the post, an optimizer to polish it.",
        ],
        links: [{ label: "More honest comparisons", href: "/alternatives" }],
      },
    ],
    compare: {
      title: "MyKavo vs Surfer",
      intro: "Surfer facts are from its own pricing page, checked November 15, 2026.",
      columns: ["MyKavo", "Surfer"],
      rows: [
        { label: "Main job", mykavo: "Find what to write, then write the full post", other: "Optimize content with Content Editor scoring" },
        { label: "Allowance", mykavo: "3 to 40 posts a month on paid plans", other: "120 documents (Discovery), 360 (Standard)" },
        { label: "Content score editor", mykavo: "No", other: "Yes, its core strength" },
        { label: "AI search visibility tracking", mykavo: "No", other: "Yes" },
        { label: "Free option", mykavo: "Free plan: 1 report + 1 post a month, no card", other: "Start for Free offered" },
        { label: "Entry paid price", mykavo: "$7 a month, billed monthly", other: "$49 a month, billed yearly (Discovery)" },
        { label: "SEO package per post", mykavo: "Title, slug, meta, FAQ, JSON-LD, review notes", other: "Optimization guidance in the editor" },
        { label: "WordPress", mykavo: "Free plugin saves drafts, all plans", other: "Included from Standard ($99 a month)" },
      ],
      note: "Surfer wins if you want a content-score editor and AI search visibility tracking. MyKavo wins if you want topics from your own search data and the whole post written, from $7 a month with a free plan.",
    },
    faqs: [
      {
        q: "What is a good alternative to Surfer SEO?",
        a: "It depends on the job. For finding topics in your own Search Console data and getting the full post written, MyKavo is a focused alternative with a free plan. For content scoring and AI search visibility tracking, Surfer remains the stronger tool.",
      },
      {
        q: "Is there a cheaper alternative to Surfer SEO?",
        a: "For blog posts, yes. MyKavo's paid plans are $7, $20 and $79 a month, billed monthly, plus a free plan. Surfer's plans start at $49 a month billed yearly for Discovery.",
      },
      {
        q: "Does MyKavo have a content score like Surfer?",
        a: "No. MyKavo does not have a content-score editor. It focuses on choosing the right search, checking today's page one and writing a complete post with review notes for you to finish.",
      },
      {
        q: "Does Surfer have a free plan?",
        a: "Surfer's pricing page offers a Start for Free option, and its paid plans are billed yearly. MyKavo's free plan includes one keyword report and one post a month, needs no card and does not expire.",
      },
      {
        q: "Does MyKavo track rankings or AI search visibility?",
        a: "No. MyKavo has no rank tracking, no backlink analysis and no AI search visibility tracking. Surfer tracks AI search visibility if you need it.",
      },
      {
        q: "Does MyKavo work with WordPress like Surfer?",
        a: "Yes. The free MyKavo plugin on WordPress.org saves posts as WordPress drafts on every plan, including Free. It never publishes for you. Surfer lists WordPress on its Standard plan and above.",
      },
      {
        q: "Can MyKavo guarantee my posts will rank?",
        a: "No, and no tool can. MyKavo improves your odds by targeting real searches you can win and matching what page one shows today. Your own experience and fact checking do the rest.",
      },
    ],
    cta: {
      title: "Find what to write. Get it written.",
      body: "Start free with no card. MyKavo reads your Search Console data, picks the search to win first and writes the full post.",
    },
    related: [
      "/ai-blog-writer",
      "/seo-blog-writer",
      "/alternatives/jasper-alternative",
      "/best-ai-blog-writer",
      "/ai-article-writer",
      "/blog-post-generator",
    ],
  },
];
