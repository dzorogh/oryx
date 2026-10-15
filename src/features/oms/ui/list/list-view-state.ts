import type {
  ListColumnDef,
  ListGroupDef,
  ListSortDef,
  ListSortDirection,
  ListSortState,
  ListSortType,
  ListViewPersisted,
} from "./list-types";

export const COLLAPSED_COLUMN_WIDTH = "28px";

export const getDefaultVisibleColumnIds = <TRow>(columns: ListColumnDef<TRow>[]) =>
  columns.filter((column) => !column.defaultHidden).map((column) => column.id);

export const getDefaultSort = <TRow>(sortDefs: ListSortDef<TRow>[]): ListSortState => {
  const first = sortDefs[0];
  if (!first) {
    return null;
  }
  return { field: first.id, direction: defaultSortDirection(first.type, first.defaultDirection) };
};

export const isEmptySortValue = (value: unknown) =>
  value == null || value === "" || (typeof value === "number" && Number.isNaN(value));

export const compareSortValues = (
  left: unknown,
  right: unknown,
  direction: ListSortDirection,
  type: "text" | "number" | "date",
): number => {
  const leftEmpty = isEmptySortValue(left);
  const rightEmpty = isEmptySortValue(right);
  if (leftEmpty && rightEmpty) {
    return 0;
  }
  if (leftEmpty) {
    return 1;
  }
  if (rightEmpty) {
    return -1;
  }

  let result = 0;
  if (type === "number") {
    result = Number(left) - Number(right);
  } else if (type === "date") {
    const leftMs = Date.parse(String(left));
    const rightMs = Date.parse(String(right));
    result = (Number.isFinite(leftMs) ? leftMs : 0) - (Number.isFinite(rightMs) ? rightMs : 0);
  } else {
    result = String(left).localeCompare(String(right), "ru", { numeric: true, sensitivity: "base" });
  }

  return direction === "asc" ? result : -result;
};

export const nextHeaderSort = (
  current: ListSortState,
  field: string,
  defaultSort: ListSortState,
): ListSortState => {
  if (!current || current.field !== field) {
    return { field, direction: "asc" };
  }
  if (current.direction === "asc") {
    return { field, direction: "desc" };
  }
  return defaultSort;
};

export const buildListViewPersisted = (
  columns: Array<Pick<ListColumnDef<never>, "id">>,
  visibleIds: string[],
  collapsedIds: string[],
  sort: ListSortState,
  group: string | null,
): ListViewPersisted => ({
  hiddenColumns: columns.map((column) => column.id).filter((id) => !visibleIds.includes(id)),
  collapsedColumns: collapsedIds,
  sort,
  group,
});

export const sortRows = <TRow>(
  rows: TRow[],
  sortState: ListSortState,
  sortDefs: ListSortDef<TRow>[],
): TRow[] => {
  if (!sortState) {
    return rows;
  }
  const def = sortDefs.find((item) => item.id === sortState.field);
  if (!def) {
    return rows;
  }

  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const byValue = compareSortValues(
        def.value(left.row),
        def.value(right.row),
        sortState.direction,
        def.type,
      );
      if (byValue !== 0) {
        return byValue;
      }
      return left.index - right.index;
    })
    .map((item) => item.row);
};

export type ListGroup<TRow> = {
  key: string;
  rows: TRow[];
};

export const groupRows = <TRow>(
  rows: TRow[],
  groupId: string | null,
  groupDefs: ListGroupDef<TRow>[],
): ListGroup<TRow>[] => {
  if (!groupId) {
    return [{ key: "", rows }];
  }
  const def = groupDefs.find((item) => item.id === groupId);
  if (!def) {
    return [{ key: "", rows }];
  }

  const map = new Map<string, TRow[]>();
  for (const row of rows) {
    const key = def.key(row);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(row);
    } else {
      map.set(key, [row]);
    }
  }

  const groups = [...map.entries()].map(([key, groupRows]) => ({ key, rows: groupRows }));
  if (def.order) {
    const rank = (key: string) => {
      const index = def.order!.indexOf(key);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    return groups
      .map((group, index) => ({ group, index }))
      .sort((left, right) => rank(left.group.key) - rank(right.group.key) || left.index - right.index)
      .map((item) => item.group);
  }
  return groups;
};

