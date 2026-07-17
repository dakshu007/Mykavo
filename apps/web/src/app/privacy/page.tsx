import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy - How MyKavo Handles Your Data",
  description:
    "Learn what data MyKavo collects, why we collect it, where it is stored, how long we keep it, and how to access, export, or delete your account data.",
  keywords: [
    "MyKavo privacy policy",
    "website monitoring privacy",
    "data protection",
    "GDPR data rights",
    "SaaS privacy policy",
  ],
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingPageShell
      eyebrowText="legal"
      title="Privacy Policy"
      intro="This policy explains, in plain English, what data MyKavo collects, why we collect it, where it lives, and the choices you have. MyKavo is operated by Dakshesh Babu, an independent developer. If anything here is unclear, email support@mykavo.app and you will get a straight answer."
      updated="July 17, 2026"
    >
      <h2>1. What data we collect</h2>
      <h3>Account data</h3>
      <p>
        When you create a MyKavo account we collect your name, email address, and a password
        (stored only as a secure hash - we never store your actual password). If you sign in with
        Google, we receive your name, email, and profile photo from Google instead. You can
        optionally add a profile photo and enable two-factor authentication, in which case we store
        your TOTP secret so we can verify your codes. At signup we check that your email address
        can actually receive mail, so alerts do not silently bounce.
      </p>
      <h3>Monitoring data</h3>
      <p>
        The core of MyKavo is the data you ask us to collect: the websites and URLs you choose to
        monitor, and the snapshots we capture of those pages - screenshots, SEO metadata (titles,
        descriptions, canonical tags), links, scripts, performance timings, and uptime and SSL
        checks. We scan public pages only, and our scanner respects robots.txt. You may only add
        websites you own or are authorized to monitor.
      </p>
      <h3>Billing data</h3>
      <p>
        Payments are processed by Dodo Payments, our merchant of record. Your card number goes
        directly to Dodo Payments and never touches MyKavo servers - we never see or store card
        details. We keep only the subscription records we need to know which plan your account is
        on.
      </p>
      <h3>Analytics and product emails</h3>
      <p>
        We use Google Analytics 4 on our public marketing pages (not inside the app dashboard) to
        understand how visitors find and use the site. When you sign up, your name and email may
        also be added to a private mailing list so we can send occasional product updates. You can
        opt out of these emails at any time by contacting{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
      </p>

      <h2>2. Why we collect it</h2>
      <ul>
        <li>
          <strong>To provide the service</strong> - scanning your pages, comparing them against
          baselines, and showing you what changed requires storing snapshots and scan history.
        </li>
        <li>
          <strong>To alert you</strong> - we use your email address to send change alerts,
          scan-failure notices, and other transactional messages about your account.
        </li>
        <li>
          <strong>To bill you</strong> - subscription records let us enforce plan limits and keep
          your Pro features active.
        </li>
        <li>
          <strong>To improve the product</strong> - aggregate analytics on marketing pages and
          occasional product-update emails help us build the right features.
        </li>
      </ul>
      <p>
        We do not sell your data. We do not share it with advertising networks. There is no
        cookie-based ad tracking anywhere on MyKavo.
      </p>

      <h2>3. Where your data lives (subprocessors)</h2>
      <p>
        MyKavo runs on a small set of infrastructure providers. Each one processes data only so we
        can deliver the service:
      </p>
      <table>
        <thead>
          <tr>
            <th>Provider</th>
            <th>Purpose</th>
            <th>Data involved</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Netlify (US)</td>
            <td>Application hosting</td>
            <td>App traffic, request logs</td>
          </tr>
          <tr>
            <td>Supabase (US)</td>
            <td>PostgreSQL database</td>
            <td>Account data, monitoring data, scan history</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>DNS and R2 object storage</td>
            <td>Screenshots and scan images</td>
          </tr>
          <tr>
            <td>Dodo Payments</td>
            <td>Billing (merchant of record)</td>
            <td>Payment details, subscription status</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Transactional email</td>
            <td>Your email address, alert content</td>
          </tr>
          <tr>
            <td>Google</td>
            <td>Optional Google sign-in, Analytics 4 on marketing pages, private mailing-list sheet</td>
            <td>Sign-in profile, anonymized page analytics, signup name and email</td>
          </tr>
        </tbody>
      </table>

      <h2>4. Cookies</h2>
      <p>
        MyKavo uses essential session cookies to keep you signed in, stores your theme preference
        in your browser&apos;s localStorage, and loads Google Analytics cookies on public marketing
        pages only. That is the full list - no advertising cookies, no third-party trackers inside
        the app. The details are in our <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>5. How long we keep data</h2>
      <p>
        Scan history is retained according to your plan: 30 days on Free and 1 year on Pro. Older
        snapshots and screenshots are cleaned up as they age out of your retention window. Account
        data is kept for as long as your account exists. If you ask us to delete your account, we
        delete your account data and monitoring data - just email{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
      </p>

      <h2>6. Your rights</h2>
      <p>You can, at any time:</p>
      <ul>
        <li>
          <strong>Access</strong> the data we hold about you - most of it is already visible in
          your dashboard.
        </li>
        <li>
          <strong>Export</strong> a copy of your account and monitoring data by requesting it
          through support.
        </li>
        <li>
          <strong>Correct</strong> your name, email, or profile details from your account
          settings.
        </li>
        <li>
          <strong>Delete</strong> your account and all associated data by emailing{" "}
          <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
        </li>
        <li>
          <strong>Opt out</strong> of product-update emails at any time via the same address.
        </li>
      </ul>
      <p>We respond to requests as quickly as we can, normally within a few business days.</p>

      <h2>7. Security</h2>
      <p>Reasonable, practical measures protect your data:</p>
      <ul>
        <li>All traffic to and from MyKavo is encrypted with TLS.</li>
        <li>Passwords are stored only as secure hashes, never in plain text.</li>
        <li>Optional two-factor authentication (TOTP) is available on every account.</li>
        <li>
          Storage credentials are scoped to the minimum access needed - for example, the
          screenshot store can only touch its own bucket.
        </li>
        <li>Card numbers never reach our systems; Dodo Payments handles all payment data.</li>
      </ul>
      <p>
        No system is perfectly secure, but if we ever become aware of a breach affecting your data,
        we will notify you promptly.
      </p>

      <h2>8. Children</h2>
      <p>
        MyKavo is not intended for anyone under 16. You must be at least 16 years old to create an
        account. We do not knowingly collect data from children; if you believe a child has created
        an account, contact us and we will delete it.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this policy as the product evolves. When we do, we will update the date at
        the top of this page, and for meaningful changes we will let you know by email or an
        in-app notice. Continued use of MyKavo after a change means you accept the updated policy.
      </p>

      <h2>10. Governing law and contact</h2>
      <p>
        MyKavo is operated by Dakshesh Babu, and this policy is governed by the laws of India. For
        any privacy question, data request, or concern, email{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>. You will hear back from a
        human.
      </p>
    </MarketingPageShell>
  );
}
