import type { Metadata } from "next";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { ToolFaqSection } from "@/components/landing/tool-faq";
import { ToolConversionCta } from "@/components/tools/tool-conversion-cta";
import { SSL_CHECKER_FAQS } from "@/config/tool-faqs";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { SslChecker } from "./ssl-checker";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Free SSL Certificate Checker - Expiry Date & Chain",
  description:
    "Free SSL certificate checker: see when a site's certificate expires, days left, the issuer, every hostname it covers, and whether the chain is trusted and complete.",
  alternates: { canonical: "/tools/ssl-certificate-checker" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "SSL Certificate Checker",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Free SSL certificate checker: see when a site's certificate expires, days left, the issuer, every hostname it covers, and whether the chain is trusted and complete.",
  url: `${site.url}/tools/ssl-certificate-checker`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: site.name, url: site.url },
};

export default function SslCertificateCheckerPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />
      <main className="mx-auto max-w-225 px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// free tool //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            SSL Certificate{" "}
            <span className="relative inline-block">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">Checker</span>
            </span>
          </h1>
          <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
            Enter a domain to see when its SSL certificate expires, how many days are left, who issued it, which hostnames it covers and whether browsers trust the chain. Free, no account needed.
          </p>
        </div>

        <SslChecker />

        <section className="mx-auto mt-20 max-w-2xl space-y-6 text-[15px] leading-7 text-[#3d3d38]">
          <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
            Why certificates still expire by surprise
          </h2>
          <p>
            Most certificates are now issued automatically and last 90 days, renewing on their own about a month before expiry. That&apos;s why an expiry is so disruptive when it does happen: nobody has thought about the certificate in months, the renewal job failed quietly after a server move or a DNS change, and the first sign is a full-page browser warning in front of every visitor.
          </p>
          <p>
            This checker connects to the site over HTTPS on port 443, exactly as a browser does, and reads the certificate the server presents. It shows the expiry date and days remaining, the issuer, every hostname the certificate covers and whether yours is one of them, and whether the chain verifies. A common hidden fault is a missing intermediate certificate: browsers often recover, but apps, payment webhooks and older devices fail.
          </p>
          <p>
            MyKavo checks the certificate of every website you monitor, on every plan including Free, and alerts you by email and your chat channels when it gets within 14 days of expiring - alongside the page-change monitoring it&apos;s built for.
          </p>
        </section>

        <ToolConversionCta
          heading="Hear about an expiring certificate 14 days early, not from a customer."
          body="MyKavo checks the certificate of every website you monitor - on every plan, including Free - and alerts you when it's within 14 days of expiry."
        />

        <ToolFaqSection faqs={SSL_CHECKER_FAQS} toolName="SSL Certificate Checker" toolPath="/tools/ssl-certificate-checker" />
      </main>
      <LandingFooter />
    </div>
  );
}
