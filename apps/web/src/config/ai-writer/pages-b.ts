import type { WriterPage } from "./types";

/**
 * Cluster pages B: /ai-article-writer, /free-ai-blog-writer, /blog-post-generator.
 * Facts follow config/ai-writer/facts.md. No invented numbers, no ranking promises.
 */
export const pagesB: WriterPage[] = [
  {
    path: "/ai-article-writer",
    navLabel: "AI Article Writer",
    navBlurb: "Long-form articles that answer a search completely.",
    primaryKeyword: "ai article writer",
    metaTitle: "AI Article Writer: Long-Form Articles That Answer the Search",
    metaDescription:
      "MyKavo's AI article writer drafts long-form SEO articles from real searches: short answer first, sections that match page one, an FAQ and review notes.",
    keywords: [
      "ai article writer",
      "article generator",
      "ai article generator",
      "seo article writer",
      "free ai article writer",
      "long form ai article writer",
    ],
    hero: {
      ring: "MyKavo Article Writer",
      pre: "The AI",
      solid: "ARTICLE",
      outline: "WRITER",
      accent: "that answers the whole question.",
      lede: "A good article settles a search so the reader never needs a second tab. MyKavo writes long-form articles shaped by what page one shows today, then tells you exactly what to check before you publish.",
      chips: ["Short answer first", "Sections shaped by page one", "Review notes in every article"],
      cta: "Write your first article free",
    },
    capsule:
      "MyKavo is an AI article writer for your own website. It picks a real search from your Search Console data, Google suggestions and today's results, studies what page one covers, and drafts a complete long-form article: a short answer up top, H2 and H3 sections, an FAQ, JSON-LD and review notes on what to verify. You edit it and publish it yourself.",
    widget: {
      kind: "grader",
      title: "Grade an article draft",
      intro:
        "Paste any draft, yours or one from another tool. See how it handles the basics a search article needs: a clear title, a short answer near the top, a sensible heading structure and questions answered in plain language.",
    },
    sections: [
      {
        id: "answer-the-whole-search",
        eyebrow: "What an article is for",
        title: "Long-form only works when every paragraph earns its place.",
        body: [
          "Length is not the goal. A searcher wants their question settled: the direct answer, the context that makes it make sense, the edge cases, and the next step. An article that covers all of that tends to keep readers on the page. One padded with filler sends them back to the results.",
          "MyKavo plans each article around one search and the questions that come with it. It checks the live Google results for that keyword so it knows which subtopics readers expect, then writes to cover them in order instead of stretching a thin idea across many headings.",
        ],
        bullets: [
          "One search per article, chosen from real data",
          "Subtopics drawn from what page one already covers",
          "Follow-up questions answered in the FAQ",
          "No padding written to hit a word count",
        ],
        links: [{ label: "How to find keywords for your website", href: "/blog/how-to-find-keywords-for-your-website" }],
      },
      {
        id: "how-the-article-is-built",
        eyebrow: "Structure",
        title: "Short answer first. Then the sections page one has taught readers to expect.",
        body: [
          "Every article opens with a short, direct answer to the search. Readers who only need that get it immediately, and the rest have a reason to keep going. Then come H2 sections that mirror the ground the current top results cover, with H3s where a section needs to break down further.",
          "The article closes with an FAQ built from the related questions people type into Google. Alongside the text you get a title, a URL slug, a meta description and JSON-LD structured data, so the article arrives as a full SEO package rather than a block of prose you still have to dress up.",
        ],
        links: [
          { label: "Check your heading structure", href: "/tools/heading-structure-checker" },
          { label: "The SEO blog post checklist", href: "/blog/seo-blog-post-checklist" },
        ],
      },
      {
        id: "accuracy-and-review-notes",
        eyebrow: "Accuracy",
        title: "An article you cannot trust is worse than no article.",
        body: [
          "Any AI writer can state something confidently and get it wrong. MyKavo does not hide that. Each article ships with review notes that point to the claims worth checking: figures, prices, dates, product details and anything that depends on your market or your rules.",
          "Treat the draft as a researched first pass, not a finished source. Verify the flagged points against primary sources, fix anything that does not apply to your business, and cut what you cannot stand behind. A few minutes of checking protects the trust that makes readers come back.",
        ],
      },
      {
        id: "add-your-experience",
        eyebrow: "The part only you can write",
        title: "Experience is what separates your article from the other nine on page one.",
        body: [
          "Google says it rewards helpful, original content however it is produced. The original part rarely comes from a model. It comes from you: the job you finished last week, the mistake customers keep making, the number from your own records, the photo from the site visit.",
          "The review notes mark the spots where a first-hand detail will do the most work. Add a short example, a real result or an opinion you would defend. That is usually what turns a competent article into the one readers remember and link to.",
        ],
        links: [{ label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" }],
      },
      {
        id: "from-draft-to-published",
        eyebrow: "Finishing",
        title: "Edit it in MyKavo, then put it where it belongs.",
        body: [
          "The article opens in MyKavo's editor. Rework sections, tighten the intro or use the one free rewrite to change the angle without spending another article. Nothing goes live until you decide it should.",
          "On WordPress, the free MyKavo plugin saves the article as a draft in your site for a final look. On Shopify, Webflow, Wix or a custom site, copy it from the editor. After publishing, check the title, meta tags and structured data on the live page.",
        ],
        links: [
          { label: "The free WordPress plugin", href: "/wordpress-plugin" },
          { label: "Meta tag checker", href: "/tools/meta-tag-checker" },
          { label: "Structured data checker", href: "/tools/structured-data-checker" },
        ],
      },
    ],
    compare: {
      title: "MyKavo vs a one-shot article generator",
      intro: "A one-shot generator turns a typed topic into text. MyKavo starts earlier and stops later.",
      columns: ["MyKavo AI Article Writer", "One-shot article generator"],
      rows: [
        { label: "Choosing the topic", mykavo: "From your Search Console data, Google suggestions and today's results", other: "Whatever you type in the box" },
        { label: "Knows what page one covers", mykavo: "Yes, it checks the live results for the keyword", other: "Usually not" },
        { label: "Opening", mykavo: "A short, direct answer to the search", other: "Often a general introduction" },
        { label: "FAQ and JSON-LD", mykavo: "Included with every article", other: "Rarely included" },
        { label: "Review notes", mykavo: "Claims to verify and where to add experience", other: "None" },
        { label: "Changing the angle", mykavo: "One free rewrite per article", other: "Generate again from scratch" },
      ],
      note: "A one-shot generator can be quicker when you need throwaway text that will never be published as a search article, or when you already know exactly what to write.",
    },
    faqs: [
      {
        q: "What is the best AI article writer for SEO?",
        a: "The one that starts from a search you can realistically win and gives you the full package around the text. MyKavo picks topics from your own Search Console data, Google suggestions and today's results, then writes the article with a slug, meta description, FAQ and JSON-LD. It is built for blog articles on your own site, not for every kind of writing.",
      },
      {
        q: "How long are the articles MyKavo writes?",
        a: "As long as the search needs. MyKavo shapes each article around what the current top results cover, so a simple question gets a tighter piece and a broad topic gets more sections. It does not pad articles to reach a fixed word count.",
      },
      {
        q: "Is there a free AI article writer?",
        a: "Yes. MyKavo's free plan includes one keyword report and one full article a month, with no card, and it does not expire. Each article includes the title, slug, meta description, FAQ, JSON-LD and review notes.",
      },
      {
        q: "Can AI-written articles rank on Google?",
        a: "They can, and no tool can guarantee it. Google rewards helpful content however it is made and treats mass-produced low-value pages as spam. Picking a real search, matching what page one shows and adding your own experience is what improves your chances.",
      },
      {
        q: "How do I make sure an AI article is accurate?",
        a: "Read the review notes first. They point to the claims that need checking, such as figures, prices and dates. Verify those against primary sources and remove anything you cannot confirm before you publish.",
      },
      {
        q: "Does MyKavo write news articles or press releases?",
        a: "No. MyKavo writes SEO blog articles for your own website, built around a search people are already making. For press releases, emails or ads, a general writing assistant is a better fit.",
      },
      {
        q: "Will the article be published automatically?",
        a: "Never. Every article stays a draft in MyKavo's editor. You copy it to your site, or on WordPress the free plugin saves it as a WordPress draft that you publish yourself.",
      },
    ],
    cta: {
      title: "Write an article that settles the search.",
      body: "Start free. MyKavo finds a search worth answering, studies page one and drafts your first long-form article today.",
    },
    related: [
      "/ai-blog-writer",
      "/seo-blog-writer",
      "/ai-content-writer",
      "/blog-post-generator",
      "/free-ai-blog-writer",
      "/alternatives/surfer-seo-alternative",
    ],
  },
  {
    path: "/free-ai-blog-writer",
    navLabel: "Free AI Blog Writer",
    navBlurb: "An honest free plan: one report and one full post a month.",
    primaryKeyword: "free ai blog writer",
    metaTitle: "Free AI Blog Writer: 1 Full SEO Post a Month, No Card",
    metaDescription:
      "MyKavo's free AI blog writer gives you 1 keyword report and 1 full SEO post a month, plus monitoring for 1 website. No card, and the free plan does not expire.",
    keywords: [
      "free ai blog writer",
      "free ai writer",
      "free ai writing tool",
      "free blog writer",
      "ai blog writer free",
      "free blog post generator",
    ],
    hero: {
      ring: "MyKavo Free Plan",
      pre: "The free AI",
      solid: "BLOG",
      outline: "WRITER",
      accent: "with nothing hidden.",
      lede: "One keyword report and one complete SEO post every month, free, with no card and no expiry date. Fewer posts than an unlimited generator, and every one aimed at a search you can win.",
      chips: ["No card needed", "Free plan does not expire", "1 report + 1 post a month"],
      cta: "Start free, no card",
    },
    capsule:
      "MyKavo is a free AI blog writer with a plan that stays free: one keyword report and one complete SEO post every month, no card required, no expiry. The post includes a title, slug, meta description, article, FAQ, JSON-LD and review notes. The free plan also monitors one website for changes. Paid plans start at $7 a month.",
    widget: {
      kind: "topics",
      title: "Pick your free post",
      intro:
        "You get one free post a month, so make it count. Type a topic and see real searches people type into Google, grouped into posts. Choose the one your site has the best shot at.",
    },
    sections: [
      {
        id: "what-free-includes",
        eyebrow: "The free plan",
        title: "Exactly what you get for $0.",
        body: [
          "Every month the free plan gives you one keyword report and one full blog post. The report shows your top 10 keywords, ranked by what to write first. The post is the complete package, not a teaser: title, URL slug, meta description, the article itself, an FAQ, JSON-LD structured data and review notes.",
          "There is no card to enter and no trial clock running. Your allowance refills each month on the date you signed up, and the plan keeps going for as long as you use it. It also includes MyKavo's website monitoring for one site.",
        ],
        bullets: [
          "1 keyword report a month, top 10 keywords shown",
          "1 complete SEO blog post a month",
          "1 free rewrite on that post",
          "Website monitoring for 1 site",
          "Free WordPress plugin to save the post as a draft",
        ],
      },
      {
        id: "free-vs-paid",
        eyebrow: "Free vs paid",
        title: "When you need more, the steps are small and the prices are public.",
        body: [
          "The free plan is meant to be useful on its own, not a demo that pushes you to upgrade. If one post a month is enough for your site, stay on it. If you want to publish more often, paid plans add posts and reports, and show every keyword in each report instead of the top 10. Agency also covers up to 30 websites and adds white-label client reports.",
          "All paid plans bill monthly and you can cancel anytime. Allowances refill on your billing date. Every plan, free or paid, includes the same writer and the same post format.",
        ],
        bullets: [
          "Free, $0: 1 keyword report and 1 post a month",
          "Starter, $7 a month: 2 keyword reports and 3 posts",
          "Pro, $20 a month: 8 keyword reports and 10 posts, up to 3 team members",
          "Agency, $79 a month: 30 keyword reports and 40 posts, 30 websites, up to 15 team members",
        ],
        links: [{ label: "Compare all plans", href: "/pricing" }],
      },
      {
        id: "why-unlimited-free-fails",
        eyebrow: "The catch with unlimited",
        title: "Unlimited free posts are easy to give away. Posts that rank are not.",
        body: [
          "Many free AI writers let you generate as much as you like. The output is usually a page of fluent text on whatever you typed, with no idea whether anyone searches for it, what page one already shows, or how your site could compete. Publishing a pile of those does not build traffic. It builds a blog nobody visits.",
          "Google is also clear that using automation mainly to churn out low-value pages to manipulate rankings breaks its spam policies. One post aimed at a real search, matched to page one and improved with your own experience, is worth more than many generic ones.",
        ],
        links: [
          { label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" },
          { label: "What to blog about", href: "/blog/what-to-blog-about" },
        ],
      },
      {
        id: "make-one-post-count",
        eyebrow: "Spend it well",
        title: "One post a month can move the needle if it targets the right search.",
        body: [
          "Connect Google Search Console if you can. It is optional, but it lets MyKavo find searches you already rank for in positions 8 to 20. A focused post on one of those is often the fastest win, because Google already sees your site as relevant to it.",
          "Without Search Console, the report still uses Google suggestions and today's results to rank topics by what to write first. Look for a keyword with clear intent and beatable competition, write it well, and add something from your own work that the other results lack.",
        ],
        links: [
          { label: "Striking distance keywords", href: "/blog/striking-distance-keywords" },
          { label: "Finding low competition keywords", href: "/blog/low-competition-keywords" },
          { label: "Keyword research in Search Console", href: "/blog/google-search-console-keyword-research" },
        ],
      },
      {
        id: "monitoring-included",
        eyebrow: "Also free",
        title: "Your one website is watched while you write.",
        body: [
          "MyKavo started as website change monitoring, and the free plan includes it for one site. It keeps an eye on the pages you choose and tells you when something important changes, like a page going missing or a key SEO tag changing.",
          "That matters for content too. A new post does little good if a template change quietly breaks your titles or blocks indexing. The writer helps you grow traffic, and monitoring helps you keep it.",
        ],
      },
    ],
    compare: {
      title: "MyKavo Free vs a typical free AI writer",
      intro: "Both cost nothing. They are built for very different results.",
      columns: ["MyKavo Free", "Typical free AI writer"],
      rows: [
        { label: "Posts per month", mykavo: "1 complete post", other: "Often many, sometimes unlimited" },
        { label: "Where topics come from", mykavo: "Search Console data, Google suggestions, today's results", other: "Whatever you type" },
        { label: "SEO package", mykavo: "Title, slug, meta, FAQ and JSON-LD included", other: "Usually just the article text" },
        { label: "Review notes", mykavo: "What to verify and where to add experience", other: "None" },
        { label: "Card required", mykavo: "No", other: "Varies by tool" },
        { label: "Does the free plan expire", mykavo: "No, it refills every month", other: "Some free tiers are time-limited trials" },
        { label: "Extras", mykavo: "Website monitoring for 1 site", other: "Varies" },
      ],
      note: "A typical free AI writer is the better pick if you need a lot of short, general text every day, like captions or email drafts, rather than SEO blog posts.",
    },
    faqs: [
      {
        q: "Is there a completely free AI blog writer?",
        a: "Yes. MyKavo's free plan costs $0, needs no card and does not expire. Each month you get one keyword report and one complete SEO blog post, plus website monitoring for one site.",
      },
      {
        q: "What is the catch with MyKavo's free plan?",
        a: "The limit is volume, not quality. You get one post a month instead of unlimited posts, and the keyword report shows the top 10 keywords rather than all of them. The post itself is the same full package paid plans get.",
      },
      {
        q: "Do I need a credit card to start?",
        a: "No. You can sign up and use the free plan without entering any payment details. You only add a card if you choose a paid plan.",
      },
      {
        q: "When does my free post refill?",
        a: "On Free, your allowance refills monthly on the date you signed up. On paid plans it refills on your billing date.",
      },
      {
        q: "Which free AI writing tool is best for blog posts?",
        a: "It depends on what you want from the post. If you want it to target a real search, MyKavo builds each post from your Search Console data, Google suggestions and today's results, with the SEO package included. If you need lots of general text, a free chatbot may suit you better.",
      },
      {
        q: "How much do the paid plans cost?",
        a: "Starter is $7 a month for 2 keyword reports and 3 posts. Pro is $20 a month for 8 reports and 10 posts. Agency is $79 a month for 30 reports and 40 posts. All bill monthly and you can cancel anytime.",
      },
      {
        q: "Can I use the free plan with WordPress?",
        a: "Yes. The free MyKavo WordPress plugin saves your post as a draft in WordPress, and it works on the free plan. It never publishes for you.",
      },
    ],
    cta: {
      title: "Your first post is on us. So is the next one.",
      body: "Start free with no card. MyKavo learns your site, finds the search to write first and drafts a complete post today.",
    },
    related: [
      "/ai-blog-writer",
      "/best-ai-blog-writer",
      "/blog-post-generator",
      "/ai-blog-writer-for-wordpress",
      "/alternatives/jasper-alternative",
    ],
  },
  {
    path: "/blog-post-generator",
    navLabel: "Blog Post Generator",
    navBlurb: "From keyword to a complete, publish-ready draft in one click.",
    primaryKeyword: "blog post generator",
    metaTitle: "Blog Post Generator: Keyword to Complete Draft in One Click",
    metaDescription:
      "MyKavo's blog post generator turns a keyword into a full draft in one click: title, slug, meta, article, FAQ, JSON-LD and review notes. Start free, no card.",
    keywords: [
      "blog post generator",
      "ai blog post generator",
      "ai blog generator",
      "blog post writer",
      "ai blog post writer",
      "blog topic generator",
    ],
    hero: {
      ring: "MyKavo Post Generator",
      pre: "The AI blog",
      solid: "POST",
      outline: "GENERATOR",
      accent: "one click, every piece.",
      lede: "Pick a keyword from your report and MyKavo generates the whole post: article, metadata, FAQ and schema. You get a draft ready to edit, not a pile of parts to assemble.",
      chips: ["Title, slug and meta included", "1 free rewrite per post", "Stays a draft until you publish"],
      cta: "Generate your first post free",
    },
    capsule:
      "MyKavo's blog post generator turns one keyword into a complete draft in a single click. Each post includes a title, URL slug, meta description, the full article with H2 and H3 sections, an FAQ, JSON-LD structured data and review notes. Keywords come from your Search Console data, Google suggestions and today's results. Every post includes one free rewrite.",
    widget: {
      kind: "anatomy",
      title: "Take a generated post apart",
      intro:
        "Click through each part of a MyKavo post to see what it is, why it is there and what you should do with it before publishing.",
    },
    sections: [
      {
        id: "topics-worth-generating",
        eyebrow: "Before the click",
        title: "A generator is only as good as the topic you feed it.",
        body: [
          "Most blog post generators start with an empty box. You type an idea, it writes, and nobody checks whether people search for that idea at all. MyKavo works as a blog topic generator first. It reads your site, confirms a short profile of your business with you, and builds a keyword report.",
          "That report pulls from your Google Search Console data, Google search suggestions and today's live results, then ranks keywords by what to write first. Popularity is shown as a 1 to 5 estimate from autocomplete, not a monthly search volume, alongside how tough page one looks.",
        ],
        links: [
          { label: "What to blog about", href: "/blog/what-to-blog-about" },
          { label: "Low competition keywords", href: "/blog/low-competition-keywords" },
        ],
      },
      {
        id: "keyword-to-draft",
        eyebrow: "One click",
        title: "Choose a keyword. Get a draft you can actually publish.",
        body: [
          "Click a keyword and MyKavo generates the full post using what it knows about your business and what the current Google results cover for that search. There is no outline to approve, no tone menu to fiddle with and no sections to stitch together.",
          "The post lands in MyKavo's editor as a complete draft. Edit anything, then copy it to your site, or on WordPress save it as a draft with the free plugin. MyKavo never publishes on its own.",
        ],
        links: [{ label: "The free WordPress plugin", href: "/wordpress-plugin" }],
      },
      {
        id: "what-the-post-contains",
        eyebrow: "Anatomy",
        title: "Seven parts, each with a job.",
        body: [
          "A generated post is more than an article. It carries everything a search result needs and everything you need to finish the job well. Together the parts save you the busywork of writing metadata and markup by hand.",
          "The structured data and FAQ are written to match the article, so the questions in your schema are the questions on the page. Check the finished page with a structured data tool after publishing.",
        ],
        bullets: [
          "Title: written for the search result and the click",
          "URL slug: short, readable and built around the keyword",
          "Meta description: the snippet that sells the click",
          "Article: a short answer first, then H2 and H3 sections",
          "FAQ: related questions people actually ask",
          "JSON-LD: structured data ready to paste",
          "Review notes: what to verify and where to add your experience",
        ],
        links: [
          { label: "Structured data checker", href: "/tools/structured-data-checker" },
          { label: "Meta tag checker", href: "/tools/meta-tag-checker" },
        ],
      },
      {
        id: "one-free-rewrite",
        eyebrow: "Second take",
        title: "Not the angle you wanted? Rewrite it once, free.",
        body: [
          "Sometimes a draft is accurate but aimed slightly wrong: too basic for your readers, too broad for the search, or leaning on a point you would rather not make. Every post includes one free rewrite, so you can redirect it without using another post from your allowance.",
          "For smaller fixes, edit directly in the editor. Save the rewrite for when the whole approach needs to change, and tell it what to do differently so the second take lands closer.",
        ],
      },
      {
        id: "make-it-yours",
        eyebrow: "The last mile",
        title: "Turn the draft into something only you could have written.",
        body: [
          "A generated draft gives you structure, coverage and the SEO package. What it cannot give you is your experience. Google says it rewards helpful, original content however it is made, and originality is the part a generator cannot supply for you.",
          "Use the review notes as a checklist. Verify each flagged fact, then add what your competitors cannot copy: a real customer question, a result from your own work, a photo, a strong opinion or a step you learned the hard way. That short pass often matters more than the first draft.",
        ],
        bullets: [
          "Verify every claim the review notes flag",
          "Add one real example from your own work",
          "Cut any section that does not fit your audience",
          "Read the title and meta description out loud before publishing",
        ],
        links: [{ label: "The SEO blog post checklist", href: "/blog/seo-blog-post-checklist" }],
      },
    ],
    compare: {
      title: "MyKavo vs a template blog generator",
      intro: "Template generators fill in blanks. MyKavo starts from a search and finishes with a full SEO package.",
      columns: ["MyKavo Blog Post Generator", "Template blog generator"],
      rows: [
        { label: "Topic source", mykavo: "Search Console data, Google suggestions, today's results", other: "A topic you type" },
        { label: "Structure", mykavo: "Shaped by what page one covers for the keyword", other: "The same template for every topic" },
        { label: "Knows your business", mykavo: "Yes, from a profile you confirm once", other: "Only what you enter each time" },
        { label: "Metadata and schema", mykavo: "Title, slug, meta, FAQ and JSON-LD included", other: "Usually text only" },
        { label: "Review notes", mykavo: "Included with every post", other: "None" },
        { label: "Rewrites", mykavo: "One free rewrite per post", other: "Regenerate and start over" },
      ],
      note: "A template generator can be faster for simple, repetitive formats that follow the same pattern every time, like product announcements or event recaps.",
    },
    faqs: [
      {
        q: "What does an AI blog post generator do?",
        a: "It turns a topic or keyword into a written blog post. MyKavo goes further by choosing keywords from real search data first and generating the full SEO package with the article: title, slug, meta description, FAQ, JSON-LD and review notes.",
      },
      {
        q: "Is the generated post ready to publish?",
        a: "It is a complete draft, and you should still review it before publishing. Check the facts the review notes flag and add your own experience. That review is what makes the post trustworthy and original.",
      },
      {
        q: "Can MyKavo generate blog topics too?",
        a: "Yes. Every keyword report works as a blog topic generator built on real searches. It ranks keywords by what to write first, using your Search Console data, Google suggestions and today's results. The free plan shows the top 10 keywords per report.",
      },
      {
        q: "How many posts can I generate?",
        a: "The free plan includes one post a month. Starter includes 3, Pro 10 and Agency 40, and allowances refill every month. Each post also comes with one free rewrite.",
      },
      {
        q: "Does MyKavo show search volume for keywords?",
        a: "No. It shows a popularity estimate from 1 to 5 based on Google autocomplete, plus competition from today's results. If you need monthly search volume, use Google Keyword Planner alongside it.",
      },
      {
        q: "Can the generator post directly to my blog?",
        a: "No, and that is deliberate. MyKavo never publishes anything. On WordPress the free plugin saves the post as a draft for you to publish. On other platforms you copy it from the editor.",
      },
      {
        q: "Will generated blog posts get my site penalized?",
        a: "Google does not penalize content for being AI-generated. It acts against using automation mainly to mass-produce low-value pages. One reviewed post per real search, improved with your own experience, is the opposite of that.",
      },
    ],
    cta: {
      title: "From keyword to complete draft, in one click.",
      body: "Start free with no card. Get a keyword report and generate your first full post, metadata and schema included.",
    },
    related: [
      "/ai-blog-writer",
      "/ai-article-writer",
      "/free-ai-blog-writer",
      "/seo-blog-writer",
      "/ai-blog-writer-for-wordpress",
      "/alternatives/surfer-seo-alternative",
    ],
  },
];
