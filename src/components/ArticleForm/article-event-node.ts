import { mergeAttributes, Node } from "@tiptap/core";

import { ARTICLE_EVENT_ATTR } from "~/lib/article-event-links";

export type ArticleEventNodeAttrs = {
  eventId: number;
  date: string;
  title: string;
};

export const ARTICLE_EVENT_NODE = "articleEvent";

/**
 * Atom block for an event card. `date` and `title` are an editor-only
 * snapshot; the public page rebuilds the card from `eventId`.
 */
export const ArticleEventNode = Node.create({
  name: ARTICLE_EVENT_NODE,
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      eventId: {
        default: null,
        parseHTML: (element) =>
          Number(element.getAttribute(ARTICLE_EVENT_ATTR)) || null,
        renderHTML: (attributes) => ({
          [ARTICLE_EVENT_ATTR]: attributes.eventId,
        }),
      },
      date: {
        default: "",
        parseHTML: (element) =>
          element.querySelector(".article-schedule-lead")?.textContent ?? "",
        renderHTML: () => ({}),
      },
      title: {
        default: "",
        parseHTML: (element) =>
          element.querySelector(".article-schedule-text")?.textContent ?? "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    // Above the paragraph rule, which would otherwise claim the <p>.
    return [{ tag: `p[${ARTICLE_EVENT_ATTR}]`, priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, { class: "article-schedule-item" }),
      ["span", { class: "article-schedule-lead" }, String(node.attrs.date)],
      ["span", { class: "article-schedule-text" }, String(node.attrs.title)],
    ];
  },
});
