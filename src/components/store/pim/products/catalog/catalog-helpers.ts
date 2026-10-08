import {
  getParentProductIdFromVariantCatalogId,
  getProductDetailHref,
} from "../detail/product-detail-demo-data";
import type { StoreCatalogItem } from "@/features/store/domain/catalog-item";
import { getDisplayProductName } from "./catalog-display";
import {
  CATALOG_COLUMNS_STORAGE_KEY,
  VARIANTS_CATALOG_COLUMNS_STORAGE_KEY,
} from "./catalog-columns";

export const ALL_VALUE = "all";
export const CATALOG_LISTING_MODE_STORAGE_KEY = "store-catalog-listing-mode";
export const CATALOG_LISTING_QUERY_PARAM = "listing";
export { CATALOG_COLUMNS_STORAGE_KEY, VARIANTS_CATALOG_COLUMNS_STORAGE_KEY };

export type CatalogListingMode = "products" | "variants";

export const CATALOG_LISTING_MODES: CatalogListingMode[] = ["products", "variants"];

export const CATALOG_LISTING_MODE_LABELS: Record<CatalogListingMode, string> = {
  products: "Товары",
  variants: "Варианты",
};

export const CATALOG_LISTING_MODE_DESCRIPTIONS: Record<CatalogListingMode, string> = {
  products:
    "Базовые позиции с категорией, брендом и семейством. Не продаются — для информационных каталогов и презентаций.",
  variants:
    "Позиции с ценами и остатками, которые можно заказать. Площадка, характеристики и статусы каналов могут отличаться.",
};

export const STORE_CATALOG_PAGE = {
  breadcrumbLabel: "Товары",
  pageTitle: "Товары",
  storeLinkHref: "/store/pim/products",
} as const;

export const parseCatalogListingMode = (value: string | null | undefined): CatalogListingMode =>
  value === "variants" ? "variants" : "products";

export const getCatalogItemDetailHref = (item: StoreCatalogItem, listingMode: CatalogListingMode): string => {
  if (item.productId && !item.id.startsWith("bike-")) {
    return `/store/pim/products/${item.productId}?variant=${item.id}`;
  }
  const productId =
    listingMode === "variants" ? getParentProductIdFromVariantCatalogId(item.id) : item.id;
  return getProductDetailHref(productId);
};

export const getCatalogColumnsStorageKey = (listingMode: CatalogListingMode) =>
  listingMode === "products" ? CATALOG_COLUMNS_STORAGE_KEY : VARIANTS_CATALOG_COLUMNS_STORAGE_KEY;

export const getCatalogAddButtonAriaLabel = (listingMode: CatalogListingMode) =>
  listingMode === "products"
    ? "Добавить товар в каталог"
    : "Добавить вариант в каталог";

export const SKELETON_ROW_COUNT = 10;

export type QuickFilterOption = {
  value: string;
  label: string;
};

export const getSelectValue = (value: string | null) => value ?? ALL_VALUE;

export const extractSortedOptions = (items: StoreCatalogItem[], key: keyof StoreCatalogItem): string[] =>
  Array.from(new Set(items.map((item) => String(item[key])))).sort((left, right) => left.localeCompare(right));

export { getDisplayProductName } from "./catalog-display";

export const matchesSearchQuery = (item: StoreCatalogItem, query: string) => {
  if (!query) {
    return true;
  }

  return `${item.name} ${getDisplayProductName(item.name)} ${item.code}`.toLowerCase().includes(query);
};

export const formatCatalogUpdatedAt = (updatedAt: string) =>
  new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(updatedAt));

export {
  CATALOG_NO_SITE_LABEL,
  compareCatalogSiteKeys,
  groupCatalogItemsBySite,
  type CatalogSiteGroup,
} from "./catalog-site-groups";

export const buildPaginationItems = (currentPage: number, totalPages: number): Array<number | "ellipsis"> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages];
};