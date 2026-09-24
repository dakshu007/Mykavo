import type { Metadata } from "next";
import Image from "next/image";
import { Download } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";

export const metadata: Metadata = {
  title: "Brand Assets - MyKavo Logo and Colors",
  description:
    "Download the MyKavo logo, logomark and app icon in SVG and PNG, with the brand colors and simple usage guidelines for partners and press.",
  alternates: { canonical: "/brand" },
};

const assets: Array<{ file: string; label: string; format: string; preview: string; dark?: boolean }> = [
  { file: "mykavo-logo-light.png", label: "Logo on white", format: "PNG", preview: "mykavo-logo-light.png" },
  { file: "mykavo-logo-dark.png", label: "Logo on dark", format: "PNG", preview: "mykavo-logo-dark.png", dark: true },
  { file: "mykavo-logo-transparent.png", label: "Logo, transparent background", format: "PNG", preview: "mykavo-logo-transparent.png" },
  { file: "mykavo-icon-1200.png", label: "App icon, 1200 x 1200", format: "PNG", preview: "mykavo-icon-1200.png", dark: true },
  { file: "mykavo-mark-gold.svg", label: "Logomark, gold", format: "SVG", preview: "mykavo-mark-gold.svg", dark: true },
  { file: "mykavo-mark-black.svg", label: "Logomark, black", format: "SVG", preview: "mykavo-mark-black.svg" },
  { file: "mykavo-mark-white.svg", label: "Logomark, white", format: "SVG", preview: "mykavo-mark-white.svg", dark: true },
];

const colors = [
  { name: "MyKavo Gold", hex: "#FFD400" },
  { name: "Ink", hex: "#151515" },
  { name: "Paper", hex: "#FBFAF3" },
];

export default function BrandPage() {
  return (
    <MarketingPageShell
      eyebrowText="brand"
      title="Brand assets"
      intro="The MyKavo logo, logomark and app icon for partners, marketplaces and press. Download everything at once, or the single file you need."
    >
      <div className="not-prose">
        <a
          href="/brand/mykavo-brand-assets.zip"
          download
          className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-transform hover:-translate-y-0.5"
        >
          <Download className="size-4" aria-hidden />
          Download all assets (ZIP)
        </a>
      </div>

      <h2>Logos and icons</h2>
      <ul className="not-prose grid list-none gap-4 pl-0 sm:grid-cols-2">
        {assets.map((a) => (
          <li key={a.file} className="overflow-hidden rounded-2xl border border-black/10 bg-white">
            <div
              className={`flex h-36 items-center justify-center p-6 ${a.dark ? "bg-[#151515]" : "bg-[#F3F1E6]"}`}
            >
              <Image
                src={`/brand/${a.preview}`}
                alt={a.label}
                width={240}
                height={120}
                unoptimized
                className="h-auto max-h-24 w-auto max-w-full"
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <p className="text-[14px] font-medium text-[#151515]">
                {a.label} <span className="font-mono text-[12px] text-[#6B6B60]">{a.format}</span>
              </p>
              <a
                href={`/brand/${a.file}`}
                download
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-3 py-1.5 text-[13px] font-medium text-[#151515] hover:bg-[#F3F1E6]"
                aria-label={`Download ${a.label}`}
              >
                <Download className="size-3.5" aria-hidden />
                Download
              </a>
            </div>
          </li>
        ))}
      </ul>

      <h2>Colors</h2>
      <ul className="not-prose grid list-none grid-cols-3 gap-3 pl-0">
        {colors.map((c) => (
          <li key={c.hex} className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <div className="h-16" style={{ backgroundColor: c.hex }} />
            <div className="px-3 py-2">
              <p className="text-[13px] font-medium text-[#151515]">{c.name}</p>
              <p className="font-mono text-[12px] text-[#6B6B60]">{c.hex}</p>
            </div>
          </li>
        ))}
      </ul>

      <h2>Using the logo</h2>
      <ul>
        <li>The name is written MyKavo: one word, capital M and K.</li>
        <li>Use the gold logomark on dark or white backgrounds, and the black one on gold.</li>
        <li>Keep clear space around the logo of at least the width of the logomark.</li>
        <li>Do not stretch, recolor, rotate or add effects to the logo.</li>
      </ul>
      <p>
        Partnership or press question? Write to{" "}
        <a href="mailto:support@mykavo.app">support@mykavo.app</a>.
      </p>
    </MarketingPageShell>
  );
}
