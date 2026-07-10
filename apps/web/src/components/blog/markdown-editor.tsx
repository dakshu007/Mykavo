"use client";

import { useRef, useState } from "react";
import { BLOCK_SNIPPETS, type BlockSnippet } from "@/components/blog/blocks";
import { PostContent } from "@/components/blog/post-content";
import { cn } from "@/lib/utils";

/**
 * The original markdown editing mode: a monospace textarea with the "/"
 * block-snippet menu and a live preview. Kept as the fallback "Markdown" tab
 * behind the visual editor.
 */

const fieldClass =
  "w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

// Content textarea metrics (from its classes: py-3 + leading-6) used to place
// the "/" insert menu just below the line the slash was typed on.
const CONTENT_PADDING_TOP = 12;
const CONTENT_LINE_HEIGHT = 24;

interface SlashMenuState {
  /** Index of the "/" character in the content string. */
  position: number;
  /** Pixel offset of the menu from the top of the textarea. */
  top: number;
}

export function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [slashMenu, setSlashMenu] = useState<SlashMenuState | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);

  /**
   * Opens the "/" block menu when the caret sits right after a "/" that is
   * alone on its line (i.e. "/" typed on an empty line); closes it as soon
   * as the line stops matching.
   */
  function handleContentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = event.target.value;
    onChange(next);

    const caret = event.target.selectionStart;
    const lineStart = next.lastIndexOf("\n", caret - 1) + 1;
    const lineEnd = next.indexOf("\n", caret);
    const line = next.slice(lineStart, lineEnd === -1 ? next.length : lineEnd);

    if (line === "/" && caret === lineStart + 1) {
      const el = event.target;
      const row = next.slice(0, lineStart).split("\n").length - 1;
      const rawTop =
        CONTENT_PADDING_TOP + (row + 1) * CONTENT_LINE_HEIGHT - el.scrollTop + 4;
      const top = Math.min(Math.max(rawTop, 8), Math.max(el.clientHeight - 8, 8));
      setSlashMenu({ position: lineStart, top });
      setSlashIndex(0);
    } else if (slashMenu) {
      setSlashMenu(null);
    }
  }

  function handleContentKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!slashMenu) return;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setSlashIndex((index) => (index + 1) % BLOCK_SNIPPETS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        setSlashIndex(
          (index) => (index - 1 + BLOCK_SNIPPETS.length) % BLOCK_SNIPPETS.length,
        );
        break;
      case "Enter":
      case "Tab":
        event.preventDefault();
        insertSnippet(BLOCK_SNIPPETS[slashIndex]);
        break;
      case "Escape":
        event.preventDefault();
        setSlashMenu(null);
        break;
    }
  }

  /** Replaces the typed "/" with the block snippet and restores the caret. */
  function insertSnippet(option: BlockSnippet) {
    if (!slashMenu) return;
    const before = value.slice(0, slashMenu.position);
    const after = value.slice(slashMenu.position + 1);
    onChange(before + option.snippet + after);
    setSlashMenu(null);

    const caret = before.length + option.snippet.length;
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <p className="mb-1.5 text-[13px] text-ink-faint">
          Markdown source. Type &quot;/&quot; on an empty line for blocks: CTA, FAQ,
          table of contents.
        </p>
        <div className="relative">
          <textarea
            id="post-content"
            ref={contentRef}
            value={value}
            onChange={handleContentChange}
            onKeyDown={handleContentKeyDown}
            onBlur={() => setSlashMenu(null)}
            placeholder={"## Heading\n\nWrite in Markdown. Lists, links, tables, and code blocks are supported."}
            aria-label="Post content (Markdown)"
            className={cn(fieldClass, "min-h-120 resize-y font-mono text-sm leading-6")}
            aria-controls={slashMenu ? "content-block-menu" : undefined}
          />
          {slashMenu && (
            <div
              id="content-block-menu"
              role="listbox"
              aria-label="Insert block"
              style={{ top: slashMenu.top }}
              className="absolute left-4 z-10 w-76 max-w-[calc(100%-2rem)] overflow-hidden rounded-tile border border-line bg-card py-1 shadow-float"
            >
              {BLOCK_SNIPPETS.map((option, index) => (
                <button
                  key={option.command}
                  type="button"
                  role="option"
                  aria-selected={index === slashIndex}
                  onMouseDown={(e) => {
                    // Insert before the textarea blur closes the menu.
                    e.preventDefault();
                    insertSnippet(option);
                  }}
                  onMouseEnter={() => setSlashIndex(index)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left",
                    index === slashIndex ? "bg-primary-soft/60" : undefined,
                  )}
                >
                  <span className="text-sm font-medium text-ink">
                    <span className="font-mono text-primary">/{option.command}</span>
                    {" — "}
                    {option.label}
                  </span>
                  <span className="text-[12px] text-ink-faint">{option.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Preview</p>
        <div className="max-h-160 min-h-120 overflow-y-auto rounded-field border border-line px-4 py-3">
          {value.trim() ? (
            <PostContent content={value} />
          ) : (
            <p className="text-sm text-ink-faint">Start writing to see the preview.</p>
          )}
        </div>
      </div>
    </div>
  );
}
