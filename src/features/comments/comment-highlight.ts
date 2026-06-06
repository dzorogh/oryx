import { common, createLowlight } from "lowlight";
import type { ElementContent } from "hast";

/** Shared lowlight instance (highlight.js common language set), reused by the editor and display. */
export const lowlight = createLowlight(common);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const toClassName = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.join(" ");
  }
  return typeof value === "string" ? value : "";
};

/** Serialize a lowlight hast tree to an HTML string of `<span class="hljs-…">` tokens. */
const hastToHtml = (nodes: ElementContent[]): string =>
  nodes
    .map((node) => {
      if (node.type === "text") {
        return escapeHtml(node.value);
      }
      if (node.type === "element") {
        const className = toClassName(node.properties?.className);
        const classAttr = className ? ` class="${className}"` : "";
        return `<span${classAttr}>${hastToHtml(node.children as ElementContent[])}</span>`;
      }
      return "";
    })
    .join("");

/**
 * Highlight a code string into token HTML. Uses the explicit language when registered,
 * otherwise auto-detects. Falls back to escaped plain text on any failure.
 */
export const highlightToHtml = (code: string, language?: string): string => {
  try {
    const tree =
      language && lowlight.registered(language)
        ? lowlight.highlight(language, code)
        : lowlight.highlightAuto(code);
    return hastToHtml(tree.children as ElementContent[]);
  } catch {
    return escapeHtml(code);
  }
};
