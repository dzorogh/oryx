"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { seedFromRange, type QuoteSeed } from "@/features/comments/comment-quote";

type SelectionState = {
  x: number;
  y: number;
  rootId: string;
  seed: QuoteSeed;
};

type CommentQuoteSelectionButtonProps = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onQuote: (rootId: string, seed: QuoteSeed) => void;
};

const resolveElement = (node: Node | null): HTMLElement | null => {
  if (!node) {
    return null;
  }
  return node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
};

/**
 * Floating "Quote" button shown when the user selects text inside a rendered comment
 * body. Clicking it quotes the exact selection (HTML preserved → nested quotes work) as
 * a reply to the enclosing thread's root.
 */
export const CommentQuoteSelectionButton = ({
  containerRef,
  onQuote,
}: CommentQuoteSelectionButtonProps) => {
  const [state, setState] = useState<SelectionState | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const evaluate = useCallback(() => {
    const container = containerRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setState(null);
      return;
    }
    if (!selection.toString().trim()) {
      setState(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) {
      setState(null);
      return;
    }
    const anchor = resolveElement(range.commonAncestorContainer);
    const body = anchor?.closest<HTMLElement>("[data-comment-body]");
    // Only quote from a rendered comment body, never from the editor itself.
    if (!body || anchor?.closest(".ProseMirror")) {
      setState(null);
      return;
    }
    const rootId = body
      .closest<HTMLElement>("[data-thread-root]")
      ?.getAttribute("data-thread-root");
    if (!rootId) {
      setState(null);
      return;
    }
    const authorName = body.getAttribute("data-comment-author") ?? "";
    const rect = range.getBoundingClientRect();
    setState({
      x: rect.left + rect.width / 2,
      y: rect.top,
      rootId,
      seed: seedFromRange(authorName, range),
    });
  }, [containerRef]);

  useEffect(() => {
    const isOnButton = (target: EventTarget | null) =>
      !!buttonRef.current && buttonRef.current.contains(target as Node);

    const handleMouseUp = (event: MouseEvent) => {
      if (isOnButton(event.target)) {
        return;
      }
      window.setTimeout(evaluate, 0);
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (isOnButton(event.target)) {
        return;
      }
      setState(null);
    };
    const handleKeyUp = () => window.setTimeout(evaluate, 0);
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setState(null);
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [evaluate]);

  // The button is positioned in viewport coords, so any scroll invalidates it.
  useEffect(() => {
    const container = containerRef.current;
    const onScroll = () => setState(null);
    container?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [containerRef]);

  if (!state) {
    return null;
  }

  const handleQuote = () => {
    onQuote(state.rootId, state.seed);
    window.getSelection()?.removeAllRanges();
    setState(null);
  };

  const top = Math.max(8, state.y - 44);
  const left = Math.min(Math.max(44, state.x), window.innerWidth - 44);

  return (
    <button
      ref={buttonRef}
      type="button"
      // Keep the text selection alive while pressing the button.
      onMouseDown={(event) => event.preventDefault()}
      onClick={handleQuote}
      style={{ position: "fixed", top, left, transform: "translateX(-50%)", zIndex: 70 }}
      className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background shadow-md ring-1 ring-foreground/10 transition hover:opacity-90"
    >
      <Quote className="size-3.5" />
      Quote
    </button>
  );
};
