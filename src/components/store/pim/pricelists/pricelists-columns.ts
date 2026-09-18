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
    label: "Название",
    description: "Название товара, фото и идентификатор.",
    kind: "name",
    widthClass: "w-[260px]",
    defaultVisible: true,
    locked: true,
  },
  plantModelName: {
    id: "plantModelName",
    label: "Заводская модель",
    description: "Название модели на заводе. Задаётся в карточке варианта.",
    kind: "info",
    infoField: "plantModelName",
    widthClass: "w-[180px]",
    defaultVisible: true,
  },
  plant: {
    id: "plant",
    label: "Завод",
    description: "Производственная площадка. Короткий код; полное название — при наведении.",
    kind: "info",
    infoField: "plant",
    widthClass: "w-[110px]",
    defaultVisible: true,
  },
  retailStatus: {
    id: "retailStatus",
    label: "Розничный статус",
    description:
      "Маркетинговый розничный статус региона. Редактируется у поставщика, у дилера только для чтения. Не влияет на попадание в прайс-лист.",
    kind: "retailStatus",
    widthClass: "w-[200px]",
    defaultVisible: true,
  },
  dimension: {
    id: "dimension",
    label: "Габариты",
    description: "Габариты упаковки (длина × ширина × высота, в метрах).",
    kind: "info",
    infoField: "dimension",
    widthClass: "w-[150px]",
    defaultVisible: true,
  },
  cbmPerUnit: {
    id: "cbmPerUnit",
    label: "м³ / шт",
    description: "Объём одной единицы в кубических метрах.",
    kind: "info",
    infoField: "cbmPerUnit",
    widthClass: "w-[110px]",
    defaultVisible: true,
  },
  capacityPerContainer: {
    id: "capacityPerContainer",
    label: "Вместимость контейнера",
    description: "Сколько единиц помещается в полный контейнер.",
    kind: "info",
    infoField: "capacityPerContainer",
    widthClass: "w-[170px]",
    defaultVisible: true,
  },
  purchase: {
    id: "purchase",
    label: "Заводская цена",
    description: "Базовая цена завода. Редактируйте в исходной валюте или в USD — значения остаются согласованными.",
    kind: "editable",
    field: "purchase",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  dealer: {
    id: "dealer",
    label: "Дилерская цена",
    description: "Цена для дилера. Редактируйте в исходной валюте или в USD — значения остаются согласованными.",
    kind: "editable",
    field: "dealer",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  dealerMarkup: {
    id: "dealerMarkup",
    label: "Глобальная наценка",
    description: "Наценка над заводской ценой, входящая в дилерскую цену.",
    kind: "markup",
    markup: "dealer",
    widthClass: "w-[120px]",
    defaultVisible: true,
  },
  retail: {
    id: "retail",
    label: "Розничная цена",
    description:
      "Рекомендованная цена для конечного покупателя. Редактируйте в исходной валюте или в USD — значения остаются согласованными.",
    kind: "editable",
    field: "retail",
    widthClass: "w-[300px]",
    defaultVisible: true,
  },
  retailMarkupNoExpenses: {
    id: "retailMarkupNoExpenses",
    label: "Наценка дилера без расходов",
    description: "Маржа дилера без расходов: наценка розничной цены над чистой дилерской ценой.",
    kind: "markup",
    markup: "retailNoExpenses",
    widthClass: "w-[140px]",
    defaultVisible: true,
  },
  retailMarkup: {
    id: "retailMarkup",
    label: "Наценка дилера с расходами",
    description: "Маржа дилера с расходами: наценка розничной цены над landed cost (дилерская цена + суммарные расходы).",
    kind: "markup",
    markup: "retail",
    afterParameters: true,
    widthClass: "w-[140px]",
    defaultVisible: true,
  },
  dealerStatus: {
    id: "dealerStatus",
    label: "Статус дилера",
    description: "Число регионов, где товар доступен.",
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
