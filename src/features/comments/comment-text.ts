/** Strip tags and decode a few common entities to get plain text from comment HTML. */
export const htmlToText = (html: string): string =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * Wrap matches of `query` in `<mark>` within HTML text nodes only (never inside
 * tags/attributes), so highlighting can't break the markup. Returns the input
 * unchanged when the query is empty.
 */
export const highlightHtml = (html: string, query: string): string => {
  const q = query.trim();
  if (!q) {
    return html;
  }
  const pattern = new RegExp(escapeRegExp(q), "gi");
  // Split into tags vs. text; only transform the text segments.
  return html.replace(/(<[^>]+>)|([^<]+)/g, (_match, tag: string, textNode: string) => {
    if (tag) {
      return tag;
    }
    return textNode.replace(
      pattern,
      (hit) => `<mark class="comment-search-hit">${escapeHtml(hit)}</mark>`,
    );
  });
};
