"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ListColumnDef, ListGroupDef, ListSortDef, ListSortDirection, ListSortState, ListViewPersisted } from "./list-types";
import {
  buildListViewPersisted,
  buildSortDefs,
  defaultSortDirection,
  getDefaultSort,
  getDefaultVisibleColumnIds,
  isDefaultColumnVisibility,
  nextHeaderSort,
  orderVisibleColumns,
  parseListViewPersisted,
  serializeListViewPersisted,
  sortRows,
  toggleColumnVisibility,
} from "./list-view-state";

export type UseListViewOptions<TRow> = {
  listId: string;
  columns: ListColumnDef<TRow>[];
  sortDefs: ListSortDef<TRow>[];
  groupDefs?: ListGroupDef<TRow>[];
  defaultSort?: ListSortState;
};

export const getListViewStorageKey = (listId: string) => `oryx-logistics-list:${listId}`;

const sameSort = (left: ListSortState, right: ListSortState) =>
  left?.field === right?.field && left?.direction === right?.direction;

export const useListView = <TRow>({
  listId,
  columns,
  sortDefs: explicitSortDefs,
  groupDefs = [],
  defaultSort,
}: UseListViewOptions<TRow>) => {
  const storageKey = getListViewStorageKey(listId);
  const sortDefs = useMemo(() => buildSortDefs(columns, explicitSortDefs), [columns, explicitSortDefs]);
  const defaultVisibleIds = useMemo(() => getDefaultVisibleColumnIds(columns), [columns]);
  const resolvedDefaultSort = defaultSort ?? getDefaultSort(sortDefs);

  const [visibleColumnIds, setVisibleColumnIds] = useState(defaultVisibleIds);
  const [collapsedColumnIds, setCollapsedColumnIds] = useState<string[]>([]);
  const [sortState, setSortState] = useState<ListSortState>(resolvedDefaultSort);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  // Configs are often rebuilt on every render; hydrate once per list key from the latest ones.
  const latest = useRef({ columns, sortDefs, groupDefs, defaultVisibleIds, resolvedDefaultSort });
  useEffect(() => {
    latest.current = { columns, sortDefs, groupDefs, defaultVisibleIds, resolvedDefaultSort };
  });

  useEffect(() => {
    const storage = window.localStorage;
    if (!storage?.getItem) {
      return;
    }
    const current = latest.current;
    const stored = parseListViewPersisted(
      storage.getItem(storageKey),
      current.columns,
      current.sortDefs,
      current.groupDefs.map((group) => group.id),
    );
    const timer = window.setTimeout(() => {
      setVisibleColumnIds(
        stored?.hiddenColumns
          ? orderVisibleColumns(
              current.columns,
              current.columns.map((column) => column.id).filter((id) => !stored.hiddenColumns!.includes(id)),
            )
          : current.defaultVisibleIds,
      );
      setCollapsedColumnIds(stored?.collapsedColumns ?? []);
      setSortState(stored?.sort ?? current.resolvedDefaultSort);
      setGroupId(stored?.group ?? null);
      setHydratedKey(storageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) {
      return;
    }
    const storage = window.localStorage;
    if (!storage?.setItem) {
      return;
    }
    const payload = buildListViewPersisted(
      latest.current.columns as ListColumnDef<unknown>[],
      visibleColumnIds,
      collapsedColumnIds,
      sortState,
      groupId,
    );
    storage.setItem(storageKey, serializeListViewPersisted(payload));
  }, [collapsedColumnIds, groupId, hydratedKey, sortState, storageKey, visibleColumnIds]);

  const toggleColumn = useCallback(
    (columnId: string) => {
      setVisibleColumnIds((current) => toggleColumnVisibility(columns, current, columnId));
    },
    [columns],
  );

  const toggleCollapsed = useCallback((columnId: string) => {
    setCollapsedColumnIds((current) =>
      current.includes(columnId) ? current.filter((id) => id !== columnId) : [...current, columnId],
    );
  }, []);

  const expandAllColumns = useCallback(() => {
    setCollapsedColumnIds([]);
  }, []);

  const resetColumns = useCallback(() => {
    setVisibleColumnIds(getDefaultVisibleColumnIds(columns));
    setCollapsedColumnIds([]);
  }, [columns]);

  const setSortField = useCallback(
    (field: string, direction?: ListSortDirection) => {
      const def = sortDefs.find((item) => item.id === field);
      if (!def) {
        return;
      }
      setSortState({ field, direction: direction ?? defaultSortDirection(def.type, def.defaultDirection) });
    },
    [sortDefs],
  );

  const setSortDirection = useCallback((direction: ListSortDirection) => {
    setSortState((current) => (current ? { ...current, direction } : current));
  }, []);

  const cycleHeaderSort = useCallback(
    (field: string) => {
      if (!sortDefs.some((item) => item.id === field)) {
        return;
      }
      setSortState((current) => nextHeaderSort(current, field, resolvedDefaultSort));
    },
    [resolvedDefaultSort, sortDefs],
  );

  const applySortedRows = useCallback(
    (rows: TRow[]) => sortRows(rows, sortState, sortDefs),
    [sortDefs, sortState],
  );

  const toggleGroupCollapsed = useCallback((key: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const changeGroup = useCallback((next: string | null) => {
    setGroupId(next);
    setCollapsedGroups(new Set());
  }, []);

  return {
    sortDefs,
    visibleColumnIds,
    collapsedColumnIds,
    sortState,
    groupId,
    collapsedGroups,
    toggleColumn,
    toggleCollapsed,
    expandAllColumns,
    resetColumns,
    cycleHeaderSort,
    setSortField,
    setSortDirection,
    setGroupId: changeGroup,
    applySortedRows,
    toggleGroupCollapsed,
    hasCustomColumns: !isDefaultColumnVisibility(columns, visibleColumnIds) || collapsedColumnIds.length > 0,
    hasCustomSort: !sameSort(sortState, resolvedDefaultSort),
    defaultSort: resolvedDefaultSort,
    isColumnVisible: (columnId: string) => visibleColumnIds.includes(columnId),
    isColumnCollapsed: (columnId: string) => collapsedColumnIds.includes(columnId),
    isSortable: (columnId: string) => sortDefs.some((def) => def.id === columnId),
  };
};

export type ListViewController<TRow> = ReturnType<typeof useListView<TRow>>;
