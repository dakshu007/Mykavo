"use client";

import { ArrowUp, ChevronRight, Mail, MessageCircle, RotateCcw, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import { AnswerText } from "@/components/support/answer-text";
import { wordCount } from "@/lib/support/markdown";
import {
  ASSISTANT_NAME,
  GREETING,
  NOT_HELPFUL_REPLY,
  SUPPORT_EMAIL,
  supportMailto,
} from "@/lib/support/replies";
import type { ArticleRef, AssistantMessage } from "@/lib/support/respond";

/**
 * The support assistant: a round button in the bottom-right corner of
 * /support that opens a chat panel. Answers come from /api/support/ask (the
 * knowledge-base matcher) and are typed out word by word. Every answer offers
 * a way to a person at support@mykavo.app.
 *
 * Other parts of the page open it with a "mykavo:support-ask" window event
 * carrying { question } or { articleId }.
 */

export const SUPPORT_ASK_EVENT = "mykavo:support-ask";
export type SupportAskDetail = { question: string } | { articleId: string; title: string };

interface UserTurn {
  id: string;
  role: "user";
  text: string;
}

interface BotTurn {
  id: string;
  role: "bot";
  message: AssistantMessage;
  /** The question this answers, for the email hand-over. */
  question: string | null;
  logId: string | null;
  words: number;
  revealed: number;
  feedback?: "up" | "down";
}

type Turn = UserTurn | BotTurn;

const STARTERS = [
  "How do I add a website?",
  "Why did I get an alert I didn't expect?",
  "How do I connect WordPress?",
  "How do I cancel my plan?",
];

const STORAGE_KEY = "mykavo-support-chat-v1";
const MAX_STORED_TURNS = 40;

let turnCounter = 0;
const nextId = () => `t${Date.now().toString(36)}${(turnCounter++).toString(36)}`;

function botTurn(message: AssistantMessage, question: string | null, logId: string | null, instant: boolean): BotTurn {
  const words = wordCount(message.text);
  return { id: nextId(), role: "bot", message, question, logId, words, revealed: instant ? words : 0 };
}

function greetingTurn(): BotTurn {
  return botTurn(
    { kind: "smalltalk", text: GREETING, article: null, options: [], offerEmail: false, score: 1 },
    null,
    null,
    true,
  );
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function loadTurns(): Turn[] | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Turn[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    // Anything still typing when the page closed is shown in full.
    return parsed.map((t) => (t.role === "bot" ? { ...t, revealed: t.words } : t));
  } catch {
    return null;
  }
}

function saveTurns(turns: Turn[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-MAX_STORED_TURNS)));
  } catch {
    // Storage blocked: the chat still works, it just won't survive a reload.
  }
}

