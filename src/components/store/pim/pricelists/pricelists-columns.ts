import type { PricelistScope } from "./pricelists-demo-data";
import type { PriceField } from "./pricelists-helpers";

export const PRICELIST_COLUMNS_STORAGE_PREFIX = "store-pricelists-visible-columns";

export type PricelistColumnId =
  | "name"
  | "purchase"
  | "purchaseUsd"
  | "dealer"
  | "dealerUsd"
  | "retail"
  | "retailUsd"
  | "dealerStatus";

export type PricelistColumnKind = "name" | "editable" | "usd" | "statusSummary";

export type PricelistColumnDefinition = {
  id: PricelistColumnId;
  label: string;
  kind: PricelistColumnKind;
  field?: PriceField;
  widthClass: string;
  defaultVisible: boolean;
  locked?: boolean;
};

const COLUMN_DEFINITIONS: Record<PricelistColumnId, PricelistColumnDefinition> = {
  name: { id: "name", label: "Name", kind: "name", widthClass: "w-[260px]", defaultVisible: true, locked: true },
  purchase: {
    id: "purchase",
    label: "Purchase Price",
    kind: "editable",
    field: "purchase",
    widthClass: "w-[172px]",
    defaultVisible: true,
  },
  purchaseUsd: {
    id: "purchaseUsd",
    label: "Purchase Price (USD)",
    kind: "usd",
    field: "purchase",
    widthClass: "w-[136px]",
    defaultVisible: true,
  },
  dealer: {
    id: "dealer",
    label: "Dealer Price",
    kind: "editable",
    field: "dealer",
    widthClass: "w-[172px]",
    defaultVisible: true,
  },
  dealerUsd: {
    id: "dealerUsd",
    label: "Dealer Price (USD)",
    kind: "usd",
    field: "dealer",
    widthClass: "w-[136px]",
    defaultVisible: true,
  },
  retail: {
    id: "retail",
    label: "Retail Price",
    kind: "editable",
    field: "retail",
    widthClass: "w-[172px]",
    defaultVisible: true,
  },
  retailUsd: {
    id: "retailUsd",
    label: "Retail Price (USD)",
    kind: "usd",
    field: "retail",
    widthClass: "w-[136px]",
    defaultVisible: true,
  },
  dealerStatus: {
    id: "dealerStatus",
    label: "Dealer Status",
    kind: "statusSummary",
    widthClass: "w-[200px]",
    defaultVisible: true,
  },
};

// Column order per scope. Name is locked (always visible); every other column
// can be toggled from the Columns panel. Prices are independent — no grouped
// header spans the editable price and its USD conversion.
const SCOPE_COLUMN_IDS: Record<PricelistScope, PricelistColumnId[]> = {
  global: ["name", "purchase", "purchaseUsd", "dealerStatus"],
  supplier: ["name", "purchase", "purchaseUsd", "dealer", "dealerUsd", "retail", "retailUsd"],
  dealer: ["name", "dealer", "dealerUsd", "retail", "retailUsd"],
};

export const getScopeColumns = (scope: PricelistScope): PricelistColumnDefinition[] =>
  SCOPE_COLUMN_IDS[scope].map((id) => COLUMN_DEFINITIONS[id]);

export const getToggleableColumns = (scope: PricelistScope): PricelistColumnDefinition[] =>
  getScopeColumns(scope).filter((column) => !column.locked);

export const getDefaultVisibleColumnIds = (scope: PricelistScope): PricelistColumnId[] =>
  getScopeColumns(scope)
    .filter((column) => column.defaultVisible)
    .map((column) => column.id);

export const getColumnsStorageKey = (scope: PricelistScope): string =>
  `${PRICELIST_COLUMNS_STORAGE_PREFIX}:${scope}`;

// Keeps the scope's defined order while always including locked columns.
export const getOrderedVisibleColumns = (
  scope: PricelistScope,
  visibleIds: Iterable<PricelistColumnId>,
): PricelistColumnId[] => {
  const visibleSet = new Set(visibleIds);

  return getScopeColumns(scope)
    .filter((column) => column.locked || visibleSet.has(column.id))
    .map((column) => column.id);
};

export const getVisibleColumnDefinitions = (
  scope: PricelistScope,
  visibleIds: Iterable<PricelistColumnId>,
): PricelistColumnDefinition[] =>
  getOrderedVisibleColumns(scope, visibleIds).map((id) => COLUMN_DEFINITIONS[id]);

export const parseStoredColumns = (
  scope: PricelistScope,
  raw: string | null,
): PricelistColumnId[] | null => {
  if (!raw) {
    return null;
  }

  const validIdSet = new Set<PricelistColumnId>(SCOPE_COLUMN_IDS[scope]);

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const validIds = parsed.filter(
      (value): value is PricelistColumnId => typeof value === "string" && validIdSet.has(value as PricelistColumnId),
    );

    return getOrderedVisibleColumns(scope, validIds);
  } catch {
    return null;
  }
};

export const serializeVisibleColumns = (scope: PricelistScope, visibleIds: PricelistColumnId[]): string =>
  JSON.stringify(getOrderedVisibleColumns(scope, visibleIds));

export const isDefaultColumnSet = (scope: PricelistScope, visibleIds: PricelistColumnId[]): boolean => {
  const ordered = getOrderedVisibleColumns(scope, visibleIds);
  const defaults = getDefaultVisibleColumnIds(scope);

  if (ordered.length !== defaults.length) {
    return false;
  }

  return defaults.every((columnId, index) => ordered[index] === columnId);
};
