import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Cookie Policy - How MyKavo Uses Cookies",
  description:
    "Plain-English explanation of the cookies MyKavo uses: essential session cookies for signing in, a theme preference, and Google Analytics on marketing pages only. No advertising cookies, no cross-site tracking, no data selling.",
  keywords: [
    "MyKavo cookie policy",
    "website monitoring cookies",
    "essential cookies",
    "Google Analytics cookies",
    "cookie preferences",
  ],
  alternates: { canonical: "/cookies" },
};

export default function CookiePolicyPage() {
  return (
    <MarketingPageShell
      eyebrowText="legal"
      title="Cookie Policy"
      intro="MyKavo uses a small number of cookies to keep you signed in, remember your preferences, and understand how people find our marketing pages. This page explains exactly what we use, why, and how you can control it."
      updated="July 17, 2026"
    >
      <h2>What cookies are</h2>
      <p>
        Cookies are small text files that a website stores in your browser. They let a site
        remember things between page loads and between visits - for example, that you are signed
        in, or which theme you prefer. Some information can also be kept in your browser&apos;s
        localStorage, which works similarly but is never sent to our servers automatically. This
        policy covers both, so you get the complete picture.
      </p>

      <h2>What MyKavo uses</h2>
      <p>
        MyKavo (operated by Dakshesh Babu, reachable at{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>) uses three small groups of
        cookies and browser storage. That is the full list - there is nothing else.
      </p>
      <table>
        <thead>
          <tr>
            <th>Group</th>
            <th>What it is</th>
            <th>Purpose</th>
            <th>Where it applies</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Essential (required)</td>
            <td>
              Better Auth session cookie; a &quot;trust this device&quot; cookie if you enable
              two-factor authentication
            </td>
            <td>
              Keeps you signed in securely, protects your account, and (if you choose) remembers a
              device you trust so you are not asked for a two-factor code every time
            </td>
            <td>The MyKavo app (dashboard). Cannot be disabled - see below.</td>
          </tr>
          <tr>
            <td>Preferences</td>
            <td>Theme choice (light or dark) stored in localStorage - not a cookie</td>
            <td>Remembers how you like the interface to look</td>
            <td>Your browser only. It is never sent to our servers.</td>
          </tr>
          <tr>
            <td>Analytics</td>
            <td>Google Analytics 4 cookies (names beginning with _ga)</td>
            <td>
              Helps us understand overall traffic to our public marketing pages - which pages
              people visit and roughly where visits come from
            </td>
            <td>
              Public marketing pages only (homepage, pricing, blog, and similar). The dashboard
              you use after signing in has no analytics cookies at all.
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Essential authentication cookies</h3>
      <p>
        When you sign in, MyKavo sets a session cookie so the app knows the requests it receives
        are coming from you. If you turn on two-factor authentication and tick &quot;trust this
        device&quot;, we set one additional cookie so that device can skip the code prompt for a
        while. These cookies contain a session identifier, not your password, and they are
        strictly necessary for the service to work. Because of that, they cannot be switched off
        while you use MyKavo.
      </p>

      <h3>Theme preference</h3>
      <p>
        Your light or dark theme choice is saved in localStorage in your own browser. It is not a
        cookie, it does not identify you, and it never leaves your device. Clearing your
        browser&apos;s site data will simply reset the theme to its default.
      </p>

      <h3>Analytics on marketing pages</h3>
      <p>
        We use Google Analytics 4 on our public marketing pages to see aggregate traffic - how
        many people visit, which pages they read, and which channels bring them here. This helps
        us decide what content to improve. Google Analytics sets cookies whose names begin with
        _ga. We use this data only in aggregate; we do not use it to build advertising profiles,
        and it is not present anywhere inside the signed-in dashboard.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>No advertising cookies and no advertising networks of any kind.</li>
        <li>No cross-site tracking or retargeting pixels.</li>
        <li>No selling or renting of your data to anyone, ever.</li>
        <li>No analytics cookies inside the dashboard where you manage your websites.</li>
      </ul>

      <h2>How to control cookies</h2>
      <p>
        You can manage cookies directly in your browser. Every major browser lets you view,
        block, and delete cookies for individual sites:
      </p>
      <ul>
        <li>
          <strong>Chrome:</strong> Settings, then &quot;Privacy and security&quot;, then
          &quot;Third-party cookies&quot; and &quot;Site settings&quot;.
        </li>
        <li>
          <strong>Safari:</strong> Settings, then &quot;Privacy&quot;, then &quot;Manage Website
          Data&quot;.
        </li>
        <li>
          <strong>Firefox:</strong> Settings, then &quot;Privacy &amp; Security&quot;, under
          &quot;Cookies and Site Data&quot;.
        </li>
        <li>
          <strong>Edge:</strong> Settings, then &quot;Cookies and site permissions&quot;.
        </li>
      </ul>
      <p>
        If you want to opt out of Google Analytics everywhere, Google provides a browser add-on
        for that, and most browsers&apos; tracking-protection features will block _ga cookies as
        well. Blocking analytics cookies has no effect on how MyKavo works for you.
      </p>

      <h2>What happens if you block essential cookies</h2>
      <p>
        If your browser blocks or deletes the essential session cookie, MyKavo cannot keep you
        signed in. You will be able to browse the public marketing pages normally, but you will
        be signed out of the dashboard and will need to allow cookies for mykavo.app to sign back
        in. There is no workaround for this - it is how secure sign-in works.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we add, remove, or change the cookies MyKavo uses, we will update this page and the
        &quot;Last updated&quot; date above. Because our approach is deliberately minimal, we
        expect changes to be rare. Significant changes that affect signed-in users will also be
        communicated by email.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about cookies or anything privacy-related? Email us at{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a> and we will get back to you.
        You can also read our <Link href="/privacy">Privacy Policy</Link> for the full picture of
        how MyKavo handles your data.
      </p>
    </MarketingPageShell>
  );
}
