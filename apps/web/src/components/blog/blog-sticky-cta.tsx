"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { GoogleIcon } from "@/components/brand/integration-icons";

/**
 * A slim sign-up bar for phones and tablets while reading a post. Desktop
 * has the sticky rail card; below lg there was nothing between the top of
 * the post and the very end. It appears once the reader is a quarter of the
 * way in, steps aside near the end (where the full CTA is) and can be closed
 * for the rest of the visit.
 */
export function BlogStickyCta() {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    let closedEarlier = false;
    try {
      closedEarlier = Boolean(window.sessionStorage.getItem("mk-blog-bar-closed"));
    } catch {
      // Storage blocked: the bar can still be closed for this page.
    }
    if (closedEarlier) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? window.scrollY / max : 0;
      setVisible(progress > 0.25 && progress < 0.9);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (closed) return null;

  return (
    <div
      className={`fixed inset-x-3 bottom-3 z-40 transition-all duration-300 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#151515] bg-[#151515] py-2.5 pl-4 pr-2 text-[#E9EBDF] shadow-[4px_4px_0_#FFD400]">
        <p className="min-w-0 flex-1 text-[13px] leading-5">
          <span className="font-semibold text-white">Get alerted when your site breaks.</span>{" "}
          <span className="text-[#9C9E93]">Free, no card.</span>
        </p>
        <a
          href="/signup?provider=google&from=blog:sticky"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#FFD400] px-4 text-[13px] font-semibold text-[#151515]"
        >
          <GoogleIcon className="size-4" />
          Start free
        </a>
        <button
          type="button"
          onClick={() => {
            setClosed(true);
            try {
              window.sessionStorage.setItem("mk-blog-bar-closed", "1");
            } catch {
              // ignore
            }
          }}
          aria-label="Close"
          className="grid size-8 shrink-0 place-items-center rounded-full text-[#9C9E93] hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
