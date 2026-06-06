import { mergeAttributes } from "@tiptap/core";
import Mention from "@tiptap/extension-mention";

/**
 * A second mention node bound to `#` for referencing business entities (tasks/orders).
 * Extends Tiptap's Mention (distinct node name + its own suggestion plugin) and renders
 * a chip-link carrying the entity's id/type/href so it survives serialize → display.
 */
export const EntityMention = Mention.extend({
  name: "entityMention",

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) =>
          attributes.id ? { "data-id": attributes.id } : {},
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) =>
          attributes.label ? { "data-label": attributes.label } : {},
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => (attributes.href ? { href: attributes.href } : {}),
      },
      entityType: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-entity-type"),
        renderHTML: (attributes) =>
          attributes.entityType ? { "data-entity-type": attributes.entityType } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="entityMention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(
        { "data-type": "entityMention", class: "comment-entity", rel: "noreferrer" },
        HTMLAttributes,
      ),
      `#${node.attrs.id ?? node.attrs.label ?? ""}`,
    ];
  },

  renderText({ node }) {
    return `#${node.attrs.id ?? node.attrs.label ?? ""}`;
  },
});
