"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { DealerStatus, PricelistCellValue } from "../pricelists-helpers";
import type { ParameterDef } from "../pricelists-parameters";
import type { ComputedEntry } from "../pricelist-recalc";
import {
  COLLAB_ROOM,
  COLLAB_WS_URL,
  PRESENCE_DEBOUNCE_MS,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_STALE_MS,
  type CollabUser,
  getOrCreateTabId,
  getOrCreateUser,
} from "./collab-config";

type AwarenessState = {
  user?: CollabUser;
  tabId?: string;
  lastSeen?: number;
  editing?: string | null;
};

type CollabSingleton = {
  doc: Y.Doc;
  provider: WebsocketProvider;
  prices: Y.Map<PricelistCellValue>;
  dealerStatuses: Y.Map<DealerStatus>;
  parameterDefs: Y.Map<ParameterDef[]>;
  parameterValues: Y.Map<number>;
  /** Backend-computed cache (USD, markups, inherited parameters). Leader writes. */
  computed: Y.Map<ComputedEntry>;
  /** Pending recompute requests (targetId → desired input hash). Clients write. */
  computeRequests: Y.Map<string>;
  user: CollabUser;
  tabId: string;
};

type ProviderStatusEvent = { status: string } | string | [{ status: string }] | [string];

let collabSingleton: CollabSingleton | null = null;
let subscriberCount = 0;

const createCollab = (): CollabSingleton => {
  const doc = new Y.Doc();
  const prices = doc.getMap<PricelistCellValue>("prices");
  const dealerStatuses = doc.getMap<DealerStatus>("dealerStatuses");
  const parameterDefs = doc.getMap<ParameterDef[]>("parameterDefs");
  const parameterValues = doc.getMap<number>("parameterValues");
  const computed = doc.getMap<ComputedEntry>("computed");
  const computeRequests = doc.getMap<string>("computeRequests");
  const user = getOrCreateUser();
  const tabId = getOrCreateTabId();
  const provider = new WebsocketProvider(COLLAB_WS_URL, COLLAB_ROOM, doc, { connect: true });

  return {
    doc,
    provider,
    prices,
    dealerStatuses,
    parameterDefs,
    parameterValues,
    computed,
    computeRequests,
    user,
    tabId,
  };
};

const acquireCollab = (): CollabSingleton => {
  if (!collabSingleton) {
    collabSingleton = createCollab();
  }
  subscriberCount += 1;
  return collabSingleton;
};

const destroyCollab = () => {
  if (!collabSingleton) {
    return;
  }
  collabSingleton.provider.awareness.setLocalState(null);
  collabSingleton.provider.destroy();
  collabSingleton = null;
};

const releaseCollab = () => {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount > 0) {
    return;
  }
  destroyCollab();
};

const publishLocalPresence = (collab: CollabSingleton, editing: string | null = null) => {
  collab.provider.awareness.setLocalState({
    user: collab.user,
    tabId: collab.tabId,
    lastSeen: Date.now(),
    editing,
  });
};

const collectActivePresence = (collab: CollabSingleton) => {
  const states = collab.provider.awareness.getStates();
  const localClientId = collab.provider.awareness.clientID;
  const now = Date.now();
  const tabs = new Map<
    string,
    { user: CollabUser; lastSeen: number; editing: string | null; clientId: number }
  >();

  states.forEach((rawState, clientId) => {
    const state = rawState as AwarenessState;
    if (!state.user || !state.tabId || typeof state.lastSeen !== "number") {
      return;
    }
    if (now - state.lastSeen > PRESENCE_STALE_MS) {
      return;
    }

    const existing = tabs.get(state.tabId);
    if (!existing || state.lastSeen > existing.lastSeen) {
      tabs.set(state.tabId, {
        user: state.user,
        lastSeen: state.lastSeen,
        editing: state.editing ?? null,
        clientId,
      });
    }
  });

  const editors = new Map<string, CollabUser[]>();
  const online: CollabUser[] = [];

  tabs.forEach(({ user, editing, clientId }) => {
    online.push(user);
    if (clientId !== localClientId && editing) {
      const current = editors.get(editing) ?? [];
      current.push(user);
      editors.set(editing, current);
    }
  });

  return { online, editors };
};

