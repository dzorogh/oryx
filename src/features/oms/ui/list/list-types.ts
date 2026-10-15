import type { ReactNode } from "react";

export type ListSortDirection = "asc" | "desc";

export type ListSortType = "text" | "number" | "date";

export type ListColumnAlign = "left" | "right";

export type ListColumnDef<TRow> = {
  id: string;
  label: string;
  description?: string;
  align?: ListColumnAlign;
  defaultHidden?: boolean;
  locked?: boolean;
  minWidth?: string;
  sortType?: ListSortType;
  sortValue?: (row: TRow) => string | number | null | undefined;
  render: (row: TRow) => ReactNode;
};

export type ListGroupDef<TRow> = {
  id: string;
  label: string;
  key: (row: TRow) => string;
  renderHeader: (key: string, rows: TRow[]) => ReactNode;
  /** Fixed group order; keys not listed go last in first-seen order. */
  order?: string[];
};

export type ListSortDef<TRow> = {
  id: string;
  label: string;
  type: ListSortType;
  value: (row: TRow) => string | number | null | undefined;
  defaultDirection?: ListSortDirection;
};

export type ListSortState = {
  field: string;
  direction: ListSortDirection;
} | null;

export type ListViewPersisted = {
  hiddenColumns?: string[];
  collapsedColumns?: string[];
  sort?: ListSortState;
  group?: string | null;
};

export type ListToggleOption = {
  value: string;
  label: string;
  description?: string;
};
