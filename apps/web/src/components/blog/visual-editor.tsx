"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { exitSuggestion } from "@tiptap/suggestion";
import { Loader2 } from "lucide-react";
import {
  buildEditorExtensions,
  getEditorMarkdown,
} from "@/lib/blog-editor/extensions";
import { toEditorMarkdown } from "@/lib/blog-editor/markdown-roundtrip";
import { EditorToolbar } from "./editor/toolbar";
import {
  buildSlashItems,
  createSlashCommandExtension,
  filterSlashItems,
  SlashMenuPopup,
  type SlashMenuItem,
} from "./editor/slash-menu";
import {
  CtaBlockWithView,
  FaqBlockWithView,
  TocBlockWithView,
} from "./editor/shortcode-views";

/**
 * WordPress-Gutenberg-style visual editor for blog posts. Content is still
 * stored as markdown: incoming markdown is converted for the editor (with
 * shortcode regions preserved byte-exactly as atom nodes) and every edit is
 * serialized back through tiptap-markdown.
 */

interface SlashMenuUiState {
  items: SlashMenuItem[];
  position: { left: number; top: number };
}

export function VisualEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const [imageOpen, setImageOpen] = useState(false);

  const [slashMenu, setSlashMenu] = useState<SlashMenuUiState | null>(null);
  const [slashIndex, setSlashIndexState] = useState(0);
  const slashIndexRef = useRef(0);
  const slashItemsRef = useRef<SlashMenuItem[]>([]);
  const slashCommandRef = useRef<((item: SlashMenuItem) => void) | null>(null);

  function setSlashIndex(index: number) {
    slashIndexRef.current = index;
    setSlashIndexState(index);
  }

  const slashItems = useMemo(
    () => buildSlashItems({ insertImage: () => setImageOpen(true) }),
    [],
  );

  const extensions = useMemo(
    () => [
      // Base list, with React node views attached to the shortcode nodes.
      ...buildEditorExtensions().filter(
        (extension) => !["fluxenCta", "fluxenToc", "fluxenFaq"].includes(extension.name),
      ),
      CtaBlockWithView,
      TocBlockWithView,
      FaqBlockWithView,
      createSlashCommandExtension({
        items: ({ query }) => filterSlashItems(slashItems, query),
        render: () => {
          const open = (props: {
            items: SlashMenuItem[];
            command: (item: SlashMenuItem) => void;
            clientRect?: (() => DOMRect | null) | null;
          }) => {
            const rect = props.clientRect?.();
            slashItemsRef.current = props.items;
            slashCommandRef.current = props.command;
            if (!rect) return;
            setSlashMenu({
              items: props.items,
              position: { left: rect.left, top: rect.bottom + 4 },
            });
            if (slashIndexRef.current >= props.items.length) setSlashIndex(0);
          };
          return {
            onStart: (props) => {
              setSlashIndex(0);
              open(props);
            },
            onUpdate: open,
            onExit: () => {
              slashItemsRef.current = [];
              slashCommandRef.current = null;
              setSlashMenu(null);
            },
            onKeyDown: ({ event, view }) => {
              const items = slashItemsRef.current;
              switch (event.key) {
                case "ArrowDown":
                  if (items.length === 0) return false;
                  setSlashIndex((slashIndexRef.current + 1) % items.length);
                  return true;
                case "ArrowUp":
                  if (items.length === 0) return false;
                  setSlashIndex(
                    (slashIndexRef.current - 1 + items.length) % items.length,
                  );
                  return true;
                case "Enter":
                case "Tab": {
                  const item = items[slashIndexRef.current];
                  if (!item || !slashCommandRef.current) return false;
                  slashCommandRef.current(item);
                  return true;
                }
                case "Escape":
                  exitSuggestion(view);
                  setSlashMenu(null);
                  return true;
                default:
                  return false;
              }
            },
          };
        },
      }),
    ],
    [slashItems],
  );

  const lastMarkdown = useRef(value);
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions,
      content: toEditorMarkdown(value),
      editorProps: {
        attributes: {
          class: "blog-prose visual-editor-content",
          "aria-label": "Post content",
        },
      },
      onUpdate: ({ editor: instance }) => {
        const markdown = getEditorMarkdown(instance);
        lastMarkdown.current = markdown;
        onChange(markdown);
      },
    },
    [],
  );

  // External markdown changes (e.g. edits made on the Markdown tab) reload
  // the editor; our own onUpdate emissions are skipped via lastMarkdown.
  useEffect(() => {
    if (!editor || value === lastMarkdown.current) return;
    lastMarkdown.current = value;
    editor.commands.setContent(toEditorMarkdown(value));
  }, [editor, value]);

  if (!editor) {
    return (
      <div className="flex min-h-120 items-center justify-center text-ink-faint">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        <span className="sr-only">Loading editor…</span>
      </div>
    );
  }

  return (
    <div className="visual-editor relative">
      <EditorToolbar editor={editor} imageOpen={imageOpen} onImageOpenChange={setImageOpen} />
      <EditorContent editor={editor} />
      {slashMenu && slashMenu.items.length > 0 && (
        <SlashMenuPopup
          items={slashMenu.items}
          activeIndex={slashIndex}
          position={slashMenu.position}
          onSelect={(item) => slashCommandRef.current?.(item)}
          onHover={setSlashIndex}
        />
      )}
    </div>
  );
}