export const defaultSortDirection = (type: ListSortType, preferred?: ListSortDirection): ListSortDirection =>
  preferred ?? (type === "text" ? "asc" : "desc");

/** Explicit sort defs first (the first one is the default), then every sortable column not yet listed. */
export const buildSortDefs = <TRow>(
  columns: ListColumnDef<TRow>[],
  sortDefs: ListSortDef<TRow>[],
): ListSortDef<TRow>[] => {
  const ids = new Set(sortDefs.map((def) => def.id));
  const fromColumns = columns.flatMap((column): ListSortDef<TRow>[] =>
    column.sortType && column.sortValue && !ids.has(column.id)
      ? [{ id: column.id, label: column.label, type: column.sortType, value: column.sortValue }]
      : [],
  );
  return [...sortDefs, ...fromColumns];
};

export const parseListViewPersisted = <TRow>(
  raw: string | null,
  columns: ListColumnDef<TRow>[],
  sortDefs: ListSortDef<TRow>[],
  groupIds: string[],
): ListViewPersisted | null => {
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ListViewPersisted;
    const validColumnIds = new Set(columns.map((column) => column.id));
    const validSortIds = new Set(sortDefs.map((sort) => sort.id));
    const validGroupIds = new Set(groupIds);

    const hiddenColumns = Array.isArray(parsed.hiddenColumns)
      ? parsed.hiddenColumns.filter((id) => validColumnIds.has(id) && !columns.find((c) => c.id === id)?.locked)
      : undefined;

    const collapsedColumns = Array.isArray(parsed.collapsedColumns)
      ? parsed.collapsedColumns.filter((id) => validColumnIds.has(id))
      : undefined;

    let sort: ListSortState = null;
    if (parsed.sort && validSortIds.has(parsed.sort.field)) {
      sort = {
        field: parsed.sort.field,
        direction: parsed.sort.direction === "desc" ? "desc" : "asc",
      };
    }

    const group =
      parsed.group == null || parsed.group === ""
        ? null
        : validGroupIds.has(parsed.group)
          ? parsed.group
          : null;

    return { hiddenColumns, collapsedColumns, sort, group };
  } catch {
    return null;
  }
};

export const serializeListViewPersisted = (state: ListViewPersisted): string => JSON.stringify(state);

export const isDefaultColumnVisibility = <TRow>(
  columns: ListColumnDef<TRow>[],
  visibleIds: string[],
) => {
  const defaults = getDefaultVisibleColumnIds(columns);
  if (defaults.length !== visibleIds.length) {
    return false;
  }
  return defaults.every((id, index) => id === visibleIds[index]);
};

export const orderVisibleColumns = <TRow>(columns: ListColumnDef<TRow>[], visibleIds: Iterable<string>) => {
  const wanted = new Set(visibleIds);
  return columns.filter((column) => wanted.has(column.id)).map((column) => column.id);
};

export const toggleColumnVisibility = <TRow>(
  columns: ListColumnDef<TRow>[],
  visibleIds: string[],
  columnId: string,
) => {
  const column = columns.find((item) => item.id === columnId);
  if (!column || column.locked) {
    return visibleIds;
  }
  const next = new Set(visibleIds);
  if (next.has(columnId)) {
    next.delete(columnId);
  } else {
    next.add(columnId);
  }
  return orderVisibleColumns(columns, next);
};

export const sumProductQuantities = (products: Array<{ quantity: number }>) =>
  products.reduce((sum, line) => sum + (line.quantity ?? 0), 0);
