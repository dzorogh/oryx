import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  useCommentsState,
  type NewCommentInput,
} from "@/features/comments/use-comments-state";
import type {
  CommentFeedItem,
  CommentRecord,
  CommentUser,
} from "@/features/comments/comments-types";

const ME: CommentUser = {
  id: "me",
  name: "Alex",
  role: "Engineer",
  avatarUrl: "https://i.pravatar.cc/96?u=me",
};

const OTHER: CommentUser = {
  id: "other",
  name: "Sam",
  role: "PM",
  avatarUrl: "https://i.pravatar.cc/96?u=other",
};

const makeComment = (
  overrides: Partial<CommentRecord> & Pick<CommentRecord, "id" | "createdAtIso">,
): CommentRecord => ({
  kind: "comment",
  parentId: null,
  author: ME,
  contentHtml: "<p>hi</p>",
  contentJson: { type: "doc", content: [] },
  mentionIds: [],
  attachments: [],
  likedByMe: false,
  likeCount: 0,
  ...overrides,
});

const newInput = (overrides: Partial<NewCommentInput> = {}): NewCommentInput => ({
  parentId: null,
  author: ME,
  contentHtml: "<p>new</p>",
  contentJson: { type: "doc", content: [] },
  mentionIds: [],
  attachments: [],
  ...overrides,
});

describe("useCommentsState", () => {
  it("appends a new root comment at the bottom and counts it", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "a", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() => result.current.addComment(newInput({ contentHtml: "<p>last</p>" })));

    expect(result.current.totalCommentCount).toBe(2);
    const lastRow = result.current.visibleRows.at(-1);
    expect(lastRow?.kind).toBe("thread");
    if (lastRow?.kind === "thread") {
      expect(lastRow.thread.root.contentHtml).toBe("<p>last</p>");
    }
  });

  it("attaches a reply under its root as a single nesting level", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "root", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() => result.current.addComment(newInput({ parentId: "root", author: OTHER })));

    const row = result.current.visibleRows[0];
    expect(row.kind).toBe("thread");
    if (row.kind === "thread") {
      expect(row.thread.replies).toHaveLength(1);
      expect(row.thread.replies[0]?.parentId).toBe("root");
    }
  });

  it("paginates root threads and reveals older ones with loadEarlier", () => {
    const initial: CommentFeedItem[] = Array.from({ length: 5 }, (_, index) =>
      makeComment({
        id: `c-${index}`,
        createdAtIso: `2026-01-01T10:0${index}:00.000Z`,
      }),
    );
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 2 }),
    );

    expect(result.current.visibleRows).toHaveLength(2);
    expect(result.current.hasEarlier).toBe(true);

    act(() => result.current.loadEarlier());

    expect(result.current.visibleRows).toHaveLength(4);
  });

  it("marks a comment as edited when its body changes", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "a", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() =>
      result.current.editComment("a", {
        contentHtml: "<p>edited</p>",
        contentJson: { type: "doc", content: [] },
        mentionIds: [],
        attachments: [],
      }),
    );

    const row = result.current.visibleRows[0];
    if (row.kind === "thread") {
      expect(row.thread.root.contentHtml).toBe("<p>edited</p>");
      expect(row.thread.root.editedAtIso).toBeTruthy();
    }
  });

  it("toggles a like and hides the count when it returns to zero", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "a", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() => result.current.toggleLike("a"));
    let row = result.current.visibleRows[0];
    if (row.kind === "thread") {
      expect(row.thread.root.likeCount).toBe(1);
      expect(row.thread.root.likedByMe).toBe(true);
    }

    act(() => result.current.toggleLike("a"));
    row = result.current.visibleRows[0];
    if (row.kind === "thread") {
      expect(row.thread.root.likeCount).toBe(0);
      expect(row.thread.root.likedByMe).toBe(false);
    }
  });

  it("renders system notices author-less in chronological order", () => {
    const initial: CommentFeedItem[] = [
      {
        kind: "system",
        id: "sys-1",
        tone: "success",
        title: "Published",
        createdAtIso: "2026-01-01T09:00:00.000Z",
      },
      makeComment({ id: "a", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    expect(result.current.totalCommentCount).toBe(1);
    expect(result.current.visibleRows[0]?.kind).toBe("system");
    expect(result.current.visibleRows[1]?.kind).toBe("thread");
  });

  it("removes a leaf comment entirely on delete", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "a", createdAtIso: "2026-01-01T10:00:00.000Z" }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() => result.current.removeComment("a"));

    expect(result.current.visibleRows).toHaveLength(0);
    expect(result.current.totalCommentCount).toBe(0);
  });

  it("tombstones a root that still has replies, keeping the thread", () => {
    const initial: CommentFeedItem[] = [
      makeComment({ id: "root", createdAtIso: "2026-01-01T10:00:00.000Z" }),
      makeComment({
        id: "reply",
        parentId: "root",
        author: OTHER,
        createdAtIso: "2026-01-01T10:01:00.000Z",
      }),
    ];
    const { result } = renderHook(() =>
      useCommentsState({ initialItems: initial, pageSize: 8 }),
    );

    act(() => result.current.removeComment("root"));

    const row = result.current.visibleRows[0];
    expect(row.kind).toBe("thread");
    if (row.kind === "thread") {
      expect(row.thread.root.deleted).toBe(true);
      expect(row.thread.replies).toHaveLength(1);
    }
    // The tombstone is no longer counted as a live comment.
    expect(result.current.totalCommentCount).toBe(1);
  });
});
