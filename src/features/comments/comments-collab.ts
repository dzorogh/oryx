"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type {
  CommentRecord,
  CommentScope,
  CommentUser,
} from "@/features/comments/comments-types";

/** WebSocket endpoint for the shared y-websocket collab server (see scripts/collab-server.mjs). */
export const COMMENTS_WS_URL =
  process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? "ws://127.0.0.1:1234";

const PRESENCE_STALE_MS = 15_000;
const PRESENCE_HEARTBEAT_MS = 5_000;
const TYPING_TIMEOUT_MS = 4_000;

type PresenceUser = Pick<CommentUser, "id" | "name" | "avatarUrl">;

type AwarenessState = {
  user?: PresenceUser;
  lastSeen?: number;
  typing?: boolean;
};

type ProviderStatusEvent = { status: string } | string | [{ status: string }] | [string];

const roomFor = (scope: CommentScope): string => `comments-${scope.type}-${scope.id}`;

const statusEventIsConnected = (event: ProviderStatusEvent): boolean => {
  const raw = Array.isArray(event) ? event[0] : event;
  const status = typeof raw === "string" ? raw : raw.status;
  return status === "connected";
};

export type CommentsCollab = {
  /** True only while the link to the collab server is live (not just same-tab BroadcastChannel). */
  connected: boolean;
  /** Other users currently viewing this thread (deduped by user id, excludes self). */
  onlineUsers: PresenceUser[];
  /** Other users currently typing a comment. */
  typingUsers: PresenceUser[];
  /** Broadcast that the local user is (or is not) typing. */
  setTyping: (typing: boolean) => void;
  /** Publish a locally created/updated comment record to peers. */
  publishRecords: (records: CommentRecord[]) => void;
};

/**
 * Per-scope realtime layer for the comments panel: presence + typing awareness and
 * a shared `Y.Map` of comment records. Degrades gracefully (no-ops, empty presence)
 * when the collab server is unreachable. `onRemoteRecords` is invoked with records
 * that arrived from peers so the panel can ingest them into local state.
 */
export const useCommentsCollab = (
  scope: CommentScope,
  currentUser: CommentUser,
  onRemoteRecords: (records: CommentRecord[]) => void,
): CommentsCollab => {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const recordsRef = useRef<Y.Map<CommentRecord> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteCb = useRef(onRemoteRecords);
  remoteCb.current = onRemoteRecords;

  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [typingUsers, setTypingUsers] = useState<PresenceUser[]>([]);

  const presence: PresenceUser = {
    id: currentUser.id,
    name: currentUser.name,
    avatarUrl: currentUser.avatarUrl,
  };
  // Keep a stable JSON identity so the mount effect doesn't re-run each render.
  const presenceKey = `${presence.id}|${presence.name}|${presence.avatarUrl}`;

  useEffect(() => {
    let doc: Y.Doc;
    let provider: WebsocketProvider;
    try {
      doc = new Y.Doc();
      provider = new WebsocketProvider(COMMENTS_WS_URL, roomFor(scope), doc, {
        connect: true,
      });
    } catch {
      // Collab unavailable (bad URL / blocked) — stay in graceful offline mode.
      return;
    }

    const records = doc.getMap<CommentRecord>("records");
    docRef.current = doc;
    providerRef.current = provider;
    recordsRef.current = records;

    const publishPresence = (typing: boolean) => {
      provider.awareness.setLocalState({
        user: presence,
        lastSeen: Date.now(),
        typing,
      } satisfies AwarenessState);
    };

    const isLinkUp = (): boolean => provider.wsconnected || provider.synced;

    const recomputeAwareness = () => {
      const now = Date.now();
      const online = new Map<string, PresenceUser>();
      const typing = new Map<string, PresenceUser>();
      provider.awareness.getStates().forEach((raw, clientId) => {
        const state = raw as AwarenessState;
        if (!state.user || typeof state.lastSeen !== "number") {
          return;
        }
        if (now - state.lastSeen > PRESENCE_STALE_MS) {
          return;
        }
        if (clientId === provider.awareness.clientID) {
          return;
        }
        online.set(state.user.id, state.user);
        if (state.typing) {
          typing.set(state.user.id, state.user);
        }
      });
      setOnlineUsers([...online.values()]);
      setTypingUsers([...typing.values()]);
    };

    const handleRecords = () => {
      remoteCb.current([...records.values()]);
    };
    records.observe(handleRecords);

    provider.awareness.on("change", recomputeAwareness);

    const handleStatus = (event: ProviderStatusEvent) =>
      setConnected(statusEventIsConnected(event) || isLinkUp());
    const handleSync = (synced: boolean) => setConnected(synced || isLinkUp());
    provider.on("status", handleStatus);
    provider.on("sync", handleSync);

    const heartbeat = window.setInterval(() => {
      const local = provider.awareness.getLocalState() as AwarenessState | null;
      publishPresence(local?.typing ?? false);
      setConnected(isLinkUp());
      recomputeAwareness();
    }, PRESENCE_HEARTBEAT_MS);

    const initTimer = window.setTimeout(() => {
      publishPresence(false);
      setConnected(isLinkUp());
      recomputeAwareness();
      // Seed local ingest with whatever peers already have.
      if (records.size > 0) {
        remoteCb.current([...records.values()]);
      }
    }, 0);

    const handlePageHide = () => provider.awareness.setLocalState(null);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.clearInterval(heartbeat);
      window.clearTimeout(initTimer);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      window.removeEventListener("pagehide", handlePageHide);
      records.unobserve(handleRecords);
      provider.awareness.off("change", recomputeAwareness);
      provider.off("status", handleStatus);
      provider.off("sync", handleSync);
      provider.awareness.setLocalState(null);
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
      recordsRef.current = null;
      setConnected(false);
      setOnlineUsers([]);
      setTypingUsers([]);
    };
    // Re-create the room only when the scope or identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.type, scope.id, presenceKey]);

  const setTyping = useCallback((typing: boolean) => {
    const provider = providerRef.current;
    if (!provider) {
      return;
    }
    const local = provider.awareness.getLocalState() as AwarenessState | null;
    provider.awareness.setLocalState({
      user: local?.user,
      lastSeen: Date.now(),
      typing,
    } satisfies AwarenessState);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typing) {
      typingTimerRef.current = setTimeout(() => {
        const p = providerRef.current;
        const cur = p?.awareness.getLocalState() as AwarenessState | null;
        p?.awareness.setLocalState({
          user: cur?.user,
          lastSeen: Date.now(),
          typing: false,
        } satisfies AwarenessState);
      }, TYPING_TIMEOUT_MS);
    }
  }, []);

  const publishRecords = useCallback((records: CommentRecord[]) => {
    const doc = docRef.current;
    const map = recordsRef.current;
    if (!doc || !map || records.length === 0) {
      return;
    }
    doc.transact(() => {
      for (const record of records) {
        map.set(record.id, record);
      }
    });
  }, []);

  return { connected, onlineUsers, typingUsers, setTyping, publishRecords };
};