export function SupportAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>(() => [greetingTurn()]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [unread, setUnread] = useState(true);
  const restored = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (restored.current) saveTurns(turns);
  }, [turns]);

  // A small "Ask me anything" nudge a few seconds after landing.
  useEffect(() => {
    const show = window.setTimeout(() => setNudge(true), 2500);
    const hide = window.setTimeout(() => setNudge(false), 14000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  // Type out the newest bot message.
  const typing = turns.find((t): t is BotTurn => t.role === "bot" && t.revealed < t.words);
  useEffect(() => {
    if (!typing) return;
    const step = Math.max(1, Math.ceil(typing.words / 70));
    const timer = window.setTimeout(() => {
      setTurns((all) => all.map((t) => (t.id === typing.id && t.role === "bot" ? { ...t, revealed: Math.min(t.words, t.revealed + step) } : t)));
    }, 28);
    return () => window.clearTimeout(timer);
  }, [typing]);

  // Follow the text as it types, but never scroll the latest question out of
  // view: a long answer should be read from its first line.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const questions = el.querySelectorAll<HTMLElement>("[data-user-turn]");
    const anchor = questions[questions.length - 1];
    const bottom = el.scrollHeight - el.clientHeight;
    el.scrollTop = anchor ? Math.min(bottom, anchor.offsetTop - 12) : bottom;
  }, [turns, thinking, open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  /** Opens the panel; the first time, brings back this tab's conversation. */
  const openPanel = useCallback(() => {
    if (!restored.current) {
      restored.current = true;
      const saved = loadTurns();
      if (saved) setTurns(saved);
    }
    setOpen(true);
    setUnread(false);
    setNudge(false);
  }, []);

  const lastArticleId = [...turns].reverse().find((t): t is BotTurn => t.role === "bot" && Boolean(t.message.article))?.message.article?.id;

  const ask = useCallback(
    async (payload: { question: string } | { articleId: string; title: string }) => {
      if (busy.current) return;
      busy.current = true;
      const shown = "question" in payload ? payload.question : payload.title;
      setTurns((all) => [...all, { id: nextId(), role: "user", text: shown }]);
      setThinking(true);
      const started = Date.now();
      let turn: BotTurn;
      try {
        const body =
          "question" in payload
            ? { question: payload.question, ...(lastArticleId ? { contextArticleId: lastArticleId } : {}) }
            : { articleId: payload.articleId };
        const res = await fetch("/api/support/ask", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as { id?: string | null; message?: AssistantMessage; error?: string } | null;
        if (!res.ok || !data?.message) throw new Error(data?.error ?? "Something went wrong.");
        turn = botTurn(data.message, shown, data.id ?? null, prefersReducedMotion());
      } catch (err) {
        turn = botTurn(
          {
            kind: "fallback",
            text: `${err instanceof Error ? err.message : "Something went wrong."} You can always email [${SUPPORT_EMAIL}](mailto:${SUPPORT_EMAIL}).`,
            article: null,
            options: [],
            offerEmail: true,
            score: 0,
          },
          shown,
          null,
          true,
        );
      }
      // A short beat of "thinking" so an instant answer doesn't feel canned.
      const wait = Math.max(0, 650 + Math.min(500, shown.length * 6) - (Date.now() - started));
      window.setTimeout(() => {
        setThinking(false);
        setTurns((all) => [...all, turn]);
        busy.current = false;
      }, prefersReducedMotion() ? 0 : wait);
    },
    [lastArticleId],
  );

  // Let the page's search box and topic links open the assistant.
  useEffect(() => {
    const onAsk = (event: Event) => {
      const detail = (event as CustomEvent<SupportAskDetail>).detail;
      if (!detail) return;
      openPanel();
      void ask(detail);
    };
    window.addEventListener(SUPPORT_ASK_EVENT, onAsk);
    return () => window.removeEventListener(SUPPORT_ASK_EVENT, onAsk);
  }, [ask, openPanel]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        bubbleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const question = input.trim();
    if (!question || busy.current) return;
    setInput("");
    void ask({ question });
  }

  function onInputKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  function rate(turn: BotTurn, helpful: boolean) {
    setTurns((all) => {
      const next = all.map((t) => (t.id === turn.id && t.role === "bot" ? { ...t, feedback: helpful ? ("up" as const) : ("down" as const) } : t));
      if (helpful) return next;
      return [
        ...next,
        botTurn(
          { kind: "fallback", text: NOT_HELPFUL_REPLY, article: null, options: [], offerEmail: true, score: 0 },
          turn.question,
          null,
          prefersReducedMotion(),
        ),
      ];
    });
    if (turn.logId) {
      void fetch("/api/support/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: turn.logId, helpful }),
      }).catch(() => undefined);
    }
  }

  function reset() {
    busy.current = false;
    setThinking(false);
    setTurns([greetingTurn()]);
    inputRef.current?.focus();
  }

  const onlyGreeting = turns.length === 1;
  const finished = turns.filter((t): t is BotTurn => t.role === "bot" && t.revealed >= t.words);
  const lastFinished = finished[finished.length - 1];

  return (
    <>
      {/* The panel */}
      <div
        role="dialog"
        aria-modal="false"
        aria-label={ASSISTANT_NAME}
        aria-hidden={!open}
        className={`fixed z-[60] flex flex-col overflow-hidden border-[#151515] bg-[#FBFAF3] text-[#151515] transition-all duration-200 ease-out motion-reduce:transition-none max-sm:inset-0 sm:bottom-[6.25rem] sm:right-6 sm:h-[min(660px,calc(100svh-8.5rem))] sm:w-[400px] sm:rounded-2xl sm:border-2 sm:shadow-[6px_6px_0_#151515] ${
          open ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-3 opacity-0"
        }`}
      >
        <header className="relative flex items-center gap-3 bg-[#151515] px-4 py-3.5 text-[#E9EBDF]">
          <div className="relative grid size-10 shrink-0 place-items-center rounded-full bg-[#FFD400]">
            <LogoMark size={22} className="text-[#151515]" />
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-[#151515] bg-[#2BD576]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-tight text-white">{ASSISTANT_NAME}</p>
            <p className="text-[12px] text-[#9C9E93]">Answers instantly, any time</p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="grid size-9 place-items-center rounded-full text-[#9C9E93] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            aria-label="Start a new conversation"
            title="New conversation"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              bubbleRef.current?.focus();
            }}
            className="grid size-9 place-items-center rounded-full text-[#9C9E93] transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD400]"
            aria-label="Close the assistant"
          >
            <X className="size-5" />
          </button>
        </header>

        <div ref={scrollRef} className="relative flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5">
          {turns.map((turn) =>
            turn.role === "user" ? (
              <div key={turn.id} data-user-turn className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#151515] px-3.5 py-2.5 text-[14px] leading-6 text-white">
                  {turn.text}
                </p>
              </div>
            ) : (
              <BotBubble
                key={turn.id}
                turn={turn}
                complete={turn.revealed >= turn.words}
                showFeedback={turn === lastFinished && (turn.message.kind === "answer" || turn.message.kind === "pick") && !thinking}
                onOption={(o) => void ask({ articleId: o.id, title: o.title })}
                onRate={(helpful) => rate(turn, helpful)}
              />
            ),
          )}

          {onlyGreeting && !thinking ? (
            <div className="flex flex-wrap gap-2 pl-10">
              {STARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void ask({ question: q })}
                  className="rounded-full border border-[#151515]/15 bg-white px-3 py-1.5 text-left text-[13px] font-medium text-[#151515] transition-all hover:-translate-y-px hover:border-[#151515] hover:shadow-[2px_2px_0_#151515]"
                >
                  {q}
                </button>
              ))}
            </div>
          ) : null}

          {thinking ? (
            <div className="flex items-end gap-2" aria-label={`${ASSISTANT_NAME} is typing`}>
              <BotAvatar />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-black/10 bg-white px-4 py-3.5">
                <span className="size-1.5 animate-bounce rounded-full bg-[#151515]/60 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[#151515]/60 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-[#151515]/60" />
              </div>
            </div>
          ) : null}
        </div>

        {/* Screen readers hear each finished answer once. */}
        <p className="sr-only" aria-live="polite">
          {lastFinished && lastFinished !== turns[0] ? lastFinished.message.text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/\*\*/g, "") : ""}
        </p>

        <form onSubmit={submit} className="border-t border-black/10 bg-white px-3 pb-3 pt-3">
          <div className="flex items-end gap-2 rounded-2xl border-2 border-[#151515]/15 bg-[#FBFAF3] py-1.5 pl-3.5 pr-1.5 transition-colors focus-within:border-[#151515]">
            <label htmlFor="support-assistant-input" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="support-assistant-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, 500))}
              onKeyDown={onInputKey}
              rows={1}
              placeholder="Ask anything about MyKavo..."
              className="max-h-28 min-h-[2.25rem] flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-6 text-[#151515] outline-none placeholder:text-[#6B6B60]"
            />
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-[#151515] text-[#FFD400] transition-all hover:scale-105 disabled:scale-100 disabled:bg-[#151515]/20 disabled:text-white"
              aria-label="Send"
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </button>
          </div>
          <p className="mt-2 text-center text-[11.5px] text-[#6B6B60]">
            Still stuck?{" "}
            <a href={supportMailto(lastFinished?.question ?? undefined)} className="font-medium text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-2">
              Email {SUPPORT_EMAIL}
            </a>
          </p>
        </form>
      </div>

      {/* The nudge */}
      {nudge && !open ? (
        <button
          type="button"
          onClick={openPanel}
          className="fixed bottom-[5.6rem] right-6 z-[60] max-w-[230px] animate-[support-pop_0.25s_ease-out] rounded-2xl rounded-br-md border-2 border-[#151515] bg-white px-3.5 py-2.5 text-left text-[13.5px] font-medium leading-5 text-[#151515] shadow-[3px_3px_0_#151515] motion-reduce:animate-none max-sm:right-4"
        >
          Hi! Ask me anything about MyKavo. I answer instantly.
        </button>
      ) : null}

      {/* The round button */}
      <button
        ref={bubbleRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-expanded={open}
        aria-label={open ? "Close the assistant" : `Open ${ASSISTANT_NAME}`}
        className={`fixed bottom-6 right-6 z-[61] grid size-[60px] place-items-center rounded-full border-2 border-[#151515] bg-[#FFD400] text-[#151515] shadow-[3px_3px_0_#151515] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[4px_5px_0_#151515] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515] active:translate-y-0 active:shadow-[1px_1px_0_#151515] max-sm:bottom-4 max-sm:right-4 ${
          open ? "max-sm:hidden" : ""
        }`}
      >
        <span className={`absolute transition-all duration-200 ${open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}>
          <MessageCircle className="size-[26px]" strokeWidth={2.2} />
        </span>
        <span className={`absolute transition-all duration-200 ${open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}>
          <X className="size-[26px]" strokeWidth={2.4} />
        </span>
        {unread && !open ? (
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full border-2 border-[#FBFAF3] bg-[#E5484D] text-[10px] font-bold text-white">
            1
          </span>
        ) : null}
      </button>

      <style>{`@keyframes support-pop { from { opacity: 0; transform: translateY(6px) scale(0.96); } to { opacity: 1; transform: none; } }`}</style>
    </>
  );
}

function BotAvatar() {
  return (
    <div className="grid size-8 shrink-0 place-items-center rounded-full border border-[#151515]/10 bg-[#FFD400]" aria-hidden>
      <LogoMark size={16} className="text-[#151515]" />
    </div>
  );
}

function BotBubble({
  turn,
  complete,
  showFeedback,
  onOption,
  onRate,
}: {
  turn: BotTurn;
  complete: boolean;
  showFeedback: boolean;
  onOption: (option: ArticleRef) => void;
  onRate: (helpful: boolean) => void;
}) {
  const { message } = turn;
  return (
    <div className="flex items-start gap-2">
      <BotAvatar />
      <div className="min-w-0 max-w-[88%] space-y-2">
        <div className="rounded-2xl rounded-tl-md border border-black/10 bg-white px-3.5 py-3 text-[14px] leading-6 text-[#151515]">
          {message.article && complete ? (
            <p className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">
              {message.article.category}
            </p>
          ) : null}
          <AnswerText source={message.text} visibleWords={complete ? undefined : turn.revealed} />
          {!complete ? <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-[#151515]" aria-hidden /> : null}
        </div>

        {complete && message.options.length > 0 ? (
          <div className="space-y-1.5">
            {message.kind !== "suggest" ? (
              <p className="pl-1 text-[11.5px] font-medium text-[#6B6B60]">Related</p>
            ) : null}
            {message.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onOption(o)}
                className="group flex w-full items-center gap-2 rounded-xl border border-[#151515]/15 bg-white px-3 py-2 text-left text-[13px] font-medium text-[#151515] transition-all hover:border-[#151515] hover:shadow-[2px_2px_0_#151515]"
              >
                <span className="flex-1">{o.title}</span>
                <ChevronRight className="size-4 shrink-0 text-[#6B6B60] transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        ) : null}

        {complete && message.offerEmail ? (
          <a
            href={supportMailto(turn.question ?? undefined, message.article?.title)}
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#151515] bg-[#FFD400] px-3.5 py-1.5 text-[13px] font-semibold text-[#151515] shadow-[2px_2px_0_#151515] transition-all hover:-translate-y-px hover:shadow-[3px_3px_0_#151515]"
          >
            <Mail className="size-4" />
            Email {SUPPORT_EMAIL}
          </a>
        ) : null}

        {showFeedback ? (
          turn.feedback ? (
            <p className="pl-1 text-[12px] text-[#6B6B60]">
              {turn.feedback === "up" ? "Glad that helped!" : "Thanks for telling us."}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-[12px] text-[#6B6B60]">Did this answer your question?</span>
              <button
                type="button"
                onClick={() => onRate(true)}
                className="grid size-7 place-items-center rounded-full text-[#6B6B60] transition-colors hover:bg-[#2BD576]/15 hover:text-[#151515]"
                aria-label="Yes, this helped"
              >
                <ThumbsUp className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRate(false)}
                className="grid size-7 place-items-center rounded-full text-[#6B6B60] transition-colors hover:bg-[#E5484D]/15 hover:text-[#151515]"
                aria-label="No, I still need help"
              >
                <ThumbsDown className="size-3.5" />
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}