// "Connected" must reflect the collab server link only. The WebsocketProvider
// also opens a BroadcastChannel for same-browser tab sync, so `bcconnected` is
// true even when the server is unreachable — relying on it would falsely report
// a live session offline.
const isProviderConnected = (collab: CollabSingleton): boolean =>
  collab.provider.wsconnected || collab.provider.synced;

const statusEventIsConnected = (event: ProviderStatusEvent): boolean => {
  const rawStatus = Array.isArray(event) ? event[0] : event;
  const status = typeof rawStatus === "string" ? rawStatus : rawStatus.status;
  return status === "connected";
};

/** Low-level access the simulated backend (leader client) uses to own the cache. */
export type RecalcBackendChannel = {
  clientId: number;
  getActiveClientIds: () => number[];
  getComputeRequests: () => Array<[string, string]>;
  getComputed: (targetId: string) => ComputedEntry | undefined;
  markComputedPending: (items: Array<{ id: string; hash: string }>) => void;
  commitComputed: (items: Array<{ id: string; value: number | null; hash: string }>) => void;
  clearComputeRequests: (ids: string[]) => void;
  observe: (listener: () => void) => () => void;
};

export type PricelistsCollab = {
  getCell: (cellId: string) => PricelistCellValue | undefined;
  setCell: (cellId: string, value: PricelistCellValue) => void;
  getStatus: (cellId: string) => DealerStatus | undefined;
  setStatus: (cellId: string, value: DealerStatus) => void;
  getParamDefs: (regionId: string) => ParameterDef[] | undefined;
  setParamDefs: (regionId: string, defs: ParameterDef[]) => void;
  getParamValue: (valueId: string) => number | undefined;
  setParamValue: (valueId: string, value: number) => void;
  clearParamValue: (valueId: string) => void;
  clearParamOverrides: (regionId: string, paramId: string) => void;
  setEditing: (cellId: string | null) => void;
  getEditors: (cellId: string) => CollabUser[];
  /** Read a backend-computed value from the shared cache. */
  getComputed: (targetId: string) => ComputedEntry | undefined;
  /** Ask the backend to (re)compute a target at the given input hash (batched). */
  requestCompute: (targetId: string, hash: string) => void;
  /** Backend channel for the leader-election recompute loop. */
  backend: RecalcBackendChannel;
  onlineUsers: CollabUser[];
  localUser: CollabUser | null;
  connected: boolean;
};

