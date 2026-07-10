import { Editor, type Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import StarterKit from "@tiptap/starter-kit";
import { Markdown, type MarkdownNodeSpec, type MarkdownStorage } from "tiptap-markdown";
import { toEditorMarkdown } from "./markdown-roundtrip";
import { CtaBlockNode, FaqBlockNode, TocBlockNode } from "./shortcode-nodes";

/**
 * Shared extension list for the visual blog editor. React-free so the same
 * schema and (de)serialization run headless in round-trip tests; the editor
 * component swaps in React node views for the shortcode nodes.
 */

/**
 * tiptap-markdown's stock image serializer is inline-only and never closes
 * the block, so a block-level image glued itself to the following block.
 * This override writes the same `![alt](src "title")` syntax and closes the
 * block properly.
 */
const serializeImage: MarkdownNodeSpec["serialize"] = (state, node) => {
  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const title = node.attrs.title ? String(node.attrs.title) : "";
  state.write(
    `![${state.esc(alt)}](${src.replace(/[()]/g, "\\$&")}${
      title ? ` "${title.replace(/"/g, '\\"')}"` : ""
    })`,
  );
  state.closeBlock(node);
};

export const BlogImage = Image.extend<
  Record<string, never>,
  { markdown: MarkdownNodeSpec }
>({
  addStorage() {
    return {
      markdown: {
        serialize: serializeImage,
        parse: {},
      },
    };
  },
});

export function buildEditorExtensions(options?: { placeholder?: string }): Extensions {
  return [
    StarterKit.configure({
      // Markdown has no underline — keep the schema serializable.
      underline: false,
      // Link is added separately below with editor-specific behavior.
      link: false,
    }),
    Link.configure({
      openOnClick: false,
      autolink: false,
      linkOnPaste: true,
    }),
    BlogImage,
    TableKit.configure({
      table: { resizable: false },
    }),
    Placeholder.configure({
      placeholder: options?.placeholder ?? "Start writing, or type “/” for blocks…",
    }),
    Markdown.configure({
      // Required so shortcode placeholder <div>s pass through markdown-it.
      html: true,
      tightLists: true,
      bulletListMarker: "-",
      linkify: false,
      breaks: false,
      transformPastedText: true,
      transformCopiedText: false,
    }),
    CtaBlockNode,
    TocBlockNode,
    FaqBlockNode,
  ];
}

/** Typed accessor for tiptap-markdown's editor storage. */
export function getEditorMarkdown(editor: Editor): string {
  // tiptap-markdown registers its storage at runtime but does not augment
  // @tiptap/core's Storage interface for Tiptap v3, hence the cast.
  const storage = editor.storage as unknown as { markdown: MarkdownStorage };
  return storage.markdown.getMarkdown();
}

/**
 * Full stored-markdown → editor → markdown round-trip using a headless
 * editor. Used by tests; the live editor performs the same two conversions
 * via setContent/getMarkdown.
 */
export function roundTripMarkdown(markdown: string): string {
  const editor = new Editor({
    element: null,
    extensions: buildEditorExtensions(),
    content: toEditorMarkdown(markdown),
  });
  try {
    return getEditorMarkdown(editor);
  } finally {
    editor.destroy();
  }
}
