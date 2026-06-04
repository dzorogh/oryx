import type { PricelistInfoField, PricelistScope } from "./pricelists-demo-data";
import type { PriceField } from "./pricelists-helpers";
import { PARAMETER_COLUMN_WIDTH_CLASS, type ParameterDef } from "./pricelists-parameters";

export const PRICELIST_COLUMNS_STORAGE_PREFIX = "store-pricelists-visible-columns";

export type PricelistColumnId =
  | "name"
  | "plantModelName"
  | "plant"
  | "retailStatus"
  | "dimension"
  | "cbmPerUnit"
  | "capacityPerContainer"
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
export type PricelistColumnKind =
  | "name"
  | "info"
  | "retailStatus"
  | "editable"
  | "usd"
  | "markup"
  | "statusSummary"
  | "parameter";

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
  /** Info columns only: which read-only source field the column displays. */
  infoField?: PricelistInfoField;
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
  plantModelName: {
    id: "plantModelName",
    label: "Plant Model Name",
    description: "Factory model name. Maintained on the product variant card.",
    kind: "info",
    infoField: "plantModelName",
    widthClass: "w-[180px]",
    defaultVisible: true,
  },
  plant: {
    id: "plant",
    label: "Plant",
    description: "Production site. Shown as a short code; hover for the full plant name.",
    kind: "info",
    infoField: "plant",
    widthClass: "w-[110px]",
    defaultVisible: true,
  },
  retailStatus: {
    id: "retailStatus",
    label: "Retail Status",
    description:
      "Marketing-facing retail state for the region. Editable on Supplier, read-only on Dealer. Does not control pricelist inclusion.",
    kind: "retailStatus",
    widthClass: "w-[200px]",
    defaultVisible: true,
  },
  dimension: {
    id: "dimension",
    label: "Dimension",
    description: "Package dimensions (length × width × height, in metres).",
    kind: "info",
    infoField: "dimension",
    widthClass: "w-[150px]",
    defaultVisible: true,
  },
  cbmPerUnit: {
    id: "cbmPerUnit",
    label: "CBM / Unit",
    description: "Volume of a single unit, in cubic metres.",
    kind: "info",
    infoField: "cbmPerUnit",
    widthClass: "w-[110px]",
    defaultVisible: true,
  },
  capacityPerContainer: {
    id: "capacityPerContainer",
    label: "Capacity per Container",
    description: "Number of units that fit in a full container.",
    kind: "info",
    infoField: "capacityPerContainer",
    widthClass: "w-[170px]",
    defaultVisible: true,
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
    label: "Global Markup",
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
    label: "Dealer Markup w/o Expenses",
    description: "Dealer margin without expenses: markup of Retail Price over the bare Dealer Price.",
    kind: "markup",
    markup: "retailNoExpenses",
    widthClass: "w-[140px]",
    defaultVisible: true,
  },
  retailMarkup: {
    id: "retailMarkup",
    label: "Dealer Markup w/ Expenses",
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
  global: [
    "name",
    "plantModelName",
    "plant",
    "dimension",
    "cbmPerUnit",
    "capacityPerContainer",
    "purchase",
    "dealerStatus",
  ],
  supplier: [
    "name",
    "plantModelName",
    "plant",
    "retailStatus",
    "dimension",
    "cbmPerUnit",
    "capacityPerContainer",
    "purchase",
    "dealer",
    "dealerMarkup",
    "retail",
    "retailMarkupNoExpenses",
    "retailMarkup",
  ],
  dealer: [
    "name",
    "plant",
    "retailStatus",
    "dimension",
    "cbmPerUnit",
    "capacityPerContainer",
    "dealer",
    "retail",
    "retailMarkupNoExpenses",
    "retailMarkup",
  ],
};

/** Dealer scope renders prices as plain read-only text, so they need far less room than the editable dual inputs. */
const DEALER_PRICE_WIDTH_CLASS = "w-[220px]";

export const getScopeColumns = (scope: PricelistScope): StaticColumnDefinition[] =>
  SCOPE_COLUMN_IDS[scope].map((id) => {
    const column = COLUMN_DEFINITIONS[id];
    if (scope === "dealer" && column.kind === "editable") {
      return { ...column, widthClass: DEALER_PRICE_WIDTH_CLASS };
    }
    return column;
  });

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
): PricelistColumnDefinition[] => {
  // Use getScopeColumns (not COLUMN_DEFINITIONS) so scope-specific overrides like
  // the narrower dealer price width survive into the rendered table.
  const visibleSet = new Set(visibleIds);
  return getScopeColumns(scope).filter((column) => column.locked || visibleSet.has(column.id));
};

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
