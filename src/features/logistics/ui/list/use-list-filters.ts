"use client";

import { useCallback, useMemo, useState } from "react";
import {
  applyListFilters,
  buildListFilterOptions,
  isListFilterActive,
  multiValue,
  type ListFilterDef,
  type ListFilterOptionWithCount,
  type ListFilterState,
  type ListFilterValue,
} from "./list-filters";

export const useListFilters = <TRow>(defs: ListFilterDef<TRow>[], rows: TRow[], onChange?: () => void) => {
  const [state, setState] = useState<ListFilterState>({});

  const filteredRows = useMemo(() => applyListFilters(rows, defs, state), [defs, rows, state]);

  const optionsById = useMemo(() => {
    const map = new Map<string, ListFilterOptionWithCount[]>();
    for (const def of defs) {
      if (def.kind !== "multi") continue;
      const scope = applyListFilters(rows, defs, state, def.id);
      map.set(def.id, buildListFilterOptions(def, scope, multiValue(state[def.id])));
    }
    return map;
  }, [defs, rows, state]);

  const activeDefs = useMemo(() => defs.filter((def) => isListFilterActive(def, state[def.id])), [defs, state]);

  const setValue = useCallback(
    (id: string, value: ListFilterValue | undefined) => {
      setState((current) => ({ ...current, [id]: value }));
      onChange?.();
    },
    [onChange],
  );

  const clear = useCallback(
    (id: string) => {
      setState((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      onChange?.();
    },
    [onChange],
  );

  const reset = useCallback(() => {
    setState({});
    onChange?.();
  }, [onChange]);

  return {
    defs,
    state,
    filteredRows,
    activeDefs,
    activeCount: activeDefs.length,
    options: (id: string) => optionsById.get(id) ?? [],
    setValue,
    clear,
    reset,
  };
};

export type ListFiltersController<TRow> = ReturnType<typeof useListFilters<TRow>>;
