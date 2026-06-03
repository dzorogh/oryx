"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import { buildParameterColumns, type PricelistColumnDefinition } from "./pricelists-columns";
import type { PricelistScope } from "./pricelists-demo-data";
import {
  buildParamBaseId,
  buildParamOverrideId,
  createParameterDef,
  getSeedParameterDefs,
  getSeedParamBase,
  isSystemParameter,
  normalizeParameterDefs,
  type ParameterDef,
} from "./pricelists-parameters";

export type ParameterResolvedCell = {
  value: number;
  isOverridden: boolean;
};

const HIDDEN_PARAMS_STORAGE_PREFIX = "store-pricelists-hidden-params";

const parseHiddenParamIds = (raw: string | null): Set<string> => {
  if (!raw) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
};

export type PricelistParameters = {
  enabled: boolean;
  defs: ParameterDef[];
  columns: PricelistColumnDefinition[];
  visibleColumns: PricelistColumnDefinition[];
  getBaseValue: (paramId: string) => number;
  setBaseValue: (paramId: string, value: number) => void;
  resolveCell: (paramId: string, rowId: string) => ParameterResolvedCell;
  setOverride: (paramId: string, rowId: string, value: number) => void;
  clearOverride: (paramId: string, rowId: string) => void;
  resetAllOverrides: (paramId: string) => void;
  addParameter: (input: {
    label: string;
    unit: string;
    baseValue: number;
    slug?: string;
    formula?: string;
    atIndex?: number;
  }) => void;
  updateParameter: (
    paramId: string,
    patch: { label?: string; unit?: string; slug?: string; formula?: string },
  ) => void;
  removeParameter: (paramId: string) => void;
  reorderParameter: (fromIndex: number, toIndex: number) => void;
  isVisible: (paramId: string) => boolean;
  toggleVisibility: (paramId: string) => void;
  resetVisibility: () => void;
  hasHiddenParameters: boolean;
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number): T[] => {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  if (moved === undefined) {
    return items;
  }
  next.splice(toIndex, 0, moved);
  return next;
};

/**
 * Region-scoped parameter columns shared across the Supplier and Dealer tabs.
 * Definitions and values fall back to deterministic seeds until the shared
 * collab doc holds explicit entries, mirroring how price cells are resolved.
 */
