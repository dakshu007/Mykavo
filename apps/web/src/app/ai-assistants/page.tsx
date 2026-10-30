import type { Metadata } from "next";
import Link from "next/link";
import { withSocial } from "@/lib/social-metadata";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";
import { getPlan } from "@/config/plans";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { site } from "@/config/site";

export const metadata: Metadata = withSocial({
  title: "MyKavo for ChatGPT and Claude - Ask About Your Websites",
  description:
    "Connect MyKavo to ChatGPT, Claude or any MCP client and ask what changed on your websites, which site needs attention and what the latest audit says. Read-only, OAuth sign-in.",
  keywords: ["mykavo chatgpt", "mykavo claude connector", "website monitoring mcp server", "mcp website monitoring"],
  alternates: { canonical: "/ai-assistants" },
});

const endpoint = `${site.url.replace(/\/+$/, "")}/api/mcp`;
const proCap = getPlan("pro").limits.aiAssistantCallsPerDay.toLocaleString("en-US");
const agencyCap = getPlan("agency").limits.aiAssistantCallsPerDay.toLocaleString("en-US");

const faqs = [
  {
    q: "Which plans include the ChatGPT and Claude connector?",
    a: `Pro and Agency, including the free Pro trial. Pro includes ${proCap} assistant lookups a day per workspace and Agency ${agencyCap}. On Free and Starter the assistant explains that the connector needs Pro.`,
  },
  {
    q: "Can the assistant change anything in my MyKavo account?",
    a: "No. Every tool is read-only. An assistant can read websites, changes, scans, audits and AI crawler visits, but it can't change settings, approve changes, add websites or start scans.",
  },
  {
    q: "Does MyKavo see my conversations?",
    a: "No. MyKavo only receives the specific lookups the assistant makes, such as \"list open changes for example.com\". It never receives your prompts or the rest of the conversation.",
  },
  {
    q: "How do I disconnect an assistant?",
    a: "Open AI assistants in the MyKavo dashboard and click Disconnect next to the app. Its access ends immediately. You can also remove MyKavo from the assistant's own connector settings.",
  },
  {
    q: "Does it work with tools other than ChatGPT and Claude?",
    a: "Yes. MyKavo is a standard remote MCP server with OAuth, so Claude Code, Cursor, VS Code and other MCP clients can connect by URL. Tools that can't sign in can use a workspace API key instead.",
  },
];

