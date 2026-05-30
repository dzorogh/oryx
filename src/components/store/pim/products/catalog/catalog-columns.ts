export const CATALOG_COLUMNS_STORAGE_KEY = "store-catalog-visible-columns";
export const VARIANTS_CATALOG_COLUMNS_STORAGE_KEY = "store-variants-catalog-visible-columns";

export type CatalogColumnId =
  | "name"
  | "sku"
  | "brand"
  | "category"
  | "family"
  | "site"
  | "stock"
  | "updatedAt"
  | "dealer"
  | "retail";

export type CatalogColumnDefinition = {
  id: CatalogColumnId;
  label: string;
  defaultVisible: boolean;
  locked?: boolean;
  widthClass: string;
};

export const CATALOG_COLUMNS: CatalogColumnDefinition[] = [
  { id: "name", label: "Name", defaultVisible: true, locked: true, widthClass: "w-[220px]" },
  { id: "sku", label: "SKU", defaultVisible: false, widthClass: "w-[110px]" },
  { id: "brand", label: "Brand", defaultVisible: true, widthClass: "w-[110px]" },
  { id: "category", label: "Category", defaultVisible: true, widthClass: "w-[130px]" },
  { id: "family", label: "Family", defaultVisible: false, widthClass: "w-[120px]" },
  { id: "site", label: "Site", defaultVisible: true, widthClass: "w-[110px]" },
  { id: "stock", label: "Stock", defaultVisible: false, widthClass: "w-[90px]" },
  { id: "updatedAt", label: "Last updated", defaultVisible: false, widthClass: "w-[130px]" },
  { id: "dealer", label: "Dealer", defaultVisible: true, widthClass: "w-[290px]" },
  { id: "retail", label: "Retail", defaultVisible: true, widthClass: "w-[260px]" },
];

export const ALL_COLUMN_IDS = CATALOG_COLUMNS.map((column) => column.id);

export const DEFAULT_VISIBLE_COLUMNS = CATALOG_COLUMNS.filter((column) => column.defaultVisible).map(
  (column) => column.id,
);

const COLUMN_ID_SET = new Set<CatalogColumnId>(ALL_COLUMN_IDS);

const isCatalogColumnId = (value: string): value is CatalogColumnId => COLUMN_ID_SET.has(value as CatalogColumnId);

export const getOrderedVisibleColumns = (visibleIds: Iterable<CatalogColumnId>): CatalogColumnId[] => {
  const visibleSet = new Set(visibleIds);

  return CATALOG_COLUMNS.filter((column) => visibleSet.has(column.id)).map((column) => column.id);
};

export const parseStoredColumns = (raw: string | null): CatalogColumnId[] | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const validIds = parsed.filter((value): value is CatalogColumnId => typeof value === "string" && isCatalogColumnId(value));
    if (!validIds.includes("name")) {
      validIds.unshift("name");
    }

    return getOrderedVisibleColumns(validIds);
  } catch {
    return null;
  }
};

export const serializeVisibleColumns = (visibleIds: CatalogColumnId[]) => JSON.stringify(getOrderedVisibleColumns(visibleIds));

export const isDefaultColumnSet = (visibleIds: CatalogColumnId[]) => {
  if (visibleIds.length !== DEFAULT_VISIBLE_COLUMNS.length) {
    return false;
  }

  return DEFAULT_VISIBLE_COLUMNS.every((columnId, index) => visibleIds[index] === columnId);
};

export const getCatalogColumnDefinition = (columnId: CatalogColumnId) =>
  CATALOG_COLUMNS.find((column) => column.id === columnId);
