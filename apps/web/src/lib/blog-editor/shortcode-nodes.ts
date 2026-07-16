import { Node } from "@tiptap/core";
import type { MarkdownNodeSpec } from "tiptap-markdown";
import {
  DEFAULT_FAQ_RAW,
  decodeShortcodeRaw,
  encodeShortcodeRaw,
  SHORTCODE_RAW_ATTR,
  SHORTCODE_TYPE_ATTR,
} from "./markdown-roundtrip";

/**
 * Tiptap atom nodes for the MyKavo shortcode blocks ({{cta}}, {{toc}},
 * {{faq}}…{{/faq}}). Each node stores the EXACT raw markdown source of its
 * region in the `raw` attribute and serializes it back verbatim, so a load →
 * save round-trip is byte-identical for shortcode regions.
 *
 * These definitions are React-free (usable headless in tests); the visual
 * editor attaches React node views via `.extend({ addNodeView })`.
 */

type ShortcodeStorage = { markdown: MarkdownNodeSpec };

/** Serializes the untouched raw source back into the markdown output. */
const serializeRaw: MarkdownNodeSpec["serialize"] = (state, node) => {
  state.write(String(node.attrs.raw ?? ""));
  state.closeBlock(node);
};

function createShortcodeNode(options: {
  name: string;
  type: "cta" | "toc" | "faq";
  defaultRaw: string;
}) {
  const { name, type, defaultRaw } = options;
  return Node.create<Record<string, never>, ShortcodeStorage>({
    name,
    group: "block",
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
      return { raw: { default: defaultRaw } };
    },

    parseHTML() {
      return [
        {
          tag: `div[${SHORTCODE_TYPE_ATTR}="${type}"]`,
          getAttrs: (element) => ({
            raw:
              decodeShortcodeRaw(element.getAttribute(SHORTCODE_RAW_ATTR) ?? "") ||
              defaultRaw,
          }),
        },
      ];
    },

    renderHTML({ node }) {
      return [
        "div",
        {
          [SHORTCODE_TYPE_ATTR]: type,
          [SHORTCODE_RAW_ATTR]: encodeShortcodeRaw(String(node.attrs.raw ?? "")),
        },
      ];
    },

    addStorage() {
      return {
        markdown: {
          serialize: serializeRaw,
          parse: {},
        },
      };
    },
  });
}

export const CtaBlockNode = createShortcodeNode({
  name: "mykavoCta",
  type: "cta",
  defaultRaw: "{{cta}}",
});

export const TocBlockNode = createShortcodeNode({
  name: "mykavoToc",
  type: "toc",
  defaultRaw: "{{toc}}",
});

export const FaqBlockNode = createShortcodeNode({
  name: "mykavoFaq",
  type: "faq",
  defaultRaw: DEFAULT_FAQ_RAW,
});
