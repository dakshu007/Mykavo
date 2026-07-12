"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Loader2,
  Minus,
  Redo2,
  SquareCode,
  Strikethrough,
  Table as TableIcon,
  TextQuote,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { isAllowedLinkHref } from "@/lib/blog-editor/markdown-roundtrip";
import { cn } from "@/lib/utils";

/**
 * Sticky formatting toolbar for the visual editor: block type dropdown,
 * inline marks, link/image popovers, lists, quote, code block, table
 * controls (contextual when the selection is inside a table), divider, and
 * undo/redo.
 */

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-field transition-colors",
        active ? "bg-primary-soft text-primary" : "text-ink-secondary hover:bg-surface hover:text-ink",
        disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;
}

/** Small anchored popover; closes on outside click and Escape. */
function Popover({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as globalThis.Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);
  return (
    <div
      ref={ref}
      className="absolute left-0 top-full z-30 mt-1.5 w-80 max-w-[80vw] rounded-tile border border-line bg-card p-3 shadow-float"
    >
      {children}
    </div>
  );
}

const popoverFieldClass =
  "w-full rounded-field border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none";

function LinkPopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const current = String(editor.getAttributes("link").href ?? "");
  const [href, setHref] = useState(current);
  const [error, setError] = useState<string | null>(null);

  function apply() {
    const value = href.trim();
    if (!isAllowedLinkHref(value)) {
      setError("Use an https://, mailto:, or relative link.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <Popover onClose={onClose}>
      <label htmlFor="editor-link-href" className="mb-1.5 block text-[13px] font-medium text-ink">
        Link URL
      </label>
      <input
        id="editor-link-href"
        type="text"
        autoFocus
        value={href}
        onChange={(event) => {
          setHref(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            apply();
          }
        }}
        placeholder="https://example.com or /pricing"
        className={popoverFieldClass}
      />
      {error && <p className="mt-1.5 text-[12px] text-critical">{error}</p>}
      <div className="mt-2.5 flex items-center gap-2">
        <button
          type="button"
          onClick={apply}
          className="rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          {current ? "Update link" : "Set link"}
        </button>
        {current && (
          <button
            type="button"
            onClick={remove}
            className="rounded-full border border-line px-4 py-1.5 text-[13px] font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Remove
          </button>
        )}
      </div>
    </Popover>
  );
}

export function ImagePopover({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function insert(src: string) {
    editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
    onClose();
  }

  function insertFromUrl() {
    const value = url.trim();
    if (!/^https?:\/\//i.test(value) && !value.startsWith("/")) {
      setError("Use an https:// or site-relative image URL.");
      return;
    }
    insert(value);
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/blog/images", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      insert(data.url);
    } catch {
      setError("Network error — the image was not uploaded.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Popover onClose={onClose}>
      <p className="mb-1.5 text-[13px] font-medium text-ink">Insert image</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-field border border-dashed border-line px-3 py-2.5 text-sm font-medium text-ink-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {uploading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4" aria-hidden />
        )}
        {uploading ? "Uploading…" : "Upload image (max 2 MB)"}
      </button>
      <p className="my-2 text-center text-[11px] uppercase tracking-wide text-ink-faint">or</p>
      <label htmlFor="editor-image-url" className="sr-only">
        Image URL
      </label>
      <input
        id="editor-image-url"
        type="text"
        value={url}
        onChange={(event) => {
          setUrl(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            insertFromUrl();
          }
        }}
        placeholder="https://example.com/image.png"
        className={popoverFieldClass}
      />
      <label htmlFor="editor-image-alt" className="sr-only">
        Alt text
      </label>
      <input
        id="editor-image-alt"
        type="text"
        value={alt}
        onChange={(event) => setAlt(event.target.value)}
        placeholder="Alt text (recommended)"
        className={cn(popoverFieldClass, "mt-2")}
      />
      {error && <p className="mt-1.5 text-[12px] text-critical">{error}</p>}
      <button
        type="button"
        onClick={insertFromUrl}
        disabled={!url.trim() || uploading}
        className="mt-2.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        Insert from URL
      </button>
    </Popover>
  );
}

export function EditorToolbar({
  editor,
  imageOpen,
  onImageOpenChange,
}: {
  editor: Editor;
  imageOpen: boolean;
  onImageOpenChange: (open: boolean) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      headingLevel: HEADING_LEVELS.find((level) => e.isActive("heading", { level })) ?? null,
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      blockquote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      inTable: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  function setBlockType(value: string) {
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else chain.setNode("heading", { level: Number(value) }).run();
  }

  return (
    <div className="sticky top-0 z-20 -mx-1 rounded-t-tile border-b border-line bg-card/95 px-1 pb-2 backdrop-blur">
      <div className="flex flex-wrap items-center gap-0.5">
        <label htmlFor="editor-block-type" className="sr-only">
          Block type
        </label>
        <select
          id="editor-block-type"
          title="Block type"
          value={state.headingLevel ? String(state.headingLevel) : "p"}
          onChange={(event) => setBlockType(event.target.value)}
          className="h-8 rounded-field border border-line bg-card pl-2 pr-1 text-[13px] font-medium text-ink focus:border-primary focus:outline-none"
        >
          <option value="p">Paragraph</option>
          {HEADING_LEVELS.map((level) => (
            <option key={level} value={level}>
              Heading {level}
            </option>
          ))}
        </select>

        <Divider />

        <ToolbarButton
          title="Bold (⌘B)"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Italic (⌘I)"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={state.strike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Inline code"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-4" aria-hidden />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton
            title="Link"
            active={state.link}
            onClick={() => setLinkOpen((open) => !open)}
          >
            <LinkIcon className="size-4" aria-hidden />
          </ToolbarButton>
          {linkOpen && <LinkPopover editor={editor} onClose={() => setLinkOpen(false)} />}
        </div>

        <Divider />

        <ToolbarButton
          title="Bullet list"
          active={state.bulletList}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={state.orderedList}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          active={state.blockquote}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <TextQuote className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode className="size-4" aria-hidden />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Insert table"
          active={state.inTable}
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="size-4" aria-hidden />
        </ToolbarButton>

        <div className="relative">
          <ToolbarButton title="Image" active={imageOpen} onClick={() => onImageOpenChange(!imageOpen)}>
            <ImageIcon className="size-4" aria-hidden />
          </ToolbarButton>
          {imageOpen && <ImagePopover editor={editor} onClose={() => onImageOpenChange(false)} />}
        </div>

        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="size-4" aria-hidden />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Undo (⌘Z)"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="size-4" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          title="Redo (⇧⌘Z)"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="size-4" aria-hidden />
        </ToolbarButton>
      </div>

      {state.inTable && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 rounded-field bg-surface px-2 py-1">
          <span className="label-micro mr-1">Table</span>
          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-card hover:text-ink"
          >
            + Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-card hover:text-ink"
          >
            − Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-card hover:text-ink"
          >
            + Column
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-card hover:text-ink"
          >
            − Column
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteTable().run()}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium text-critical transition-colors hover:bg-critical-soft"
          >
            <Trash2 className="size-3.5" aria-hidden /> Delete table
          </button>
        </div>
      )}
    </div>
  );
}
