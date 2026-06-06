import type { CommentRecord } from "@/features/comments/comments-types";

/** A piece of content to quote: who said it + the HTML to cite (structure preserved). */
export type QuoteSeed = {
  authorName: string;
  html: string;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Quote an entire comment (used by the "Quote reply" menu action). */
export const seedFromComment = (comment: CommentRecord): QuoteSeed => ({
  authorName: comment.author.name,
  html: comment.contentHtml,
});

/**
 * Quote a DOM selection range. Clones the selected fragment, strips display-only
 * artifacts (the injected code "Copy" button), and returns the cleaned HTML so the
 * cited structure — including any nested `<blockquote>` — is preserved.
 */
export const seedFromRange = (authorName: string, range: Range): QuoteSeed => {
  const holder = document.createElement("div");
  holder.appendChild(range.cloneContents());
  holder.querySelectorAll(".comment-code-copy").forEach((node) => node.remove());
  return { authorName, html: holder.innerHTML };
};

/**
 * Build the reply draft (HTML string) for a quote: a `<blockquote>` that cites the
 * author and wraps the quoted HTML, followed by an empty paragraph to type into.
 *
 * Because the quoted HTML can itself contain `<blockquote>` elements, this nests
 * cleanly to any depth (quote-of-quote). Tiptap normalizes the HTML against the
 * editor schema on load, so loose inline selections are wrapped into paragraphs.
 */
export const buildQuotedHtml = (seed: QuoteSeed): string => {
  const inner = seed.html.trim() ? seed.html : "<p></p>";
  return `<blockquote data-quote><p><strong>${escapeHtml(
    seed.authorName,
  )}</strong></p>${inner}</blockquote>`;
};

/**
 * Build a reply draft citing one or more sources: each seed becomes its own
 * attributed `<blockquote>`, followed by a single empty paragraph to type into.
 * Lets a reply quote several comments (or several selections) at once.
 */
export const buildQuotedHtmlMany = (seeds: QuoteSeed[]): string => {
  if (seeds.length === 0) {
    return "";
  }
  return `${seeds.map(buildQuotedHtml).join("")}<p></p>`;
};
