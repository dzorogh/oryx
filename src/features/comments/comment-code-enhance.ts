import { highlightToHtml } from "@/features/comments/comment-highlight";

const LANGUAGE_PREFIX = "language-";

const unescapeHtml = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const PRE_BLOCK = /<pre(\s[^>]*)?>\s*<code(\s[^>]*)?>([\s\S]*?)<\/code>\s*<\/pre>/g;

const languageOf = (codeAttrs: string | undefined): string | undefined => {
  if (!codeAttrs) {
    return undefined;
  }
  const match = codeAttrs.match(/class="([^"]*)"/);
  const className = match?.[1] ?? "";
  return className
    .split(/\s+/)
    .find((name) => name.startsWith(LANGUAGE_PREFIX))
    ?.slice(LANGUAGE_PREFIX.length);
};

/**
 * Bake syntax highlighting and a Copy button into a rendered comment body's
 * code blocks. A pure string transform (no DOM mutation) so it is SSR-safe and,
 * crucially, survives React re-applying the body's `dangerouslySetInnerHTML`
 * when a sibling comment is added — the previous approach mutated the DOM in a
 * `useEffect` and silently lost the highlighting/Copy button on re-render.
 *
 * Copying is handled by a delegated click listener on the body container, so no
 * per-button JS handler needs to persist.
 */
export const enhanceCodeHtml = (html: string): string => {
  if (!html.includes("<pre")) {
    return html;
  }
  return html.replace(PRE_BLOCK, (_full, _preAttrs, codeAttrs, inner) => {
    const language = languageOf(codeAttrs);
    const raw = unescapeHtml(String(inner));
    const tokens = highlightToHtml(raw, language);
    const langClass = language ? ` language-${language}` : "";
    return (
      `<pre class="comment-code-block">` +
      `<code class="hljs${langClass}">${tokens}</code>` +
      `<button type="button" class="comment-code-copy" aria-label="Copy code" data-code-copy>Copy</button>` +
      `</pre>`
    );
  });
};

/**
 * Attach a delegated copy listener to a rendered comment body. When a baked Copy
 * button is clicked, copies the block's source text and flips the label briefly.
 * Returns a cleanup that removes the listener. Attaching once on a stable node is
 * robust across re-renders (it never touches `innerHTML`).
 */
export const attachCodeCopy = (root: HTMLElement): (() => void) => {
  const onClick = (event: MouseEvent) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      ".comment-code-copy",
    );
    if (!button) {
      return;
    }
    const text = button.closest("pre")?.querySelector("code")?.textContent ?? "";
    void navigator.clipboard?.writeText(text);
    button.textContent = "Copied";
    button.dataset.copied = "true";
    window.setTimeout(() => {
      button.textContent = "Copy";
      delete button.dataset.copied;
    }, 1500);
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
};
