import type { WriterPage } from "./types";

/**
 * Cluster pages A: /best-ai-blog-writer, /seo-blog-writer, /ai-content-writer.
 * Facts must match config/ai-writer/facts.md. No invented numbers, no ranking promises.
 */
export const pagesA: WriterPage[] = [
  // ---------------------------------------------------------------------------
  // /best-ai-blog-writer: honest buyer's guide
  // ---------------------------------------------------------------------------
  {
    path: "/best-ai-blog-writer",
    navLabel: "Best AI Blog Writer",
    navBlurb: "An honest buyer's guide: what to judge, and who each tool suits.",
    primaryKeyword: "best ai blog writer",
    metaTitle: "Best AI Blog Writer in 2026: An Honest Buyer's Guide",
    metaDescription:
      "How to pick the best AI blog writer for ranking, with an honest look at MyKavo, Jasper, Surfer and ChatGPT: what each costs and who each one is best for.",
    keywords: [
      "best ai blog writer",
      "best ai writing tool",
      "best ai writer",
      "best ai for blog writing",
      "best ai content writer",
      "ai blog writer comparison",
    ],
    hero: {
      ring: "Honest buyer's guide",
      pre: "The best AI",
      solid: "BLOG",
      outline: "WRITER",
      accent: "for posts that rank, compared honestly.",
      lede: "Every AI tool writes fluent paragraphs now. This guide shows how to judge the parts that decide whether a post gets found, and where MyKavo, Jasper, Surfer and chatbots each come out ahead.",
      chips: ["Vendor pricing checked Nov 15, 2026", "MyKavo free plan, no card", "Says where others win"],
      cta: "Try MyKavo free",
    },
    capsule:
      "The best AI blog writer for ranking is the one that starts from real search data instead of a blank prompt. MyKavo is the pick if you want posts built from your own Search Console data and today's Google results, delivered with title, slug, meta, FAQ and schema. Jasper suits marketing teams that need brand voice. Surfer suits teams that want content optimization scoring.",
    widget: {
      kind: "anatomy",
      title: "The anatomy of a post built to rank",
      intro:
        "Every part of a finished post has a job. Step through the pieces a MyKavo post ships with, then use the same list as a yardstick for any AI blog writer you test.",
    },
    sections: [
      {
        id: "what-best-means",
        eyebrow: "Start here",
        title: "Best at what? Fluent writing is no longer the test.",
        body: [
          "Give the same topic to any modern AI writer and you get a clean, readable draft. If you pick a tool by reading one sample post, you are comparing the part that matters least.",
          "What separates the best AI blog writer from the rest is everything around the words. Did the topic come from a search people actually make? Did the tool look at what page one shows before writing? Does the post arrive with the pieces search engines read, and does it tell you what to check before it goes live?",
        ],
      },
      {
        id: "ranking-criteria",
        eyebrow: "The criteria",
        title: "Six things the best AI writing tool does for ranking.",
        body: [
          "Use this list when you trial any tool, including ours. A tool that covers all six saves you the research, the structure and the technical extras. One that covers two leaves the rest to you.",
          "Notice that only one item is about the writing itself. Google has said it rewards helpful, original content however it is produced. The criteria below are what make a post helpful to a specific search, and they are where tools differ most.",
        ],
        bullets: [
          "Picks topics from real searches, ideally your own Search Console data",
          "Checks today's page one for intent and competition before writing",
          "Opens with a short answer, then clear H2 and H3 sections",
          "Ships the SEO package: title, slug, meta description, FAQ, structured data",
          "Flags facts to verify and places to add your own experience",
          "Leaves publishing to you, so nothing goes live unreviewed",
        ],
        links: [
          { label: "How to find keywords for your website", href: "/blog/how-to-find-keywords-for-your-website" },
          { label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" },
        ],
      },
      {
        id: "jasper-and-surfer",
        eyebrow: "Where others win",
        title: "Jasper and Surfer are excellent at different jobs.",
        body: [
          "Jasper is built for marketing teams. Its strengths are brand voice, Canvas and agents, with Jasper Grid on the Business plan. Pro costs $59 per seat per month billed yearly or $69 billed monthly, with 2 Brand Voices, 5 Knowledge assets and 3 Audiences, and a 7-day free trial instead of a free plan. Its pricing page does not list keyword research from your own Search Console data. Choose Jasper when the hard problem is keeping a team on brand.",
          "Surfer is strong at on-page content optimization. Its Content Editor scores a draft as you work, and it tracks visibility in AI search. Plans are billed yearly, from Discovery at $49 a month for 120 documents to Standard at $99 for 360 documents with WordPress, Google Docs and AI prompt tracking. Choose Surfer when you already know your keywords and want to score and tune every draft.",
        ],
        links: [
          { label: "Jasper alternative: MyKavo compared", href: "/alternatives/jasper-alternative" },
          { label: "Surfer alternative: MyKavo compared", href: "/alternatives/surfer-seo-alternative" },
        ],
      },
      {
        id: "chatbots-and-mykavo",
        eyebrow: "The other two",
        title: "Chatbots write well. MyKavo writes for a search you can win.",
        body: [
          "ChatGPT and Claude produce good drafts of almost anything. For posts that need to rank, the gaps are around the draft: they do not know your site's Search Console data, they do not check today's results unless you ask, and you build the slug, meta, FAQ and schema yourself. They are the best AI for blog writing if you enjoy doing your own keyword research, and the obvious pick for everything that is not a blog post.",
          "MyKavo does one job. It reads your site, builds a keyword report from your Search Console data, Google suggestions and today's live results, ranks what to write first, then writes the complete post with review notes. It is the best pick for small businesses, solo marketers and agencies who want posts built to rank without stitching tools together. What it leaves out:",
        ],
        bullets: [
          "No rank tracking or backlink analysis",
          "No search volume: popularity is a 1 to 5 estimate from Google autocomplete",
          "No content-score editor like Surfer's",
          "No automatic publishing: every post stays a draft",
        ],
        links: [
          { label: "How the MyKavo AI Blog Writer works", href: "/ai-blog-writer" },
          { label: "MyKavo pricing", href: "/pricing" },
        ],
      },
      {
        id: "how-to-choose",
        eyebrow: "Decide in a minute",
        title: "Pick by the problem you actually have.",
        body: [
          "The best AI writer for you is the one that removes your bottleneck. Each tool here is built around a different problem, so match yours first.",
          "Then test with a real post. MyKavo's free plan includes 1 keyword report and 1 post a month with no card. Jasper offers a 7-day trial of Pro. Surfer offers a way to start for free. Run the same topic through two tools and count what you would still need to do before you could publish.",
        ],
        bullets: [
          "\"We don't know what to write\": MyKavo",
          "\"Our content doesn't sound like us across channels\": Jasper",
          "\"Our drafts need on-page optimization scoring\": Surfer",
          "\"I need a quick draft of something that isn't a blog post\": a chatbot",
        ],
        links: [{ label: "What to blog about when you're stuck", href: "/blog/what-to-blog-about" }],
      },
    ],
    compare: {
      title: "MyKavo vs a typical AI writer",
      intro: "Most AI writers start where you tell them to. MyKavo starts by finding where your site can compete.",
      columns: ["MyKavo AI Blog Writer", "Typical AI writer"],
      rows: [
        { label: "Starting point", mykavo: "A ranked keyword report", other: "A prompt or keyword you supply" },
        { label: "Your Search Console data", mykavo: "Optional, used to find searches you rank 8 to 20 for", other: "Not used" },
        { label: "Page one check", mykavo: "Today's live Google results for the keyword", other: "Usually up to you" },
        { label: "SEO package", mykavo: "Title, slug, meta, FAQ and JSON-LD in every post", other: "Varies, often just the article" },
        { label: "Review notes", mykavo: "Facts to check, where to add experience", other: "Rarely" },
        { label: "Brand voice controls", mykavo: "A business profile you confirm", other: "Often deeper, e.g. Jasper's Brand Voices" },
      ],
      note: "Jasper is the stronger choice for brand voice across a marketing team. Surfer is the stronger choice for content optimization scoring and AI search visibility tracking. MyKavo has no content-score editor.",
    },
    faqs: [
      {
        q: "What is the best AI blog writer?",
        a: "It depends on your bottleneck. If you need posts built from real search data, MyKavo is built for that. If you need brand voice across a marketing team, Jasper fits better, and if you want to score drafts in a content editor, Surfer does.",
      },
      {
        q: "What is the best AI writing tool for SEO?",
        a: "Look for a tool that picks topics from real searches, checks page one before writing and delivers the full SEO package. MyKavo does all three, using your own Search Console data when you connect it. Surfer is the better fit if you mainly want to optimize drafts you already have.",
      },
      {
        q: "Is ChatGPT good enough for writing blog posts?",
        a: "It writes good drafts. It does not know your Search Console data or check today's results unless you ask, and you build the slug, meta, FAQ and schema yourself. If you are happy doing that research and setup, it can work well.",
      },
      {
        q: "What is the best free AI blog writer?",
        a: "MyKavo's free plan includes 1 keyword report and 1 complete post a month, with no card and no expiry. Surfer offers a way to start for free. Jasper has no free plan, only a 7-day trial of Pro.",
      },
      {
        q: "Can any AI writer guarantee rankings?",
        a: "No. No tool can guarantee rankings, and you should be wary of any that claims to. The best a tool can do is target a search you can realistically win, match what page one shows and leave room for your own experience.",
      },
      {
        q: "Does MyKavo show search volume like other SEO tools?",
        a: "No. MyKavo shows a popularity estimate from 1 to 5 based on Google autocomplete, plus competition from today's results. If you need monthly volume numbers, use Google Keyword Planner alongside it.",
      },
    ],
    cta: {
      title: "Test the criteria on your own site.",
      body: "Start free. MyKavo reads your site, finds a search you can win and writes the full post, so you can judge it against any tool on this page.",
    },
    related: [
      "/ai-blog-writer",
      "/seo-blog-writer",
      "/ai-content-writer",
      "/free-ai-blog-writer",
      "/alternatives/jasper-alternative",
      "/alternatives/surfer-seo-alternative",
    ],
    sources: [
      { label: "Jasper pricing", url: "https://www.jasper.ai/pricing" },
      { label: "Surfer pricing", url: "https://surfer.ai/pricing/" },
    ],
    checkedOn: "November 15, 2026",
  },

  // ---------------------------------------------------------------------------
  // /seo-blog-writer: the SEO package and what makes a post rank
  // ---------------------------------------------------------------------------
  {
    path: "/seo-blog-writer",
    navLabel: "SEO Blog Writer",
    navBlurb: "Intent, structure, FAQ, schema and meta in every post.",
    primaryKeyword: "seo blog writer",
    metaTitle: "SEO Blog Writer: AI Posts With the Full SEO Package",
    metaDescription:
      "MyKavo's SEO blog writer checks search intent and page one, then writes the post with H2s, an FAQ, JSON-LD, meta and slug. Grade your own draft free here.",
    keywords: [
      "seo blog writer",
      "seo content writer",
      "seo writing ai",
      "seo article writer",
      "ai seo writer",
      "ai seo content writer",
      "seo blog post generator",
    ],
    hero: {
      ring: "MyKavo SEO Writer",
      pre: "The AI SEO",
      solid: "BLOG",
      outline: "WRITER",
      accent: "with the whole package.",
      lede: "Rankings live in the details most writers skip: intent, structure, FAQ, schema and meta. MyKavo writes every one of them into every post.",
      chips: ["Title, slug and meta included", "JSON-LD in every post", "Matches today's page one"],
      cta: "Write an SEO post free",
    },
    capsule:
      "An SEO blog writer should do more than wrap words around a keyword. MyKavo checks search intent and today's page one first, then writes the full post: a short answer up top, clear H2 sections, an FAQ, JSON-LD structured data, a meta description and a clean URL slug, plus review notes. You edit it before anything goes live.",
    widget: {
      kind: "grader",
      title: "Grade your SEO draft",
      intro:
        "Paste a draft you already have. The grader checks it against the basics on this page, like a direct answer near the top, a clear H2 structure and an FAQ, and shows you what to fix first.",
    },
    sections: [
      {
        id: "search-intent-first",
        eyebrow: "Before a word is written",
        title: "Intent decides the post. The keyword only names it.",
        body: [
          "Two searches that share most of their words can want completely different pages: a definition, a step by step guide, a comparison, a list of options. Google shows which format it believes searchers want, and a post in the wrong format struggles however well it is written.",
          "So MyKavo reads today's live Google results for your keyword before it writes anything. What page one shows sets the format, depth and angle of the post. It also tells you how hard the keyword is to win, which is why the keyword report ranks searches by what to write first instead of handing you a flat list.",
        ],
        bullets: [
          "Informational: the searcher wants to learn or fix something",
          "Commercial: the searcher is comparing options before buying",
          "Transactional: the searcher is ready to act",
          "Navigational: the searcher wants a specific site or page",
        ],
        links: [
          { label: "How to find low competition keywords", href: "/blog/low-competition-keywords" },
          { label: "Keyword research with Search Console", href: "/blog/google-search-console-keyword-research" },
        ],
      },
      {
        id: "answer-up-top",
        eyebrow: "Structure",
        title: "A short answer first, then H2 sections that earn the scroll.",
        body: [
          "Readers decide in seconds whether a page answers their question. A post that opens with a direct, short answer keeps them, and gives search engines a clean passage that sums up the page. Every MyKavo post leads with one.",
          "After the answer, H2 sections take the reader through the questions they ask next, with H3s for detail where a section needs it. A clear heading outline makes the post easy to skim, easy to quote and easy to update later. It is also the first thing worth checking on any draft, AI or not.",
        ],
        links: [{ label: "Free heading structure checker", href: "/tools/heading-structure-checker" }],
      },
      {
        id: "faq-and-schema",
        eyebrow: "Extras that are not extra",
        title: "An FAQ and JSON-LD in every post, ready to paste.",
        body: [
          "The FAQ section answers the follow-up questions people search, written as real questions with plain answers. It picks up related searches the main sections do not cover and gives skimmers a fast route to the answer they came for.",
          "Every MyKavo post also includes JSON-LD structured data, the code that describes the page to search engines in a format they read directly. Most SEO content writers leave this for you to build. MyKavo writes it with the post, so you paste it into your page or SEO plugin and check it with a structured data tool.",
        ],
        links: [{ label: "Free structured data checker", href: "/tools/structured-data-checker" }],
      },
      {
        id: "meta-slug-links",
        eyebrow: "The click",
        title: "Title, meta and slug: the part searchers see first.",
        body: [
          "Your title and meta description are your listing on the results page, and they decide whether a searcher clicks you or the result above. MyKavo writes a title for the click, a meta description that says what the reader gets, and a short, clean URL slug for every post.",
          "One part is yours: internal links. Link the new post from related pages on your site, and link from it to the pages you want readers to reach next. You know which pages matter most to your business, and those links help both readers and search engines find the new post.",
        ],
        links: [
          { label: "Free meta tag checker", href: "/tools/meta-tag-checker" },
          { label: "The SEO blog post checklist", href: "/blog/seo-blog-post-checklist" },
        ],
      },
      {
        id: "seo-writing-ai-done-right",
        eyebrow: "Where AI fits",
        title: "SEO writing AI should handle the package. You handle the proof.",
        body: [
          "Google rewards helpful, original content however it is made, and its spam policies name scaled content abuse: using automation mainly to mass-produce low-value pages. The right job for AI in SEO writing is the mechanical work: research, structure, meta, FAQ and schema.",
          "What no AI SEO writer can supply is your experience: the result you got for a client, the mistake you see customers make, the detail only someone who did the work would know. MyKavo's review notes point to where that belongs and which facts to check. Then save the post as a WordPress draft with the free plugin, or copy it to any site.",
        ],
        links: [
          { label: "The free WordPress plugin", href: "/wordpress-plugin" },
          { label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" },
        ],
      },
    ],
    compare: {
      title: "MyKavo vs writing SEO posts by hand",
      intro: "Writing by hand gives you full control. It also puts every step of the SEO package on you.",
      columns: ["MyKavo SEO Blog Writer", "Writing by hand"],
      rows: [
        { label: "Keyword research", mykavo: "Built in: Search Console, suggestions, today's results", other: "Separate tools and spreadsheets" },
        { label: "Checking page one", mykavo: "Done for the keyword before writing", other: "Open and read each result yourself" },
        { label: "Structure", mykavo: "Short answer, then H2 and H3 sections", other: "Outline from scratch" },
        { label: "FAQ and JSON-LD", mykavo: "Included, ready to paste", other: "Written and coded yourself" },
        { label: "Meta description and slug", mykavo: "Included in every post", other: "Easy to forget under deadline" },
        { label: "Original experience", mykavo: "Review notes show where to add yours", other: "Naturally yours, if you have the time" },
      ],
      note: "Writing by hand wins when a post is mostly your own expertise, like a detailed case study or original research. Even then, MyKavo can do the keyword work and structure while you write those parts yourself.",
    },
    faqs: [
      {
        q: "What does an SEO blog writer do?",
        a: "It writes blog posts aimed at a specific search, structured so readers and search engines can understand them. A good one also handles the extras: title, meta description, URL slug, FAQ and structured data. MyKavo does all of that and starts from a keyword your site can compete for.",
      },
      {
        q: "What makes a blog post SEO friendly?",
        a: "It targets a real search, matches the format page one shows, answers the question early and uses clear H2 sections. It also has a strong title and meta description, structured data and internal links from related pages. Original experience and checked facts make it worth ranking.",
      },
      {
        q: "Can AI write SEO content that ranks?",
        a: "AI content can rank when it is helpful and original, which is what Google says it rewards. No tool can guarantee rankings. MyKavo improves your odds by targeting searches you can win and matching page one, and its review notes show where to add your own experience.",
      },
      {
        q: "Does the SEO blog writer include schema markup?",
        a: "Yes. Every post includes JSON-LD structured data alongside the article, FAQ, title, slug and meta description. You can paste it into your page or SEO plugin and validate it with a structured data checker.",
      },
      {
        q: "How long should an SEO blog post be?",
        a: "There is no fixed length that ranks. The right length is whatever fully answers the search, and page one is the best guide to that. MyKavo checks today's results for the keyword before writing, so the post's depth follows what searchers are already rewarding.",
      },
      {
        q: "Does MyKavo give a content score like Surfer?",
        a: "No. MyKavo has no content-score editor. It focuses on choosing the right search and writing the complete post. If live optimization scoring is central to how you work, Surfer is built for that.",
      },
      {
        q: "How many SEO posts can I write each month?",
        a: "The free plan includes 1 post a month with no card. Starter includes 3 posts for $7, Pro 10 posts for $20 and Agency 40 posts for $79. Each post also comes with 1 free rewrite.",
      },
    ],
    cta: {
      title: "Get the whole SEO package, every post.",
      body: "Start free. MyKavo checks the search, matches page one and writes the post with its FAQ, schema, meta and slug ready to go.",
    },
    related: [
      "/ai-blog-writer",
      "/best-ai-blog-writer",
      "/blog-post-generator",
      "/ai-article-writer",
      "/ai-blog-writer-for-wordpress",
      "/alternatives/surfer-seo-alternative",
    ],
  },

  // ---------------------------------------------------------------------------
  // /ai-content-writer: content that earns traffic, not a filled calendar
  // ---------------------------------------------------------------------------
  {
    path: "/ai-content-writer",
    navLabel: "AI Content Writer",
    navBlurb: "Content that earns traffic, planned from your own search data.",
    primaryKeyword: "ai content writer",
    metaTitle: "AI Content Writer for Blog Posts That Earn Traffic",
    metaDescription:
      "MyKavo is an AI content writer for your own blog. It plans topics from your Search Console data and Google suggestions, then writes SEO posts built to rank.",
    keywords: [
      "ai content writer",
      "ai content generator",
      "best ai content writer",
      "ai writer for blogs",
      "ai content writing tool",
      "ai content strategy",
    ],
    hero: {
      ring: "MyKavo AI Writer",
      pre: "The AI",
      solid: "CONTENT",
      outline: "WRITER",
      accent: "that earns its traffic.",
      lede: "Filling a content calendar is easy. Publishing posts people actually search for is the hard part, so MyKavo plans from your own data before it writes.",
      chips: ["Plans from your own search data", "Ranks what to write first", "Free plan: 1 post a month"],
      cta: "Plan your content free",
    },
    capsule:
      "MyKavo is an AI content writer built for one job: SEO blog posts for your own website. Instead of filling a calendar with generic topics, it plans from your Google Search Console data, Google suggestions and today's results, ranks what to write first, and writes each post with its title, meta, FAQ and schema. It does not write ads, emails or social posts.",
    widget: {
      kind: "grader",
      title: "Grade any draft in seconds",
      intro:
        "Paste a draft from MyKavo, another tool or your own keyboard, and see how it handles the basics a post needs to compete in search. Nothing you paste leaves your browser.",
    },
    sections: [
      {
        id: "traffic-vs-calendar",
        eyebrow: "The difference",
        title: "Content that fills a calendar vs content that earns traffic.",
        body: [
          "The usual AI content workflow starts with a schedule: a few posts a week, topics brainstormed in a prompt, each published because its date arrived. Search traffic does not move, because few people were searching for those topics, or page one already belonged to sites with a long head start.",
          "Content that earns traffic starts from the other end. Find the searches real people type, check whether your site can compete for them, then write the post that deserves to win. You may publish less, but every post has a reason to exist and a search it can show up for.",
        ],
        bullets: [
          "Topics chosen because they sound good, not because people search them",
          "No look at what page one already shows",
          "Several posts chasing the same search and competing with each other",
          "Nothing a competitor could not publish tomorrow",
        ],
      },
      {
        id: "strategy-from-your-data",
        eyebrow: "Your own data",
        title: "A content strategy built from searches you already show up for.",
        body: [
          "Google Search Console already knows which searches show your site, including the ones where you sit just off page one. Connect it and MyKavo reads those queries, finds striking distance searches where you rank in positions 8 to 20, and moves them toward the top of your plan.",
          "MyKavo then adds Google suggestions, the phrases people type, and checks today's live results for each keyword to judge competition and intent. Every keyword gets a popularity estimate from 1 to 5 and a place in the order of what to write first. Connecting Search Console is optional, but it is what turns a list of ideas into a strategy that fits your site.",
        ],
        links: [
          { label: "What striking distance keywords are", href: "/blog/striking-distance-keywords" },
          { label: "Keyword research with Search Console", href: "/blog/google-search-console-keyword-research" },
          { label: "What to blog about", href: "/blog/what-to-blog-about" },
        ],
      },
      {
        id: "not-a-generic-generator",
        eyebrow: "What it is not",
        title: "Not an AI content generator for everything. A writer for your blog.",
        body: [
          "General AI content generators are built to write anything: ad copy, emails, product descriptions, social captions and blog posts. That range is useful, and it is also why their blog posts often read like everyone else's: the tool knows the format but not your searches or your business.",
          "MyKavo writes one kind of content: SEO blog posts for your own site. It starts from a business profile it drafts by reading your website, covering what you do, who you serve, your services, market and language, which you confirm once. Every post after that is written for your audience and aimed at a search from your keyword report.",
        ],
        bullets: [
          "Writes: SEO blog posts for your own website",
          "Includes: title, slug, meta description, FAQ, JSON-LD and review notes",
          "Does not write: ads, emails or social posts",
          "Does not do: rank tracking, backlink analysis or search volume",
        ],
      },
      {
        id: "every-post-complete",
        eyebrow: "Ready to edit",
        title: "Each post arrives complete, and stays a draft until you say so.",
        body: [
          "Pick a keyword from your report and MyKavo writes the whole post in one click: the article with H2 and H3 structure, a title, a URL slug, a meta description, an FAQ section and JSON-LD structured data. Review notes list the facts to double check and the spots where your own experience will lift the post above page one.",
          "You edit in MyKavo's editor, with 1 free rewrite per post if you want a different angle. On Shopify, Webflow, Wix or a custom site, copy the post across. On WordPress, the free MyKavo plugin saves it as a draft in WP Admin. MyKavo never publishes anything to your site.",
        ],
        links: [{ label: "The free WordPress plugin", href: "/wordpress-plugin" }],
      },
      {
        id: "scale-without-spam",
        eyebrow: "Volume, carefully",
        title: "More content is not the goal. More traffic is.",
        body: [
          "Google's spam policies name scaled content abuse: using automation mainly to churn out low-value pages to manipulate rankings. So the number of posts matters less than whether each one targets a real search and adds something original.",
          "MyKavo plans are counted in keyword reports and posts: 1 report and 1 post a month on Free, rising to 30 reports and 40 posts on Agency, which also covers 30 websites and white-label client reports. Each post comes from a keyword in a report, so every piece of content you publish has a search behind it.",
        ],
        links: [
          { label: "Compare plans", href: "/pricing" },
          { label: "The SEO blog post checklist", href: "/blog/seo-blog-post-checklist" },
          { label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" },
        ],
      },
    ],
    compare: {
      title: "MyKavo vs a generic AI content generator",
      intro: "Both turn a topic into text. Only one decides which topics are worth your time.",
      columns: ["MyKavo AI Content Writer", "Generic AI content generator"],
      rows: [
        { label: "What it writes", mykavo: "SEO blog posts for your own site", other: "Anything: ads, emails, social, blogs" },
        { label: "Where topics come from", mykavo: "A ranked report from your search data", other: "Brainstormed from your prompt" },
        { label: "Knows your business", mykavo: "A profile drafted from your site, confirmed by you", other: "Whatever you paste in" },
        { label: "Competition check", mykavo: "Today's live Google results", other: "Usually none" },
        { label: "SEO package", mykavo: "Title, slug, meta, FAQ and JSON-LD", other: "Usually just the text" },
        { label: "Getting it on your site", mykavo: "Copy, or a WordPress draft via the free plugin", other: "Copy and paste" },
      ],
      note: "A generic content generator is the better pick when you need many kinds of copy, like ads, emails and social posts. MyKavo only writes SEO blog posts.",
    },
    faqs: [
      {
        q: "What is an AI content writer?",
        a: "It is a tool that uses AI to draft written content from a topic or brief. Some write any kind of copy. MyKavo focuses on SEO blog posts for your own site, and plans what to write from real search data before it drafts anything.",
      },
      {
        q: "What is the best AI content writer for blogs?",
        a: "For blogs that need search traffic, look for a writer that picks topics from real searches and delivers the full SEO package. MyKavo does both, using your Search Console data when you connect it. If brand voice across many channels matters more, Jasper is built for marketing teams.",
      },
      {
        q: "Is an AI content generator the same as an AI content writer?",
        a: "People use the terms interchangeably. In practice, content generators usually aim to write every kind of copy, while a focused writer like MyKavo does one job in depth. MyKavo writes SEO blog posts and adds the research and structure that job needs.",
      },
      {
        q: "Can MyKavo write ads, emails or social media posts?",
        a: "No. MyKavo is not a general chat writing assistant. It writes SEO blog posts for your own website, and a general AI tool is the better fit for ads, emails and social posts.",
      },
      {
        q: "How does MyKavo decide what content to write?",
        a: "It builds a keyword report from your Search Console data, Google suggestions and today's live results, then ranks keywords by what to write first. Searches you already rank 8 to 20 for often come first, because they are usually the fastest wins.",
      },
      {
        q: "Will Google penalize AI-generated content?",
        a: "Google says it rewards helpful content however it is produced. What breaks its spam policies is mass-producing low-value pages to manipulate rankings. Write for real searches, add your own experience and check facts, and AI help is not the problem.",
      },
      {
        q: "Do I need Google Search Console to use MyKavo?",
        a: "No. Without it, MyKavo still uses Google suggestions and today's results. Connecting it lets MyKavo find the searches your site already shows up for, which makes your content plan much more specific to you.",
      },
      {
        q: "Can agencies use it for client websites?",
        a: "Yes. The Agency plan is $79 a month and includes 30 keyword reports, 40 posts, 30 websites, up to 15 team members and white-label client reports. Every plan also includes MyKavo's website monitoring.",
      },
    ],
    cta: {
      title: "Publish content people actually search for.",
      body: "Start free. MyKavo learns your business, plans from your own search data and writes your first post today.",
    },
    related: [
      "/ai-blog-writer",
      "/best-ai-blog-writer",
      "/seo-blog-writer",
      "/ai-article-writer",
      "/free-ai-blog-writer",
      "/blog-post-generator",
    ],
  },
];
