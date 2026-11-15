import type { WriterPage } from "./types";

/** /ai-blog-writer: the hub of the AI Writer cluster. Reference page for the others. */
export const hubPage: WriterPage = {
  path: "/ai-blog-writer",
  navLabel: "AI Blog Writer",
  navBlurb: "The hub: how MyKavo writes posts built to rank.",
  primaryKeyword: "ai blog writer",
  metaTitle: "AI Blog Writer Built to Rank: Posts From Real Search Data",
  metaDescription:
    "MyKavo is the AI blog writer that starts from your own Search Console data, Google suggestions and today's results, then writes the full SEO post: title, slug, meta, FAQ and schema. Free plan, no card.",
  keywords: [
    "ai blog writer",
    "ai blog writing",
    "ai blog",
    "blog ai",
    "ai blog writer that ranks",
    "ai writing tool for blogs",
    "ai seo blog writer",
  ],
  hero: {
    ring: "MyKavo AI Writer",
    pre: "The AI",
    solid: "BLOG",
    outline: "WRITER",
    accent: "built to rank.",
    lede: "Most AI posts never rank because they start from a blank prompt. MyKavo starts from real searches: your Search Console data, Google suggestions and today's results. Then it writes the whole post.",
    chips: ["From your Search Console data", "FAQ + JSON-LD in every post", "Checks today's Google results"],
    cta: "Write your first post free",
  },
  capsule:
    "MyKavo's AI blog writer finds the searches your site can actually win, from your own Google Search Console data, Google suggestions and today's live results, and then writes the complete SEO post in one click: title, URL slug, meta description, article, FAQ and JSON-LD. You edit it and publish it. The free plan includes one post a month.",
  widget: {
    kind: "anatomy",
      title: "Take a finished post apart",
      intro:
        "Every MyKavo post ships with eight parts that help it compete in search. Click through each one to see what it does and why it matters.",
  },
  sections: [
    {
      id: "why-ai-posts-dont-rank",
      eyebrow: "The real problem",
      title: "AI posts don't fail because they're AI. They fail because they're generic.",
      body: [
        "Google has said it rewards helpful, original content however it is made. What it pushes down is content made mainly to fill pages: the same advice everyone else wrote, aimed at a keyword nobody checked.",
        "A chatbot prompt produces exactly that. It does not know which searches your site already ranks for, what page one shows today, or what your business actually does. So the post reads fine and goes nowhere.",
      ],
      bullets: [
        "No real search behind the topic",
        "Written blind to what page one already shows",
        "Nothing only your business could say",
        "The SEO package left for you to build",
      ],
    },
    {
      id: "how-mykavo-writes-to-rank",
      eyebrow: "Built to rank",
      title: "Every post starts from a search you can win.",
      body: [
        "MyKavo reads your website first and writes a short profile of your business, audience, services and market that you confirm. Then it builds a keyword report from three sources: your own Search Console data, Google's suggestions and today's live results.",
        "It looks hardest at striking distance searches: the ones you already rank for in positions 8 to 20. A focused post or update there is the shortest path to page one, because Google has already decided you are relevant.",
      ],
      links: [
        { label: "What striking distance keywords are", href: "/blog/striking-distance-keywords" },
        { label: "Does AI content rank on Google?", href: "/blog/does-ai-content-rank-on-google" },
      ],
    },
    {
      id: "the-full-seo-package",
      eyebrow: "One click",
      title: "The whole post, not just the words.",
      body: [
        "Pick a keyword and MyKavo writes a complete, structured post: a title written for the click, a clean URL slug, a meta description, the article with a short answer up top and clear H2 sections, an FAQ, and JSON-LD structured data ready to paste.",
        "It also adds review notes: the facts to double check and the places where your own experience will make the post better than anything else on page one. That is the part that turns a draft into a post worth ranking.",
      ],
    },
    {
      id: "you-stay-in-charge",
      eyebrow: "No surprises",
      title: "It writes. You decide.",
      body: [
        "Nothing is ever published for you. Every post stays a draft in MyKavo's editor until you are happy with it. Copy it to any site, or on WordPress send it straight to your drafts with the free MyKavo plugin.",
        "Each post comes with one free rewrite, so you can change the angle without spending another post.",
      ],
      links: [{ label: "The free WordPress plugin", href: "/wordpress-plugin" }],
    },
  ],
  compare: {
    title: "MyKavo vs a chatbot prompt",
    intro: "Both can write a fluent draft. The difference is everything around the words.",
    columns: ["MyKavo AI Blog Writer", "Chatbot prompt"],
    rows: [
      { label: "Where the topic comes from", mykavo: "Your Search Console data, Google suggestions, today's results", other: "Whatever you type" },
      { label: "Knows your business", mykavo: "Yes, a profile you confirm once", other: "Only if you explain it every time" },
      { label: "Checks page one first", mykavo: "Yes, today's live results", other: "No, unless you paste them in" },
      { label: "Title, slug, meta, FAQ, schema", mykavo: "Included in every post", other: "You build them yourself" },
      { label: "Review notes", mykavo: "Facts to check, where to add experience", other: "No" },
      { label: "Into WordPress", mykavo: "Saved as a draft by the free plugin", other: "Copy and paste" },
    ],
    note: "A chatbot is the better choice for one-off writing that is not an SEO blog post, like emails or social captions.",
  },
  faqs: [
    {
      q: "Will posts written by MyKavo rank on Google?",
      a: "No tool can guarantee rankings. MyKavo improves your odds by starting every post from a real search you can win, often one you already rank 8 to 20 for, and by matching what page one shows today. Your own experience and fact checking do the rest.",
    },
    {
      q: "Is AI-written content against Google's guidelines?",
      a: "No. Google says it rewards helpful content however it is produced. Mass-producing low-value pages to manipulate rankings is against its spam policies, which is why MyKavo writes one focused post per real search and asks you to review it.",
    },
    {
      q: "Do I need Google Search Console?",
      a: "No, but it makes results better. Without it MyKavo still uses Google suggestions and today's results. With it, MyKavo can find the searches you already rank for, which are usually the fastest wins.",
    },
    {
      q: "Does MyKavo show search volume?",
      a: "No. It shows a popularity estimate from 1 to 5 based on Google autocomplete, plus competition from today's results. Use Google Keyword Planner alongside it if you need monthly volume numbers.",
    },
    {
      q: "Does it publish to my website?",
      a: "Never automatically. You copy the post from the editor, or on WordPress the free MyKavo plugin saves it as a draft for you to review and publish.",
    },
    {
      q: "How much does it cost?",
      a: "The free plan includes one keyword report and one post a month, with no card. Starter is $7 a month for 3 posts, Pro $20 for 10 and Agency $79 for 40.",
    },
  ],
  cta: {
    title: "Write a post built to rank.",
    body: "Start free. MyKavo learns your site, finds the searches you can win and writes your first post today.",
  },
  related: [
    "/best-ai-blog-writer",
    "/seo-blog-writer",
    "/free-ai-blog-writer",
    "/ai-blog-writer-for-wordpress",
    "/blog-post-generator",
    "/alternatives/jasper-alternative",
  ],
};
