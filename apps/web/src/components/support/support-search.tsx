"use client";

import { ArrowRight, Search } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { SUPPORT_ASK_EVENT, type SupportAskDetail } from "@/components/support/support-assistant";

function openAssistant(detail: SupportAskDetail) {
  window.dispatchEvent(new CustomEvent<SupportAskDetail>(SUPPORT_ASK_EVENT, { detail }));
}

/** The hero search: whatever is typed goes to the assistant. */
export function SupportSearch() {
  const [value, setValue] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const question = value.trim();
    if (!question) return;
    openAssistant({ question });
    setValue("");
  }

  return (
    <form onSubmit={submit} className="relative mx-auto w-full max-w-2xl">
      <label htmlFor="support-search" className="sr-only">
        Ask a question about MyKavo
      </label>
      <div className="flex items-center gap-2 rounded-2xl border-2 border-[#151515] bg-white py-2 pl-4 pr-2 shadow-[5px_5px_0_#151515] transition-shadow focus-within:shadow-[7px_7px_0_#151515]">
        <Search className="size-5 shrink-0 text-[#6B6B60]" aria-hidden />
        <input
          id="support-search"
          value={value}
          onChange={(e) => setValue(e.target.value.slice(0, 500))}
          placeholder="Ask a question, e.g. why did I get an alert?"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent py-2 text-[16px] text-[#151515] outline-none placeholder:text-[#6B6B60]"
        />
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#151515] px-4 py-2.5 text-[14px] font-semibold text-[#FFD400] transition-transform hover:scale-[1.03] active:scale-100"
        >
          Ask
          <ArrowRight className="size-4" />
        </button>
      </div>
    </form>
  );
}

/** Opens the assistant on one article, as if the person had asked it. */
export function AskButton({
  articleId,
  title,
  className,
  children,
}: {
  articleId: string;
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button type="button" onClick={() => openAssistant({ articleId, title })} className={className}>
      {children ?? title}
    </button>
  );
}

/** Opens the assistant with a free-text question. */
export function AskQuestionButton({ question, className, children }: { question: string; className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => openAssistant({ question })} className={className}>
      {children ?? question}
    </button>
  );
}
