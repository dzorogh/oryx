import {
  getParentProductIdFromVariantCatalogId,
  getProductDetailHref,
} from "../detail/product-detail-demo-data";
import type { DealerStatus, RetailStatus, StoreCatalogItem } from "../store-catalog-demo-data";
import { getDisplayProductName } from "./catalog-display";
import {
  CATALOG_COLUMNS_STORAGE_KEY,
  VARIANTS_CATALOG_COLUMNS_STORAGE_KEY,
} from "./catalog-columns";
import {
  DEALER_STATUS_LABELS,
  RETAIL_STATUS_LABELS,
  type CurrencyCode,
  type DealerStatus as PricelistDealerStatus,
  type RetailStatus as PricelistRetailStatus,
} from "../../pricelists/pricelists-helpers";

export const ALL_VALUE = "all";
export const PAGE_SIZE = 48;
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

export const formatPrice = (price: number, currency: CurrencyCode | string = "USD") =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(price)} ${currency}`;

export const formatCatalogPrice = (
  price: number | null,
  {
    from = false,
    currency = "USD",
  }: { from?: boolean; currency?: CurrencyCode | string | null } = {},
) => {
  if (price === null) {
    return "—";
  }
  const formatted = formatPrice(price, currency ?? "USD");
  return from ? `от ${formatted}` : formatted;
};

export const getSelectValue = (value: string | null) => value ?? ALL_VALUE;

export const extractSortedOptions = (items: StoreCatalogItem[], key: keyof StoreCatalogItem): string[] =>
  Array.from(new Set(items.map((item) => String(item[key])))).sort((left, right) => left.localeCompare(right));

export { getDisplayProductName } from "./catalog-display";

export const isPurchasable = (dealerStatus: DealerStatus) => dealerStatus === "available";

type PurchasableCatalogItem = Pick<StoreCatalogItem, "dealerStatus" | "dealerPrice">;

export const getPurchaseBlockReason = (item: PurchasableCatalogItem): string | null => {
  if (item.dealerStatus === "unavailable") {
    return "Товар временно недоступен для заказа.";
  }

  if (item.dealerPrice === null) {
    return "Для товара не задана дилерская цена.";
  }

  return null;
};

export const matchesSearchQuery = (item: StoreCatalogItem, query: string) => {
  if (!query) {
    return true;
  }

  return `${item.name} ${getDisplayProductName(item.name)} ${item.code}`.toLowerCase().includes(query);
};

export const CATALOG_DEALER_STATUS_LABELS: Record<DealerStatus, string> = DEALER_STATUS_LABELS;

export const CATALOG_RETAIL_STATUS_LABELS: Record<RetailStatus, string> = RETAIL_STATUS_LABELS;

export const formatCatalogStatus = (status: DealerStatus | RetailStatus): string =>
  CATALOG_DEALER_STATUS_LABELS[status as PricelistDealerStatus] ??
  CATALOG_RETAIL_STATUS_LABELS[status as PricelistRetailStatus] ??
  status;

export const statusBadgeClassMap: Record<DealerStatus | RetailStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  unavailable: "bg-rose-100 text-rose-700",
  draft: "bg-zinc-100 text-zinc-700",
  preorder: "bg-amber-100 text-amber-700",
  temporarily_unavailable: "bg-indigo-100 text-indigo-700",
  discontinued: "bg-orange-100 text-orange-800",
  banned: "bg-rose-100 text-rose-800",
  hidden: "bg-zinc-100 text-zinc-700",
  pending_approval: "bg-sky-100 text-sky-700",
  archived: "bg-zinc-100 text-zinc-700",
};

export const formatCatalogUpdatedAt = (updatedAt: string) =>
  new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(updatedAt));

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