export const useYjsPricelists = (): PricelistsCollab => {
  const collabRef = useRef<CollabSingleton | null>(null);
  const editingDebounceRef = useRef<number | null>(null);
  const requestBufferRef = useRef<Map<string, string>>(new Map());
  const requestFlushRef = useRef<number | null>(null);
  const [, forceRender] = useState(0);
  const [connected, setConnected] = useState(false);
  const [editorsByCell, setEditorsByCell] = useState<Map<string, CollabUser[]>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<CollabUser[]>([]);
  const [localUser, setLocalUser] = useState<CollabUser | null>(null);
  const [clientId, setClientId] = useState(-1);

  useEffect(() => {
    const collab = acquireCollab();
    collabRef.current = collab;

    const handleSharedChange = () => {
      setConnected(isProviderConnected(collab));
      forceRender((value) => value + 1);
    };
    collab.prices.observe(handleSharedChange);
    collab.dealerStatuses.observe(handleSharedChange);
    collab.parameterDefs.observe(handleSharedChange);
    collab.parameterValues.observe(handleSharedChange);
    collab.computed.observe(handleSharedChange);

    const recomputeAwareness = () => {
      const { online, editors } = collectActivePresence(collab);
      setEditorsByCell(editors);
      setOnlineUsers(online);
    };

    collab.provider.awareness.on("change", recomputeAwareness);

    const handleStatus = (event: ProviderStatusEvent) => {
      setConnected(statusEventIsConnected(event) || isProviderConnected(collab));
    };
    const handleSync = (synced: boolean) => setConnected(synced || isProviderConnected(collab));
    collab.provider.on("status", handleStatus);
    collab.provider.on("sync", handleSync);

    const handlePageHide = () => {
      subscriberCount = 0;
      destroyCollab();
    };
    window.addEventListener("pagehide", handlePageHide);

    const heartbeat = window.setInterval(() => {
      const localState = collab.provider.awareness.getLocalState() as AwarenessState | null;
      publishLocalPresence(collab, localState?.editing ?? null);
      setConnected(isProviderConnected(collab));
      recomputeAwareness();
    }, PRESENCE_HEARTBEAT_MS);

    const timer = window.setTimeout(() => {
      publishLocalPresence(collab, null);
      setLocalUser(collab.user);
      setClientId(collab.provider.awareness.clientID);
      setConnected(isProviderConnected(collab));
      recomputeAwareness();
      forceRender((value) => value + 1);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      if (editingDebounceRef.current !== null) {
        window.clearTimeout(editingDebounceRef.current);
        editingDebounceRef.current = null;
      }
      window.clearInterval(heartbeat);
      if (requestFlushRef.current !== null) {
        window.clearTimeout(requestFlushRef.current);
        requestFlushRef.current = null;
      }
      window.removeEventListener("pagehide", handlePageHide);
      collab.prices.unobserve(handleSharedChange);
      collab.dealerStatuses.unobserve(handleSharedChange);
      collab.parameterDefs.unobserve(handleSharedChange);
      collab.parameterValues.unobserve(handleSharedChange);
      collab.computed.unobserve(handleSharedChange);
      collab.provider.awareness.off("change", recomputeAwareness);
      collab.provider.off("status", handleStatus);
      collab.provider.off("sync", handleSync);
      collabRef.current = null;
      releaseCollab();
    };
  }, []);

  const getCell = useCallback(
    (cellId: string): PricelistCellValue | undefined => collabRef.current?.prices.get(cellId),
    [],
  );

  const setCell = useCallback((cellId: string, value: PricelistCellValue) => {
    collabRef.current?.prices.set(cellId, value);
  }, []);

  const getStatus = useCallback(
    (cellId: string): DealerStatus | undefined => collabRef.current?.dealerStatuses.get(cellId),
    [],
  );

  const setStatus = useCallback((cellId: string, value: DealerStatus) => {
    collabRef.current?.dealerStatuses.set(cellId, value);
  }, []);

  const getParamDefs = useCallback(
    (regionId: string): ParameterDef[] | undefined => collabRef.current?.parameterDefs.get(regionId),
    [],
  );

  const setParamDefs = useCallback((regionId: string, defs: ParameterDef[]) => {
    collabRef.current?.parameterDefs.set(regionId, defs);
  }, []);

  const getParamValue = useCallback(
    (valueId: string): number | undefined => collabRef.current?.parameterValues.get(valueId),
    [],
  );

  const setParamValue = useCallback((valueId: string, value: number) => {
    collabRef.current?.parameterValues.set(valueId, value);
  }, []);

  const clearParamValue = useCallback((valueId: string) => {
    collabRef.current?.parameterValues.delete(valueId);
  }, []);

  // Remove every per-row override for a column, leaving the base value intact.
  const clearParamOverrides = useCallback((regionId: string, paramId: string) => {
    const collab = collabRef.current;
    if (!collab) {
      return;
    }
    const prefix = `${regionId}:param:${paramId}:`;
    const baseId = `${prefix}base`;
    const keysToDelete: string[] = [];
    collab.parameterValues.forEach((_value, key) => {
      if (key.startsWith(prefix) && key !== baseId) {
        keysToDelete.push(key);
      }
    });
    if (keysToDelete.length === 0) {
      return;
    }
    collab.doc.transact(() => {
      keysToDelete.forEach((key) => collab.parameterValues.delete(key));
    });
  }, []);

  const setEditing = useCallback((cellId: string | null) => {
    if (editingDebounceRef.current !== null) {
      window.clearTimeout(editingDebounceRef.current);
    }
    editingDebounceRef.current = window.setTimeout(() => {
      editingDebounceRef.current = null;
      const collab = collabRef.current;
      if (!collab) {
        return;
      }
      publishLocalPresence(collab, cellId);
    }, PRESENCE_DEBOUNCE_MS);
  }, []);

  const getEditors = useCallback(
    (cellId: string): CollabUser[] => editorsByCell.get(cellId) ?? [],
    [editorsByCell],
  );

  // Coalesce all compute requests raised during a render pass into one Yjs
  // transaction, so the backend wakes up once for the whole batch instead of
  // per cell.
  const flushRequests = useCallback(() => {
    requestFlushRef.current = null;
    const collab = collabRef.current;
    const buffer = requestBufferRef.current;
    if (!collab || buffer.size === 0) {
      return;
    }
    const entries = [...buffer.entries()];
    buffer.clear();
    collab.doc.transact(() => {
      entries.forEach(([targetId, hash]) => {
        if (collab.computeRequests.get(targetId) !== hash) {
          collab.computeRequests.set(targetId, hash);
        }
      });
    });
  }, []);

  const requestCompute = useCallback(
    (targetId: string, hash: string) => {
      requestBufferRef.current.set(targetId, hash);
      if (requestFlushRef.current === null) {
        requestFlushRef.current = window.setTimeout(flushRequests, 0);
      }
    },
    [flushRequests],
  );

  const getComputed = useCallback(
    (targetId: string): ComputedEntry | undefined => collabRef.current?.computed.get(targetId),
    [],
  );

  const getActiveClientIds = useCallback((): number[] => {
    const collab = collabRef.current;
    if (!collab) {
      return [];
    }
    const now = Date.now();
    const ids = new Set<number>([collab.provider.awareness.clientID]);
    collab.provider.awareness.getStates().forEach((rawState, id) => {
      const state = rawState as AwarenessState;
      if (typeof state.lastSeen === "number" && now - state.lastSeen <= PRESENCE_STALE_MS) {
        ids.add(id);
      }
    });
    return [...ids];
  }, []);

  const getComputeRequests = useCallback((): Array<[string, string]> => {
    const collab = collabRef.current;
    if (!collab) {
      return [];
    }
    const result: Array<[string, string]> = [];
    collab.computeRequests.forEach((hash, id) => result.push([id, hash]));
    return result;
  }, []);

  const markComputedPending = useCallback((items: Array<{ id: string; hash: string }>) => {
    const collab = collabRef.current;
    if (!collab || items.length === 0) {
      return;
    }
    const now = Date.now();
    collab.doc.transact(() => {
      items.forEach(({ id, hash }) => {
        const prev = collab.computed.get(id);
        collab.computed.set(id, { value: prev?.value ?? null, status: "pending", hash, updatedAt: now });
      });
    });
  }, []);

  const commitComputed = useCallback(
    (items: Array<{ id: string; value: number | null; hash: string }>) => {
      const collab = collabRef.current;
      if (!collab || items.length === 0) {
        return;
      }
      const now = Date.now();
      collab.doc.transact(() => {
        items.forEach(({ id, value, hash }) => {
          collab.computed.set(id, { value, status: "ready", hash, updatedAt: now });
        });
      });
    },
    [],
  );

  const clearComputeRequests = useCallback((ids: string[]) => {
    const collab = collabRef.current;
    if (!collab || ids.length === 0) {
      return;
    }
    collab.doc.transact(() => {
      ids.forEach((id) => collab.computeRequests.delete(id));
    });
  }, []);

  const observeBackend = useCallback((listener: () => void) => {
    const collab = collabRef.current;
    if (!collab) {
      return () => { };
    }
    collab.computeRequests.observe(listener);
    return () => collab.computeRequests.unobserve(listener);
  }, []);

  const backend = useMemo<RecalcBackendChannel>(
    () => ({
      clientId,
      getActiveClientIds,
      getComputeRequests,
      getComputed,
      markComputedPending,
      commitComputed,
      clearComputeRequests,
      observe: observeBackend,
    }),
    [
      clientId,
      getActiveClientIds,
      getComputeRequests,
      getComputed,
      markComputedPending,
      commitComputed,
      clearComputeRequests,
      observeBackend,
    ],
  );

  return {
    getCell,
    setCell,
    getStatus,
    setStatus,
    getParamDefs,
    setParamDefs,
    getParamValue,
    setParamValue,
    clearParamValue,
    clearParamOverrides,
    setEditing,
    getEditors,
    getComputed,
    requestCompute,
    backend,
    onlineUsers,
    localUser,
    connected,
  };
};
