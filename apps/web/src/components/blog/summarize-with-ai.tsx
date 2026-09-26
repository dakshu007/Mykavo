"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Cpu, ExternalLink, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * "Summarize this post" - two ways, neither of which costs MyKavo anything:
 *
 * 1. ON THIS DEVICE, with the browser's built-in AI (Chrome's Summarizer API,
 *    Gemini Nano). The model runs locally; the post text never leaves the
 *    reader's machine and no request reaches us or anyone else. Shown only
 *    when the model is ALREADY on the device ("available"): a reader will
 *    not sit through a multi-gigabyte model download to summarize one post,
 *    so "downloadable" is treated the same as unsupported.
 *
 * 2. IN AN ASSISTANT the reader already uses - ChatGPT, Claude, Perplexity,
 *    Gemini - opened in a new tab with a prompt pointing at this post's
 *    public URL. The assistant fetches the page like any visitor would.
 *    Gemini has no documented way to pre-fill a prompt, so for Gemini the
 *    prompt is copied and the reader pastes it: saying so beats pretending.
 */

type Availability = "unavailable" | "downloadable" | "downloading" | "available";

interface SummarizerOptions {
  type?: "key-points" | "tldr" | "teaser" | "headline";
  format?: "markdown" | "plain-text";
  length?: "short" | "medium" | "long";
  sharedContext?: string;
  expectedInputLanguages?: string[];
  outputLanguage?: string;
}

interface SummarizerInstance {
  summarize(input: string, options?: { context?: string }): Promise<string>;
  inputQuota?: number;
  measureInputUsage?(input: string): Promise<number>;
  destroy(): void;
}

interface SummarizerApi {
  availability(options?: SummarizerOptions): Promise<Availability>;
  create(options?: SummarizerOptions): Promise<SummarizerInstance>;
}

const OPTIONS: SummarizerOptions = {
  type: "key-points",
  format: "markdown",
  length: "medium",
  expectedInputLanguages: ["en"],
  outputLanguage: "en",
  sharedContext: "A blog post about website monitoring, SEO and catching website regressions.",
};

function summarizerApi(): SummarizerApi | null {
  const api = (globalThis as { Summarizer?: SummarizerApi }).Summarizer;
  return api && typeof api.availability === "function" ? api : null;
}

/** Fit the article into the model's input budget, shortening from the end. */
async function fitToQuota(summarizer: SummarizerInstance, text: string): Promise<string> {
  let input = text.slice(0, 24_000);
  const quota = summarizer.inputQuota;
  if (!quota || !summarizer.measureInputUsage || !Number.isFinite(quota)) return input.slice(0, 12_000);
  for (let i = 0; i < 6; i++) {
    const usage = await summarizer.measureInputUsage(input);
    if (usage <= quota) return input;
    input = input.slice(0, Math.floor(input.length * (quota / usage) * 0.9));
  }
  return input;
}

/** Model output is markdown bullets; render them as text, never as HTML. */
function toPoints(summary: string): string[] {
  return summary
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").replace(/\*\*|__|`/g, "").trim())
    .filter(Boolean);
}

export function SummarizeWithAi({ url }: { url: string }) {
  const [local, setLocal] = useState<Availability | "checking">("checking");
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const api = summarizerApi();
    let cancelled = false;
    Promise.resolve<Availability>(api ? api.availability(OPTIONS) : "unavailable")
      .then((a) => !cancelled && setLocal(a))
      .catch(() => !cancelled && setLocal("unavailable"));
    return () => {
      cancelled = true;
    };
  }, []);

  const prompt = `Summarize this article in 5 key points, then say who it is most useful for: ${url}`;
  const q = encodeURIComponent(prompt);
  const assistants = [
    { id: "chatgpt", name: "ChatGPT", href: `https://chatgpt.com/?q=${q}` },
    { id: "claude", name: "Claude", href: `https://claude.ai/new?q=${q}` },
    { id: "perplexity", name: "Perplexity", href: `https://www.perplexity.ai/search?q=${q}` },
  ];

  async function summarizeHere() {
    const api = summarizerApi();
    const body = document.querySelector<HTMLElement>("[data-post-body]")?.innerText ?? "";
    if (!api || !body.trim()) return;
    setBusy(true);
    setError(null);
    track("blog_ai_summary", { provider: "on_device" });
    let summarizer: SummarizerInstance | null = null;
    try {
      summarizer = await api.create(OPTIONS);
      const input = await fitToQuota(summarizer, body);
      const summary = await summarizer.summarize(input, { context: document.title });
      setPoints(toPoints(summary));
    } catch {
      setError("Your browser could not summarize this post on this device. The assistants below still work.");
    } finally {
      summarizer?.destroy();
      setBusy(false);
    }
  }

  async function openGemini() {
    track("blog_ai_summary", { provider: "gemini" });
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 4000);
    } catch {
      // Clipboard blocked - Gemini still opens; the reader can copy the link.
    }
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  }

  const pill =
    "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#151515]/15 bg-white px-3.5 text-[13px] font-semibold text-[#151515] transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[2px_2px_0_#151515] motion-reduce:hover:translate-y-0";
  const showLocal = local === "available";

  return (
    <section aria-label="Summarize this post" className="mb-8 rounded-2xl border border-black/10 bg-white/70 p-5 text-[#151515] sm:p-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">Summarize with AI</p>
        <div className="flex flex-wrap gap-2">
          {showLocal && (
            <button
              type="button"
              onClick={summarizeHere}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#151515] bg-[#FFD400] px-3.5 text-[13px] font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-y-0.5 disabled:opacity-70 motion-reduce:hover:translate-y-0"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Cpu className="size-3.5" aria-hidden />}
              {busy ? "Summarizing…" : "On this device"}
            </button>
          )}
          {assistants.map((a) => (
            <a
              key={a.id}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("blog_ai_summary", { provider: a.id })}
              className={pill}
            >
              {a.name} <ExternalLink className="size-3 opacity-50" aria-hidden />
            </a>
          ))}
          <button type="button" onClick={openGemini} className={pill}>
            Gemini {copied ? <Check className="size-3 text-[#16A34A]" aria-hidden /> : <Copy className="size-3 opacity-50" aria-hidden />}
          </button>
        </div>
      </div>

      <p className="mt-3 text-[12.5px] leading-5 text-[#6B6B60]" aria-live="polite">
        {copied
          ? "Prompt copied - paste it into Gemini."
          : showLocal
            ? `"On this device" uses your browser's built-in AI - instant, and the text never leaves your computer. The others open in a new tab.`
            : "Opens the assistant in a new tab with a link to this post."}
      </p>

      {error && <p className="mt-3 text-[13px] text-[#B42318]">{error}</p>}

      {points && points.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#151515]/15 bg-white p-4">
          <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#6B6B60]">
            Summary · made on your device
          </p>
          <ul className="mt-2 space-y-1.5">
            {points.map((p, i) => (
              <li key={i} className="flex gap-2 text-[14.5px] leading-6">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#FFD400] ring-1 ring-[#151515]/30" />
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-[#6B6B60]">AI-generated summary - the post itself is the source.</p>
        </div>
      )}
    </section>
  );
}
