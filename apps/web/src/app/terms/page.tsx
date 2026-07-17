import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Terms of Service - MyKavo Website Monitoring",
  description:
    "The terms that govern your use of MyKavo website change detection and monitoring. Plain-English rules on accounts, acceptable use, billing, refunds and liability.",
  keywords: [
    "MyKavo terms of service",
    "website monitoring terms",
    "MyKavo terms and conditions",
    "MyKavo legal",
  ],
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <MarketingPageShell
      eyebrowText="legal"
      title="Terms of Service"
      intro="These terms are a plain-English agreement between you and MyKavo. By creating an account or using the service, you agree to them. If anything here is unclear, email support@mykavo.app and we will explain it."
      updated="July 17, 2026"
    >
      <h2>1. Who we are and what MyKavo does</h2>
      <p>
        MyKavo is a website change detection and regression monitoring service operated by
        Dakshesh Babu, an independent developer (referred to as &quot;MyKavo&quot;, &quot;we&quot;
        or &quot;us&quot;). MyKavo monitors the websites you add, captures snapshots of the pages
        you select (screenshots, SEO metadata, links, scripts and performance timings), compares
        them against approved baselines, and alerts you when something meaningful changes or
        breaks. Scanning reads publicly accessible pages only and respects robots.txt.
      </p>

      <h2>2. Your account</h2>
      <p>To use MyKavo you need an account, and you agree to a few basics:</p>
      <ul>
        <li>You must be at least 16 years old.</li>
        <li>
          You will provide accurate information when signing up (a real name and a working email
          address, whether you register directly or through Google sign-in).
        </li>
        <li>
          You are responsible for keeping your credentials safe and for all activity that happens
          under your account. We strongly recommend enabling two-factor authentication (TOTP) from
          your account settings.
        </li>
        <li>
          If you believe your account has been compromised, contact us at{" "}
          <a href="mailto:support@mykavo.app">support@mykavo.app</a> right away.
        </li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>MyKavo exists to help you look after websites you are responsible for. You agree to:</p>
      <ul>
        <li>
          Only monitor websites you own or are explicitly authorized to monitor (for example, a
          client site you maintain under contract).
        </li>
        <li>Use the service only for lawful purposes.</li>
        <li>
          Not attempt to overload, abuse or disrupt our scanning infrastructure, and not use MyKavo
          to overload or disrupt anyone else&apos;s website.
        </li>
        <li>
          Not attempt to circumvent plan limits, rate limits or security controls, including by
          creating multiple accounts to stack free-plan quotas.
        </li>
        <li>Not resell, scrape or reverse engineer the service without written permission.</li>
      </ul>
      <p>
        If we detect abuse, we may pause scans, suspend the account, or terminate it in serious
        cases. Where practical, we will contact you first.
      </p>

      <h2>4. Plans, billing and renewals</h2>
      <p>MyKavo offers two plans:</p>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Includes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>$0</td>
            <td>1 website, 5 monitored pages, weekly scans, 30-day history</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>$20 / month</td>
            <td>8 websites, 15 monitored pages each, daily scans, 1-year history</td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>
          Payments are processed by <strong>Dodo Payments</strong>, our merchant of record. MyKavo
          never sees or stores your card number.
        </li>
        <li>
          Pro is billed monthly and renews automatically each month until you cancel. Current
          pricing is always shown on the <Link href="/pricing">pricing page</Link>.
        </li>
        <li>
          You can cancel anytime from the Billing page in your dashboard. Cancellation takes effect
          at the end of the current billing period, and you keep Pro features until then.
        </li>
        <li>
          Refunds are handled case-by-case. If something went wrong, email{" "}
          <a href="mailto:support@mykavo.app">support@mykavo.app</a> and we will look at it fairly.
          Approved refunds are processed back through Dodo Payments.
        </li>
        <li>
          Plan limits (websites, pages, scan frequency, history retention) are enforced by the
          service and may be adjusted for new signups over time; we will not silently reduce the
          limits of an active paid subscription mid-cycle.
        </li>
      </ul>

      <h2>5. Service changes and availability</h2>
      <p>
        We work hard to keep MyKavo reliable, but it is provided on a best-effort basis. We do not
        guarantee uninterrupted availability, that every scan will run at the exact scheduled
        moment, or that every change on a monitored website will be detected. Monitoring results,
        snapshots and alerts are provided <strong>&quot;as is&quot;</strong> and should support,
        not replace, your own judgment about your websites.
      </p>
      <p>
        We may add, change or remove features as the product evolves. If we ever discontinue the
        service or remove something significant from a paid plan, we will give reasonable advance
        notice by email.
      </p>

      <h2>6. Your data and intellectual property</h2>
      <ul>
        <li>
          <strong>You own your data.</strong> The websites you configure, and the snapshots and
          scan history generated for them, belong to you. You grant us permission to store and
          process that data solely to provide the service.
        </li>
        <li>
          <strong>We own the service.</strong> The MyKavo software, design, branding and
          documentation are our intellectual property. These terms give you a limited,
          non-exclusive right to use the service; they do not transfer any ownership.
        </li>
        <li>
          Scan history is retained per plan (30 days on Free, 1 year on Pro). You can request
          deletion of your account and all associated data at any time via{" "}
          <a href="mailto:support@mykavo.app">support@mykavo.app</a>. How we handle personal data
          is described in our <Link href="/privacy">Privacy Policy</Link>.
        </li>
      </ul>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, MyKavo is not liable for indirect, incidental or
        consequential damages, including lost revenue, lost data or losses caused by changes or
        outages on your websites that the service did not detect or alert on. Our total liability
        for any claim arising out of the service is capped at the fees you paid to MyKavo in the
        three months before the event giving rise to the claim (which, for Free plan users, is
        zero). Nothing in these terms excludes liability that cannot be excluded under applicable
        law.
      </p>

      <h2>8. Termination</h2>
      <ul>
        <li>
          <strong>By you:</strong> you can stop using MyKavo and delete your account at any time by
          contacting <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
        </li>
        <li>
          <strong>By us:</strong> we may suspend or terminate accounts that violate these terms,
          abuse the service or infrastructure, or fail to pay for a Pro subscription. For anything
          other than serious abuse, we will attempt to contact you before taking action.
        </li>
        <li>
          On termination, your monitoring stops and your data is scheduled for deletion in line
          with our retention practices.
        </li>
      </ul>

      <h2>9. Governing law</h2>
      <p>
        These terms are governed by the laws of India, the operator&apos;s jurisdiction. Any
        disputes will be subject to the courts of India, though we would always rather resolve
        issues directly over email first.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms as the product and the law evolve. When we make a material
        change, we will update the &quot;Last updated&quot; date at the top of this page and, for
        significant changes, notify account holders by email. Continuing to use MyKavo after a
        change takes effect means you accept the updated terms.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions about these terms? Email{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>. MyKavo is operated by Dakshesh
        Babu, an independent developer.
      </p>
    </MarketingPageShell>
  );
}
