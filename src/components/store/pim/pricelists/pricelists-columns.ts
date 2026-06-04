import type { PricelistScope } from "./pricelists-demo-data";
import type { PriceField } from "./pricelists-helpers";
import { PARAMETER_COLUMN_WIDTH_CLASS, type ParameterDef } from "./pricelists-parameters";

export const PRICELIST_COLUMNS_STORAGE_PREFIX = "store-pricelists-visible-columns";

export type PricelistColumnId =
  | "name"
  | "purchase"
  | "dealer"
  | "dealerMarkup"
  | "retail"
  | "retailMarkupNoExpenses"
  | "retailMarkup"
  | "dealerStatus";

/**
 * `editable` is a **dual** price column: it renders both the source-currency
 * amount and its USD conversion in a single combined input (no separate USD
 * column). The `usd` kind is no longer used by table columns — it survives only
 * as a synthetic column the Excel export expands `editable` into, so the
 * spreadsheet keeps a dedicated USD column.
 */
export type PricelistColumnKind = "name" | "editable" | "usd" | "markup" | "statusSummary" | "parameter";

/**
 * Which premium a markup column reports:
 * - `dealer` — dealer price over plant price (Global Markup);
 * - `retail` — retail price over landed cost (dealer price + Total Expenses);
 * - `retailNoExpenses` — retail price over the bare dealer price (no expenses).
 */
export type MarkupBasis = "dealer" | "retail" | "retailNoExpenses";

export type PricelistColumnDefinition = {
  id: string;
  label: string;
  /** Header tooltip copy shown under the column name on hover. */
  description?: string;
  kind: PricelistColumnKind;
  field?: PriceField;
  /** Markup columns only: which premium the column derives. */
  markup?: MarkupBasis;
  /** Parameter columns only: stable parameter id (without the `param:` prefix). */
  paramId?: string;
  /** Marks a dynamic, region-scoped parameter column. */
  isParameter?: boolean;
  /** Renders after the dynamic parameter group, behind a dashed group divider. */
  afterParameters?: boolean;
  widthClass: string;
  defaultVisible: boolean;
  locked?: boolean;
};

/** Static columns keep their literal id so the visibility system stays typed. */
type StaticColumnDefinition = PricelistColumnDefinition & { id: PricelistColumnId };

const COLUMN_DEFINITIONS = {
  name: {
    id: "name",
    label: "Name",
    description: "Product name, image, and ID.",
    kind: "name",
    widthClass: "w-[260px]",
    defaultVisible: true,
    locked: true,
  },
  purchase: {
    id: "purchase",
    label: "Plant Price",
    description: "Base price set by the plant. Edit it in its source currency or in USD — both stay in sync.",
    kind: "editable",
    field: "purchase",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  dealer: {
    id: "dealer",
    label: "Dealer Price",
    description: "Price charged to the dealer. Edit it in its source currency or in USD — both stay in sync.",
    kind: "editable",
    field: "dealer",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  dealerMarkup: {
    id: "dealerMarkup",
    label: "Global Markup (%)",
    description: "Markup over Plant Price that is included in the Dealer Price.",
    kind: "markup",
    markup: "dealer",
    widthClass: "w-[120px]",
    defaultVisible: true,
  },
  retail: {
    id: "retail",
    label: "Retail Price",
    description:
      "Recommended price for the end customer. Edit it in its source currency or in USD — both stay in sync.",
    kind: "editable",
    field: "retail",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  retailMarkupNoExpenses: {
    id: "retailMarkupNoExpenses",
    label: "Dealer Markup w/o Expenses (%)",
    description: "Dealer margin without expenses: markup of Retail Price over the bare Dealer Price.",
    kind: "markup",
    markup: "retailNoExpenses",
    widthClass: "w-[140px]",
    defaultVisible: true,
  },
  retailMarkup: {
    id: "retailMarkup",
    label: "Dealer Markup w/ Expenses (%)",
    description: "Dealer margin including expenses: markup of Retail Price over landed cost (Dealer Price + Total Expenses).",
    kind: "markup",
    markup: "retail",
    afterParameters: true,
    widthClass: "w-[140px]",
    defaultVisible: true,
  },
  dealerStatus: {
    id: "dealerStatus",
    label: "Dealer Status",
    description: "Number of regions where this product is available.",
    kind: "statusSummary",
    widthClass: "w-[200px]",
    defaultVisible: true,
  },
} satisfies Record<PricelistColumnId, StaticColumnDefinition>;

// Column order per scope. Name is locked (always visible); every other column
// can be toggled from the Columns panel. Each price is a single dual column that
// shows its source-currency amount and USD conversion in one combined input.
const SCOPE_COLUMN_IDS: Record<PricelistScope, PricelistColumnId[]> = {
  global: ["name", "purchase", "dealerStatus"],
  supplier: [
    "name",
    "purchase",
    "dealer",
    "dealerMarkup",
    "retail",
    "retailMarkupNoExpenses",
    "retailMarkup",
  ],
  dealer: ["name", "dealer", "retail", "retailMarkupNoExpenses", "retailMarkup"],
};

export const getScopeColumns = (scope: PricelistScope): StaticColumnDefinition[] =>
  SCOPE_COLUMN_IDS[scope].map((id) => COLUMN_DEFINITIONS[id]);

/** Build dynamic column definitions from the region's parameter list. */
export const buildParameterColumns = (defs: ParameterDef[]): PricelistColumnDefinition[] =>
  defs.map((def) => ({
    id: `param:${def.id}`,
    label: def.label,
    kind: "parameter",
    paramId: def.id,
    isParameter: true,
    widthClass: PARAMETER_COLUMN_WIDTH_CLASS,
    defaultVisible: true,
  }));

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