export const usePricelistParameters = (
  scope: PricelistScope,
  regionId: string,
  collab: PricelistsCollab,
): PricelistParameters => {
  const enabled = scope !== "global";

  const defs = useMemo<ParameterDef[]>(() => {
    if (!enabled) {
      return [];
    }
    const raw = collab.getParamDefs(regionId) ?? getSeedParameterDefs(regionId);
    return normalizeParameterDefs(raw, regionId);
    // collab map mutations trigger a re-render upstream, so reading during
    // render keeps `defs` current without an extra subscription here.
  }, [collab, enabled, regionId]);

  const columns = useMemo(() => buildParameterColumns(defs), [defs]);

  const storageKey = `${HIDDEN_PARAMS_STORAGE_PREFIX}:${regionId}`;
  const [hiddenParamIds, setHiddenParamIds] = useState<Set<string>>(() => new Set());
  const [visibilityHydrated, setVisibilityHydrated] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.getItem !== "function") {
      return;
    }
    const timer = window.setTimeout(() => {
      setHiddenParamIds(parseHiddenParamIds(storage.getItem(storageKey)));
      setVisibilityHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!visibilityHydrated) {
      return;
    }
    const storage = window.localStorage;
    if (!storage || typeof storage.setItem !== "function") {
      return;
    }
    storage.setItem(storageKey, JSON.stringify([...hiddenParamIds]));
  }, [storageKey, visibilityHydrated, hiddenParamIds]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => !column.paramId || !hiddenParamIds.has(column.paramId)),
    [columns, hiddenParamIds],
  );

  const getCurrentDefs = useCallback((): ParameterDef[] => {
    const raw = collab.getParamDefs(regionId) ?? getSeedParameterDefs(regionId);
    return normalizeParameterDefs(raw, regionId);
  }, [collab, regionId]);

  const getSystemIndex = useCallback(
    (current: ParameterDef[]): number => current.findIndex((def) => isSystemParameter(def.id)),
    [],
  );

  const persistDefs = useCallback(
    (next: ParameterDef[]) => collab.setParamDefs(regionId, normalizeParameterDefs(next, regionId)),
    [collab, regionId],
  );

  const getBaseValue = useCallback(
    (paramId: string): number =>
      collab.getParamValue(buildParamBaseId(regionId, paramId)) ?? getSeedParamBase(regionId, paramId),
    [collab, regionId],
  );

  const setBaseValue = useCallback(
    (paramId: string, value: number) => collab.setParamValue(buildParamBaseId(regionId, paramId), value),
    [collab, regionId],
  );

  const resolveCell = useCallback(
    (paramId: string, rowId: string): ParameterResolvedCell => {
      const override = collab.getParamValue(buildParamOverrideId(regionId, paramId, rowId));
      if (override !== undefined) {
        return { value: override, isOverridden: true };
      }
      return { value: getBaseValue(paramId), isOverridden: false };
    },
    [collab, getBaseValue, regionId],
  );

  const setOverride = useCallback(
    (paramId: string, rowId: string, value: number) =>
      collab.setParamValue(buildParamOverrideId(regionId, paramId, rowId), value),
    [collab, regionId],
  );

  const clearOverride = useCallback(
    (paramId: string, rowId: string) =>
      collab.clearParamValue(buildParamOverrideId(regionId, paramId, rowId)),
    [collab, regionId],
  );

  const resetAllOverrides = useCallback(
    (paramId: string) => collab.clearParamOverrides(regionId, paramId),
    [collab, regionId],
  );

  const addParameter = useCallback(
    (input: { label: string; unit: string; baseValue: number; slug?: string; formula?: string; atIndex?: number }) => {
      const def = createParameterDef(input.label.trim() || "Parameter", input.unit, {
        slug: input.slug,
        formula: input.formula,
      });
      const current = getCurrentDefs();
      const systemIndex = getSystemIndex(current);
      const maxInsertIndex = systemIndex >= 0 ? systemIndex : current.length;
      const index =
        input.atIndex === undefined ? maxInsertIndex : Math.max(0, Math.min(input.atIndex, maxInsertIndex));
      const next = [...current];
      next.splice(index, 0, def);
      persistDefs(next);
      collab.setParamValue(buildParamBaseId(regionId, def.id), input.baseValue);
    },
    [collab, getCurrentDefs, getSystemIndex, persistDefs, regionId],
  );

  const updateParameter = useCallback(
    (paramId: string, patch: { label?: string; unit?: string; slug?: string; formula?: string }) => {
      const trimmedLabel = patch.label?.trim();
      persistDefs(
        getCurrentDefs().map((def) =>
          def.id === paramId
            ? {
              ...def,
              ...(trimmedLabel ? { label: trimmedLabel } : {}),
              ...(patch.unit !== undefined ? { unit: patch.unit } : {}),
              ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
              ...(patch.formula !== undefined ? { formula: patch.formula } : {}),
            }
            : def,
        ),
      );
    },
    [getCurrentDefs, persistDefs],
  );

  const removeParameter = useCallback(
    (paramId: string) => {
      if (isSystemParameter(paramId)) {
        return;
      }
      persistDefs(getCurrentDefs().filter((def) => def.id !== paramId));
    },
    [getCurrentDefs, persistDefs],
  );

  const isVisible = useCallback(
    (paramId: string): boolean => !hiddenParamIds.has(paramId),
    [hiddenParamIds],
  );

  const toggleVisibility = useCallback((paramId: string) => {
    setHiddenParamIds((prev) => {
      const next = new Set(prev);
      if (next.has(paramId)) {
        next.delete(paramId);
      } else {
        next.add(paramId);
      }
      return next;
    });
  }, []);

  const resetVisibility = useCallback(() => {
    setHiddenParamIds(new Set());
  }, []);

  const hasHiddenParameters = hiddenParamIds.size > 0;

  const reorderParameter = useCallback(
    (fromIndex: number, toIndex: number) => {
      const current = getCurrentDefs();
      const systemIndex = getSystemIndex(current);
      if (systemIndex >= 0 && (fromIndex === systemIndex || toIndex >= systemIndex)) {
        return;
      }
      if (fromIndex === toIndex) {
        return;
      }
      persistDefs(moveItem(current, fromIndex, toIndex));
    },
    [getCurrentDefs, getSystemIndex, persistDefs],
  );

  return {
    enabled,
    defs,
    columns,
    visibleColumns,
    getBaseValue,
    setBaseValue,
    resolveCell,
    setOverride,
    clearOverride,
    resetAllOverrides,
    addParameter,
    updateParameter,
    removeParameter,
    reorderParameter,
    isVisible,
    toggleVisibility,
    resetVisibility,
    hasHiddenParameters,
  };
};
