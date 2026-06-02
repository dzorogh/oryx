"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getColumnsStorageKey,
  getDefaultVisibleColumnIds,
  getOrderedVisibleColumns,
  isDefaultColumnSet,
  parseStoredColumns,
  serializeVisibleColumns,
  type PricelistColumnId,
} from "./pricelists-columns";
import type { PricelistScope } from "./pricelists-demo-data";

export type PricelistColumns = {
  visibleIds: PricelistColumnId[];
  isVisible: (columnId: PricelistColumnId) => boolean;
  toggle: (columnId: PricelistColumnId) => void;
  hasCustom: boolean;
  onReset: () => void;
};

export const usePricelistColumns = (scope: PricelistScope): PricelistColumns => {
  const storageKey = getColumnsStorageKey(scope);
  const defaultIds = useMemo(() => getDefaultVisibleColumnIds(scope), [scope]);
  const [visibleColumnIds, setVisibleColumnIds] = useState<PricelistColumnId[]>(defaultIds);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  // Hydrate from per-scope storage. Switching scope re-runs this and loads the
  // stored set for the new scope (or its defaults), so toggles persist per list.
  useEffect(() => {
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }

    const stored = parseStoredColumns(scope, storage.getItem(storageKey));
    const timer = window.setTimeout(() => {
      setVisibleColumnIds(stored ?? getDefaultVisibleColumnIds(scope));
      setHydratedKey(storageKey);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [scope, storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) {
      return;
    }

    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }

    storage.setItem(storageKey, serializeVisibleColumns(scope, visibleColumnIds));
  }, [hydratedKey, scope, storageKey, visibleColumnIds]);

  const orderedVisibleColumnIds = useMemo(
    () => getOrderedVisibleColumns(scope, visibleColumnIds),
    [scope, visibleColumnIds],
  );

  const toggle = useCallback(
    (columnId: PricelistColumnId) => {
      setVisibleColumnIds((currentIds) => {
        const next = new Set(currentIds);
        if (next.has(columnId)) {
          next.delete(columnId);
        } else {
          next.add(columnId);
        }
        return getOrderedVisibleColumns(scope, next);
      });
    },
    [scope],
  );

  const onReset = useCallback(() => {
    setVisibleColumnIds(getDefaultVisibleColumnIds(scope));
  }, [scope]);

  return {
    visibleIds: orderedVisibleColumnIds,
    isVisible: (columnId) => orderedVisibleColumnIds.includes(columnId),
    toggle,
    hasCustom: !isDefaultColumnSet(scope, orderedVisibleColumnIds),
    onReset,
  };
};
