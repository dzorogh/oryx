import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutTone = "info" | "warning" | "success";

export const CALLOUT_TONES: CalloutTone[] = ["info", "warning", "success"];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wrap the selection in a callout block with the given tone. */
      setCallout: (attributes?: { tone: CalloutTone }) => ReturnType;
      /** Toggle a callout block on/off around the selection. */
      toggleCallout: (attributes?: { tone: CalloutTone }) => ReturnType;
      /** Lift the selection out of its callout block. */
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * A simple block container (`<div data-callout data-tone="...">`) holding regular
 * block content. Rendered/displayed purely via `.comment-prose .comment-callout` CSS,
 * so no display-time JavaScript is needed.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} as Record<string, unknown> };
  },

  addAttributes() {
    return {
      tone: {
        default: "info" as CalloutTone,
        parseHTML: (element) =>
          (element.getAttribute("data-tone") as CalloutTone | null) ?? "info",
        renderHTML: (attributes) => ({ "data-tone": attributes.tone as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "",
        class: "comment-callout",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attributes) =>
          ({ commands }) =>
            commands.wrapIn(this.name, attributes),
      toggleCallout:
        (attributes) =>
          ({ commands }) =>
            commands.toggleWrap(this.name, attributes),
      unsetCallout:
        () =>
          ({ commands }) =>
            commands.lift(this.name),
    };
  },
});
