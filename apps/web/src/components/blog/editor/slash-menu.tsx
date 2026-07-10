"use client";

import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import {
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  MessageCircleQuestion,
  Minus,
  Table,
  TableOfContents,
  TextQuote,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Gutenberg-style "/" block menu for the visual editor. Typing "/" at the
 * start of a paragraph opens the menu; the query after the slash filters it.
 * Rendering and keyboard state live in VisualEditor — this module provides
 * the items, the Suggestion-based extension, and the popup markup.
 */

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: LucideIcon;
  keywords: string;
  run: (editor: Editor, range: Range) => void;
}

export function buildSlashItems(actions: { insertImage: () => void }): SlashMenuItem[] {
  return [
    {
      title: "Heading 2",
      description: "Section heading — shows in the table of contents.",
      icon: Heading2,
      keywords: "h2 heading section",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
    },
    {
      title: "Heading 3",
      description: "Sub-section heading.",
      icon: Heading3,
      keywords: "h3 heading subsection",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
    },
    {
      title: "Bullet list",
      description: "Unordered list.",
      icon: List,
      keywords: "ul unordered bullet list",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBulletList().run(),
    },
    {
      title: "Numbered list",
      description: "Ordered list.",
      icon: ListOrdered,
      keywords: "ol ordered numbered list",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
    },
    {
      title: "Quote",
      description: "Blockquote for citations and callouts.",
      icon: TextQuote,
      keywords: "quote blockquote citation",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
    },
    {
      title: "Code block",
      description: "Multi-line code with optional language.",
      icon: Code,
      keywords: "code pre snippet fence",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
    },
    {
      title: "Table",
      description: "3×3 table with a header row.",
      icon: Table,
      keywords: "table grid rows columns",
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run(),
    },
    {
      title: "Image",
      description: "Upload an image or embed one by URL.",
      icon: ImageIcon,
      keywords: "image picture photo upload",
      run: (editor, range) => {
        editor.chain().focus().deleteRange(range).run();
        actions.insertImage();
      },
    },
    {
      title: "Divider",
      description: "Horizontal rule.",
      icon: Minus,
      keywords: "hr divider rule separator",
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
    },
    {
      title: "CTA card",
      description: "“Try Fluxen” call-to-action with a signup button.",
      icon: Zap,
      keywords: "cta call to action signup fluxen",
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "fluxenCta" })
          .run(),
    },
    {
      title: "FAQ section",
      description: "Q&A accordion — also emits FAQ structured data.",
      icon: MessageCircleQuestion,
      keywords: "faq questions answers accordion",
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "fluxenFaq" })
          .run(),
    },
    {
      title: "Table of contents",
      description: "Linked list of this post's headings.",
      icon: TableOfContents,
      keywords: "toc table of contents outline",
      run: (editor, range) =>
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertContent({ type: "fluxenToc" })
          .run(),
    },
  ];
}

export function filterSlashItems(items: SlashMenuItem[], query: string): SlashMenuItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.includes(q),
  );
}

/** Creates the "/" suggestion extension with the given suggestion config. */
export function createSlashCommandExtension(
  suggestion: Omit<SuggestionOptions<SlashMenuItem, SlashMenuItem>, "editor">,
) {
  return Extension.create({
    name: "slashCommand",
    addProseMirrorPlugins() {
      return [
        Suggestion<SlashMenuItem, SlashMenuItem>({
          editor: this.editor,
          char: "/",
          startOfLine: true,
          allowSpaces: false,
          // Only inside plain paragraphs — never in code blocks or headings.
          allow: ({ state, range }) =>
            state.doc.resolve(range.from).parent.type.name === "paragraph",
          command: ({ editor, range, props }) => props.run(editor, range),
          ...suggestion,
        }),
      ];
    },
  });
}

/** The floating menu itself; position is a fixed viewport coordinate. */
export function SlashMenuPopup({
  items,
  activeIndex,
  position,
  onSelect,
  onHover,
}: {
  items: SlashMenuItem[];
  activeIndex: number;
  position: { left: number; top: number };
  onSelect: (item: SlashMenuItem) => void;
  onHover: (index: number) => void;
}) {
  return (
    <div
      role="listbox"
      aria-label="Insert block"
      style={{ left: position.left, top: position.top }}
      className="fixed z-30 max-h-80 w-72 overflow-y-auto rounded-tile border border-line bg-card py-1 shadow-float"
    >
      {items.length === 0 && (
        <p className="px-4 py-2.5 text-sm text-ink-faint">No matching blocks.</p>
      )}
      {items.map((item, index) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => {
              event.preventDefault();
              onSelect(item);
            }}
            onMouseEnter={() => onHover(index)}
            className={cn(
              "flex w-full items-center gap-3 px-3.5 py-2 text-left",
              index === activeIndex && "bg-primary-soft/60",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-field border border-line bg-surface text-ink-secondary">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{item.title}</span>
              <span className="block truncate text-[12px] text-ink-faint">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
