"use client";

import type { ComponentType, ReactNode } from "react";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { ListOrdered, MessageCircleQuestion, X, Zap } from "lucide-react";
import {
  CtaBlockNode,
  FaqBlockNode,
  TocBlockNode,
} from "@/lib/blog-editor/shortcode-nodes";
import { joinFaqRaw, splitFaqRaw } from "@/lib/blog-editor/markdown-roundtrip";
import { cn } from "@/lib/utils";

/**
 * React node views for the MyKavo shortcode blocks inside the visual editor.
 * The nodes themselves (schema + byte-exact markdown round-trip) live in
 * lib/blog-editor/shortcode-nodes.ts; these views only add the editor chrome.
 */

function ChipShell({
  selected,
  icon,
  title,
  description,
  onRemove,
  children,
}: {
  selected: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onRemove: () => void;
  children?: ReactNode;
}) {
  return (
    <NodeViewWrapper
      as="div"
      data-drag-handle
      className={cn(
        "my-4 cursor-grab rounded-tile border border-primary/15 bg-primary-soft/50 px-4 py-3",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          {icon}
        </span>
        <span className="min-w-0 flex-1 text-sm">
          <span className="font-medium text-ink">{title}</span>
          <span className="text-ink-secondary"> - {description}</span>
        </span>
        <button
          type="button"
          onClick={onRemove}
          title={`Remove ${title}`}
          aria-label={`Remove ${title}`}
          className="shrink-0 rounded-full p-1 text-ink-faint transition-colors hover:bg-card hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {children}
    </NodeViewWrapper>
  );
}

function CtaChipView({ selected, deleteNode }: ReactNodeViewProps) {
  return (
    <ChipShell
      selected={selected}
      icon={<Zap className="size-4" aria-hidden />}
      title="MyKavo CTA"
      description="Start-free call to action"
      onRemove={deleteNode}
    />
  );
}

function TocChipView({ selected, deleteNode }: ReactNodeViewProps) {
  return (
    <ChipShell
      selected={selected}
      icon={<ListOrdered className="size-4" aria-hidden />}
      title="Table of contents"
      description="generated from headings"
      onRemove={deleteNode}
    />
  );
}

/**
 * FAQ region - the exact raw source is kept on the node; only the inner
 * Q:/A: lines are exposed for editing so the delimiters (and an untouched
 * region as a whole) stay byte-identical.
 */
function FaqBlockView({ node, selected, deleteNode, updateAttributes }: ReactNodeViewProps) {
  const raw = String(node.attrs.raw ?? "");
  const { open, body, close } = splitFaqRaw(raw);
  const rows = Math.min(14, Math.max(4, body.split("\n").length + 1));

  return (
    <ChipShell
      selected={selected}
      icon={<MessageCircleQuestion className="size-4" aria-hidden />}
      title="FAQ section"
      description="Q:/A: pairs, rendered as an accordion"
      onRemove={deleteNode}
    >
      <textarea
        value={body}
        rows={rows}
        spellCheck={false}
        aria-label="FAQ questions and answers"
        onChange={(event) =>
          updateAttributes({ raw: joinFaqRaw(open, event.target.value, close) })
        }
        className="mt-3 w-full cursor-text resize-y rounded-field border border-line bg-card px-3 py-2 font-mono text-[13px] leading-6 text-ink focus:border-primary focus:outline-none"
      />
      <p className="mt-1.5 text-[12px] text-ink-faint">
        Lines starting with <span className="font-mono">Q:</span> open a question,{" "}
        <span className="font-mono">A:</span> lines answer it. Answers support markdown.
      </p>
    </ChipShell>
  );
}

/** Keep typing and selection inside the FAQ textarea away from ProseMirror. */
const stopFormEvents = ({ event }: { event: Event }) =>
  event.target instanceof HTMLTextAreaElement ||
  event.target instanceof HTMLInputElement ||
  event.target instanceof HTMLButtonElement;

function withView(
  node: typeof CtaBlockNode,
  view: ComponentType<ReactNodeViewProps>,
): typeof CtaBlockNode {
  return node.extend({
    addNodeView() {
      return ReactNodeViewRenderer(view, { stopEvent: stopFormEvents });
    },
  });
}

export const CtaBlockWithView = withView(CtaBlockNode, CtaChipView);
export const TocBlockWithView = withView(TocBlockNode, TocChipView);
export const FaqBlockWithView = withView(FaqBlockNode, FaqBlockView);
