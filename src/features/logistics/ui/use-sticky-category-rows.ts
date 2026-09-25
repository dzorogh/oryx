"use client";

import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

export const CATEGORY_GROUP_ROW_HEIGHT = 32;

export const categoryGroupStickyTop = (depth: number, headVar = "--calendar-head-h") =>
  `calc(var(${headVar}, 0px) + ${depth * CATEGORY_GROUP_ROW_HEIGHT}px)`;

/**
 * Sticky category rows under a table header inside `scrollRef`.
 * `headVar` is the CSS variable for the measured header height (calendar keeps `--calendar-head-h`).
 * `${headVar}-row` is the first header row, so a second header row can stick under it.
 */
export const useStickyCategoryRows = (
  sources: { collapsed: Set<string>; roots: unknown; uncategorized: unknown },
  headVar = "--calendar-head-h",
) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const [headHeight, setHeadHeight] = useState(0);
  const [headRowHeight, setHeadRowHeight] = useState(0);
  const [stickyIds, setStickyIds] = useState<Set<string>>(() => new Set());
  const { collapsed, roots, uncategorized } = sources;

  const updateStickyIds = useCallback(() => {
    const box = scrollRef.current;
    const head = headRef.current;
    if (!box || !head) return;
    // The deepest category rows whose natural position has passed the header form the sticky stack.
    const line = box.scrollTop + head.offsetHeight;
    const path: string[] = [];
    for (const row of box.querySelectorAll<HTMLTableRowElement>("tr[data-group-id]")) {
      const depth = Number(row.dataset.groupDepth);
      if (row.offsetTop > line + depth * CATEGORY_GROUP_ROW_HEIGHT) break;
      path.length = depth;
      path[depth] = row.dataset.groupId ?? "";
    }
    setStickyIds((prev) => {
      const next = new Set(path.filter(Boolean));
      return next.size === prev.size && [...next].every((id) => prev.has(id)) ? prev : next;
    });
  }, []);

  useLayoutEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const observer = new ResizeObserver(() => {
      setHeadHeight(head.getBoundingClientRect().height);
      const first = head.rows[0];
      setHeadRowHeight(first ? first.getBoundingClientRect().height : 0);
    });
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateStickyIds);
    return () => cancelAnimationFrame(frame);
  }, [updateStickyIds, collapsed, roots, uncategorized, headHeight]);

  const scrollStyle = {
    [headVar]: `${headHeight}px`,
    [`${headVar}-row`]: `${headRowHeight}px`,
  } as CSSProperties;

  return {
    scrollRef,
    headRef,
    stickyIds,
    onScroll: updateStickyIds,
    groupStickyTop: (depth: number) => categoryGroupStickyTop(depth, headVar),
    scrollStyle,
  };
};
