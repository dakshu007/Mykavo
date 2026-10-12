import Link from "next/link";
import type { ReactNode } from "react";
import { parseAnswer, type Block, type Inline } from "@/lib/support/markdown";

/**
 * Renders a support answer (the markdown subset in lib/support/markdown).
 * `visibleWords` cuts the answer after that many words, which is how the
 * assistant "types" an answer out; omit it to show everything.
 */
export function AnswerText({
  source,
  visibleWords,
  tone = "light",
}: {
  source: string;
  visibleWords?: number;
  tone?: "light" | "page";
}) {
  const blocks = parseAnswer(source);
  let budget = visibleWords ?? Number.POSITIVE_INFINITY;

  const take = (text: string): string | null => {
    if (budget <= 0) return null;
    const parts = text.split(/(\s+)/);
    let words = 0;
    let out = "";
    for (const part of parts) {
      if (part.trim()) {
        if (words >= budget) break;
        words += 1;
      }
      out += part;
    }
    budget -= words;
    return out;
  };

  const linkClass =
    tone === "page"
      ? "font-medium text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-2 hover:bg-[#FFF3B0]"
      : "font-medium text-[#151515] underline decoration-[#151515]/30 underline-offset-2 hover:decoration-[#151515]";

  const inline = (content: Inline[], key: string): ReactNode[] => {
    const out: ReactNode[] = [];
    content.forEach((node, i) => {
      const text = take(node.text);
      if (text === null) return;
      const k = `${key}-${i}`;
      if (node.type === "bold") out.push(<strong key={k} className="font-semibold">{text}</strong>);
      else if (node.type === "code")
        out.push(
          <code key={k} className="rounded bg-black/[0.06] px-1 py-0.5 font-mono text-[0.85em]">
            {text}
          </code>,
        );
      else if (node.type === "link") {
        const external = !node.href.startsWith("/");
        out.push(
          external ? (
            <a
              key={k}
              href={node.href}
              className={linkClass}
              {...(node.href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              {text}
            </a>
          ) : (
            <Link key={k} href={node.href} className={linkClass}>
              {text}
            </Link>
          ),
        );
      } else out.push(text);
    });
    return out;
  };

  const rendered: ReactNode[] = [];
  blocks.forEach((block: Block, i) => {
    if (budget <= 0) return;
    const key = `b${i}`;
    if (block.type === "p") {
      rendered.push(<p key={key}>{inline(block.content, key)}</p>);
      return;
    }
    const items: ReactNode[] = [];
    block.items.forEach((item, j) => {
      if (budget <= 0) return;
      items.push(<li key={`${key}-${j}`}>{inline(item, `${key}-${j}`)}</li>);
    });
    rendered.push(
      block.type === "ul" ? (
        <ul key={key} className="list-disc space-y-1 pl-5 marker:text-[#151515]/40">
          {items}
        </ul>
      ) : (
        <ol key={key} className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-[#151515]/60">
          {items}
        </ol>
      ),
    );
  });

  return <div className="space-y-2.5">{rendered}</div>;
}
