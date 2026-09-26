"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Share this post - plain share links (no third-party widgets or scripts)
 * plus copy-link. Used under the post and in the sidebar.
 */
export function ShareButtons({ url, title, compact = false }: { url: string; title: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const links = [
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: "x", label: "X", href: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(title)}` },
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("cta_clicked", { cta: "blog_share", target: "copy" });
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked: the address bar still has the link.
    }
  }

  const pill = `inline-flex ${compact ? "h-8 px-3 text-[12.5px]" : "h-9 px-3.5 text-[13px]"} items-center gap-1.5 rounded-full border border-[#151515]/15 bg-white font-semibold text-[#151515] transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[2px_2px_0_#151515] motion-reduce:hover:translate-y-0`;

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.id}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("cta_clicked", { cta: "blog_share", target: l.id })}
          className={pill}
        >
          {l.label}
        </a>
      ))}
      <button type="button" onClick={copy} className={pill} aria-live="polite">
        {copied ? <Check className="size-3.5 text-[#16A34A]" aria-hidden /> : <Link2 className="size-3.5" aria-hidden />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