export default function AiAssistantsPage() {
  return (
    <MarketingPageShell
      eyebrowText="ai assistants"
      title="Ask ChatGPT and Claude about your websites"
      intro="MyKavo connects to ChatGPT, Claude and any MCP-compatible assistant. Ask in plain words what changed this week, which client site needs attention or what the latest audit found, and get answers from your real monitoring data, with links to the before-and-after in MyKavo."
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "AI assistants", path: "/ai-assistants" }])) }}
      />

      <h2>What you need</h2>
      <ul>
        <li>
          A MyKavo account on the <Link href="/pricing">Pro or Agency plan</Link> (the free Pro trial works too), with at
          least one website being monitored.
        </li>
        <li>ChatGPT, Claude, or another assistant that supports MCP connectors.</li>
      </ul>
      <p>
        Server URL: <code>{endpoint}</code>
      </p>

      <h2>Connect Claude</h2>
      <ol>
        <li>
          In Claude, open <strong>Customize &gt; Connectors</strong>, select <strong>+ Add</strong>, then{" "}
          <strong>Add custom connector</strong>. On Claude Team or Enterprise, an owner adds it once in{" "}
          <strong>Organization settings &gt; Connectors</strong> (Add, Custom, Web).
        </li>
        <li>
          Name it <strong>MyKavo</strong>, paste the server URL above and click Continue.
        </li>
        <li>Keep the sign-in settings Claude detects and click Add.</li>
        <li>
          Click <strong>Connect</strong>, sign in to MyKavo, choose the workspace and click <strong>Allow</strong>.
        </li>
      </ol>
      <p>It works in Claude on the web, the desktop app and the mobile apps.</p>

      <h2>Connect ChatGPT</h2>
      <ol>
        <li>
          On the web, open <strong>chatgpt.com/plugins</strong>, select <strong>+</strong>, then{" "}
          <strong>Add custom MCP server</strong>.
        </li>
        <li>
          Name it <strong>MyKavo</strong> and paste the server URL above.
        </li>
        <li>
          Choose <strong>OAuth</strong>, accept the notice and select <strong>Create as a plugin</strong>.
        </li>
        <li>
          Sign in to MyKavo and click <strong>Allow</strong>. Then type <code>@MyKavo</code> in a chat.
        </li>
      </ol>

      <h2>Connect Claude Code, Cursor and other tools</h2>
      <p>
        Claude Code: run <code>claude mcp add --transport http mykavo {endpoint}</code>, then type <code>/mcp</code> to
        sign in. Cursor, VS Code and most MCP clients sign in from the URL alone. Tools that can&apos;t use OAuth can
        send a workspace API key, created in <strong>AI assistants</strong> in the dashboard, as an{" "}
        <code>Authorization: Bearer</code> header.
      </p>

      <h2>What you can ask</h2>
      <ul>
        <li>&quot;Is anything wrong with my websites right now?&quot;</li>
        <li>&quot;What changed on my client sites this week?&quot;</li>
        <li>&quot;Show the critical changes on example.com and what caused them.&quot;</li>
        <li>&quot;Summarise the latest site audit for example.com. What should I fix first?&quot;</li>
        <li>&quot;When did example.com last scan, and did any pages fail?&quot;</li>
        <li>&quot;Which AI crawlers read example.com this month?&quot;</li>
      </ul>

      <h2>Tools</h2>
      <p>Every tool is read-only and only sees the one workspace you approved.</p>
      <ul>
        {MCP_TOOLS.map((t) => (
          <li key={t.name}>
            <strong>{t.title}</strong> (<code>{t.name}</code>): {t.description}
          </li>
        ))}
      </ul>

      <h2>Permissions, privacy and limits</h2>
      <ul>
        <li>
          <strong>Sign-in:</strong> standard OAuth with PKCE. You approve each assistant for one workspace on a MyKavo
          screen that names the app and where it returns you. Tokens are short-lived and stored only as hashes.
        </li>
        <li>
          <strong>Read-only:</strong> assistants can&apos;t change anything in MyKavo.
        </li>
        <li>
          <strong>Your conversations stay with the AI provider:</strong> MyKavo receives only the lookups the
          assistant makes. See the <Link href="/privacy#ai-assistants">privacy policy</Link>.
        </li>
        <li>
          <strong>Daily limit:</strong> {proCap} lookups a day per workspace on Pro and {agencyCap} on Agency, resetting
          at midnight UTC.
        </li>
        <li>
          <strong>Disconnect any time:</strong> in <strong>AI assistants</strong> in the dashboard. Access ends
          immediately.
        </li>
      </ul>

      <h2>Troubleshooting</h2>
      <ul>
        <li>
          <strong>&quot;Part of the Pro and Agency plans&quot;</strong>: the workspace you approved is on Free or
          Starter. Upgrade it, or reconnect and choose a Pro or Agency workspace.
        </li>
        <li>
          <strong>Sign-in loops or the app says it isn&apos;t registered</strong>: remove MyKavo from the assistant and
          add it again with the exact server URL.
        </li>
        <li>
          <strong>No data</strong>: the workspace has no monitored websites yet. Add one in the dashboard and wait for
          its first scan.
        </li>
      </ul>
      <p>
        Still stuck? Email <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
      </p>

      <h2>Frequently asked questions</h2>
      {faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}
    </MarketingPageShell>
  );
}
