import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Support - Get Help with MyKavo Website Monitoring",
  description:
    "Need help with MyKavo? Email support@mykavo.app and get a reply within one business day. Bug report tips, billing help, self-serve guides, free tools and answers to common monitoring questions.",
  keywords: [
    "MyKavo support",
    "website monitoring help",
    "MyKavo contact",
    "website change detection support",
    "MyKavo billing help",
  ],
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <MarketingPageShell
      eyebrowText="support"
      title="How can we help?"
      intro="Real answers from the person who builds MyKavo. Most emails get a reply within one business day, and nothing you send disappears into a ticket queue."
      updated="July 17, 2026"
    >
      <h2>Contact us</h2>
      <p>
        The fastest way to reach us is email:{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>. MyKavo is built and run by an
        independent developer, so your message goes straight to the person who can actually fix the
        problem. Typical reply time is within one business day, and often much sooner.
      </p>
      <p>
        Whatever you write in - a bug, a billing question, a feature idea, or just something that
        felt confusing - we genuinely want to hear it. Feedback from early users directly shapes
        what gets built next.
      </p>

      <h2>Reporting a bug</h2>
      <p>
        A little context goes a long way. If something looks broken, including these details in
        your first email usually means we can fix it without a back-and-forth:
      </p>
      <ul>
        <li>
          <strong>Your account email</strong> - so we can find your workspace and look at the right
          data.
        </li>
        <li>
          <strong>The website or scan affected</strong> - the site name or URL, and roughly when the
          scan ran if you know it.
        </li>
        <li>
          <strong>What you expected vs. what you saw</strong> - for example, &quot;I expected no
          change events, but the scan flagged a visual change on a page I did not touch.&quot;
        </li>
        <li>
          <strong>A screenshot</strong>, if the problem is visual - optional, but it often makes the
          issue obvious at a glance.
        </li>
      </ul>
      <p>
        You do not need to write a formal report. A couple of honest sentences plus the details
        above is perfect.
      </p>

      <h2>Billing help</h2>
      <p>
        Almost everything billing-related is self-serve. Your renewal date, current plan, and the
        cancel button all live on the{" "}
        <Link href="/dashboard/billing">Billing page</Link> in your dashboard. Plans are billed
        monthly and you can cancel anytime - no phone calls, no retention flows.
      </p>
      <p>
        Payments are processed by Dodo Payments, our merchant of record, which means MyKavo never
        sees or stores your card number. If you believe you were charged in error or want to
        request a refund, email <a href="mailto:support@mykavo.app">support@mykavo.app</a> and we
        will look at it case by case. Approved refunds are processed back through Dodo Payments to
        your original payment method.
      </p>

      <h2>Help yourself first</h2>
      <p>Many questions are answered faster by the product itself:</p>
      <ul>
        <li>
          <Link href="/dashboard">Your dashboard</Link> - websites, scans, change events, and
          settings all in one place.
        </li>
        <li>
          <Link href="/pricing">Plans and pricing</Link> - what the Free and Pro plans include,
          side by side.
        </li>
        <li>
          <Link href="/blog">Guides on the blog</Link> - practical walkthroughs on monitoring,
          baselines, and reducing false positives.
        </li>
        <li>
          Free tools, no account needed:{" "}
          <Link href="/tools/website-change-detector">Website Change Detector</Link>,{" "}
          <Link href="/tools/meta-tag-checker">Meta Tag Checker</Link>,{" "}
          <Link href="/tools/redirect-chain-checker">Redirect Chain Checker</Link>,{" "}
          <Link href="/tools/bulk-url-status-checker">Bulk URL Status Checker</Link>, and{" "}
          <Link href="/tools/script-detector">Script Detector</Link>.
        </li>
      </ul>

      <h2>Frequently asked questions</h2>

      <h3>How do I add a website?</h3>
      <p>
        From your <Link href="/dashboard">dashboard</Link>, click Add Website and enter the URL.
        MyKavo validates the site, discovers its pages, and lets you pick exactly which ones to
        monitor. The first scan creates your baseline - the approved &quot;known good&quot; state
        that every future scan is compared against. One thing to keep in mind: you should only
        monitor websites you own or are authorized to monitor.
      </p>

      <h3>Why did my scan show a change I did not make?</h3>
      <p>
        Modern pages often contain content that changes on every load - rotating banners, dates,
        cookie widgets, ads, or animation frames caught mid-motion. MyKavo works hard to filter
        this noise, but some dynamic areas need a hint from you. In your website settings you can
        add <strong>ignored selectors</strong> (CSS selectors MyKavo skips during comparison) and{" "}
        <strong>screenshot masks</strong> (regions blanked out before visual comparison). Add one
        for the noisy element, re-run a scan, and the false alarms stop.
      </p>

      <h3>How do alerts work?</h3>
      <p>
        Every detected change gets a severity level: Info, Low, Medium, High, or Critical. Critical
        and High changes - things like a page returning 404, a noindex tag appearing, or an
        analytics script disappearing - trigger email alerts. Rather than sending one email per
        change, MyKavo groups everything found in a scan into a single summary email per website,
        so a deploy that touches twenty pages produces one readable alert, not twenty.
      </p>

      <h3>How do I cancel my subscription?</h3>
      <p>
        Open <Link href="/dashboard/billing">Billing</Link> in your dashboard and click cancel.
        Your Pro features stay active until the end of the period you have already paid for, then
        your account moves to the Free plan. Your account and monitoring history are not deleted
        when you cancel.
      </p>

      <h3>Is my data safe?</h3>
      <p>
        Yes. MyKavo only scans public pages of the websites you choose, respects robots.txt, and
        never sells your data. Payments are handled entirely by Dodo Payments, so card numbers
        never touch our servers. For the full details on what we collect, where it is stored, and
        how to request deletion, read our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Still stuck?</h2>
      <p>
        Email <a href="mailto:support@mykavo.app">support@mykavo.app</a> with whatever you have -
        even &quot;this feels wrong but I cannot explain why&quot; is a useful report. We will take
        it from there.
      </p>
    </MarketingPageShell>
  );
}
