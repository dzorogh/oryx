"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { JSONContent } from "@tiptap/react";
import type {
  CommentDraft,
  CommentPrefs,
  CommentScope,
} from "@/features/comments/comments-types";
import { DEFAULT_COMMENT_PREFS } from "@/features/comments/comments-types";

const NAMESPACE = "oryx-comments";

/** Cross-component/-tab change signal so `useSyncExternalStore` snapshots refresh. */
const STORAGE_EVENT = "oryx-comments-storage";

type StorageListener = () => void;

const subscribeStorage = (listener: StorageListener): (() => void) => {
  if (typeof window === "undefined") {
    return () => { };
  }
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(STORAGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
};

const notifyStorage = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }
};

// Per-key snapshot cache so `useSyncExternalStore` getSnapshot returns a stable
// reference until the raw stored string actually changes (avoids render loops).
const snapshotCache = new Map<string, { raw: string | null; parsed: unknown }>();

const scopeKey = (scope: CommentScope, bucket: string): string =>
  `${NAMESPACE}:${scope.type}:${scope.id}:${bucket}`;

const hasStorage = (): boolean => {
  // Accessing `window.localStorage` itself can throw a SecurityError in Chrome
  // when site data/cookies are blocked for the origin, so the access must be
  // guarded — not just the read/write that follows.
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
};

const readJson = <T,>(key: string, fallback: T): T => {
  if (!hasStorage()) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown): void => {
  if (!hasStorage()) {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    notifyStorage();
  } catch {
    // Quota or serialization failures are non-fatal for a demo store.
  }
};

const removeKey = (key: string): void => {
  if (!hasStorage()) {
    return;
  }
  try {
    window.localStorage.removeItem(key);
    notifyStorage();
  } catch {
    // ignore
  }
};

/** Read with a per-key stable snapshot (only re-parses when the raw string changes). */
const readCached = <T,>(key: string, fallback: T): T => {
  if (!hasStorage()) {
    return fallback;
  }
  const raw = window.localStorage.getItem(key);
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) {
    return cached.parsed as T;
  }
  let parsed: T;
  try {
    parsed = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    parsed = fallback;
  }
  snapshotCache.set(key, { raw, parsed });
  return parsed;
};

const emptySubscribe = () => () => { };

/** False on the server and the first client render, true afterwards (hydration-safe). */
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

// ---------------------------------------------------------------------------
// Drafts (per scope + composer target, e.g. "root" or a parent comment id)
// ---------------------------------------------------------------------------

const draftKey = (scope: CommentScope, target: string): string =>
  scopeKey(scope, `draft:${target}`);

export const readDraft = (scope: CommentScope, target: string): CommentDraft | null =>
  readJson<CommentDraft | null>(draftKey(scope, target), null);

export const writeDraft = (
  scope: CommentScope,
  target: string,
  contentJson: JSONContent,
): void => {
  writeJson(draftKey(scope, target), {
    contentJson,
    updatedAtIso: new Date().toISOString(),
  } satisfies CommentDraft);
};

export const clearDraft = (scope: CommentScope, target: string): void =>
  removeKey(draftKey(scope, target));

// ---------------------------------------------------------------------------
// Last-visit marker (drives the "New since last visit" divider)
// ---------------------------------------------------------------------------

const lastVisitKey = (scope: CommentScope): string => scopeKey(scope, "last-visit");
const prevVisitKey = (scope: CommentScope): string => scopeKey(scope, "prev-visit");

export const readLastVisit = (scope: CommentScope): string | null =>
  readJson<string | null>(lastVisitKey(scope), null);

export const writeLastVisit = (scope: CommentScope, iso: string): void =>
  writeJson(lastVisitKey(scope), iso);

// ---------------------------------------------------------------------------
// Read receipts (ids of comments this user has seen)
// ---------------------------------------------------------------------------

const readReceiptsKey = (scope: CommentScope): string => scopeKey(scope, "read");

export const readReadReceipts = (scope: CommentScope): string[] =>
  readJson<string[]>(readReceiptsKey(scope), []);

export const writeReadReceipts = (scope: CommentScope, ids: string[]): void =>
  writeJson(readReceiptsKey(scope), ids);

// ---------------------------------------------------------------------------
// View preferences (sort + filters)
// ---------------------------------------------------------------------------

const prefsKey = (scope: CommentScope): string => scopeKey(scope, "prefs");

export const readPrefs = (scope: CommentScope): CommentPrefs =>
  readJson<CommentPrefs>(prefsKey(scope), DEFAULT_COMMENT_PREFS);

export const writePrefs = (scope: CommentScope, prefs: CommentPrefs): void =>
  writeJson(prefsKey(scope), prefs);

/**
 * Hydration-safe persisted preferences via `useSyncExternalStore`: defaults on
 * the server / first client render, the stored value afterwards. Writing through
 * notifies the store so other consumers (and tabs) refresh.
 */
export const useCommentPrefs = (
  scope: CommentScope,
): [CommentPrefs, (next: CommentPrefs) => void] => {
  const key = prefsKey(scope);
  const prefs = useSyncExternalStore(
    subscribeStorage,
    () => readCached<CommentPrefs>(key, DEFAULT_COMMENT_PREFS),
    () => DEFAULT_COMMENT_PREFS,
  );

  const update = useCallback(
    (next: CommentPrefs) => writePrefs(scope, next),
    [scope],
  );

  return [prefs, update];
};

/**
 * Returns the previous "last visit" marker for the New-divider. On first mount it
 * snapshots the running `last-visit` value into a stable `prev-visit` key and then
 * advances `last-visit` to "now". The hook reads `prev-visit` (stable after the
 * one-time advance) so the divider does not move as new comments arrive. All writes
 * happen in an effect (allowed); no setState-in-effect, no refs read during render.
 */
export const useLastVisit = (scope: CommentScope): string | null => {
  const key = prevVisitKey(scope);
  const previous = useSyncExternalStore(
    subscribeStorage,
    () => readCached<string | null>(key, null),
    () => null,
  );

  const advanced = useRef(false);
  useEffect(() => {
    if (advanced.current) {
      return;
    }
    advanced.current = true;
    writeJson(prevVisitKey(scope), readLastVisit(scope));
    writeLastVisit(scope, new Date().toISOString());
  }, [scope]);

  return previous;
};
