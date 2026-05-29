import type { DealerStatus, RetailStatus, StoreCatalogItem } from "../store-catalog-demo-data";

export const ALL_VALUE = "all";
export const PAGE_SIZE = 48;
export const CATALOG_VIEW_MODE_STORAGE_KEY = "store-catalog-view-mode";
export const VARIANTS_CATALOG_VIEW_MODE_STORAGE_KEY = "store-variants-catalog-view-mode";

export type CatalogListingMode = "products" | "variants";

export type StoreCatalogPageConfig = {
  breadcrumbLabel: string;
  pageTitle: string;
  pageDescription: string;
  addButtonAriaLabel: string;
  viewModeStorageKey: string;
  storeLinkHref: string;
  listingMode: CatalogListingMode;
};

export const STORE_PRODUCTS_CATALOG_CONFIG: StoreCatalogPageConfig = {
  breadcrumbLabel: "Products",
  pageTitle: "Products",
  pageDescription: "Manage assortment, pricing, and dealer and retail channel statuses.",
  addButtonAriaLabel: "Add a new product to the catalog",
  viewModeStorageKey: CATALOG_VIEW_MODE_STORAGE_KEY,
  storeLinkHref: "/store/pim/products",
  listingMode: "products",
};

export const STORE_VARIANTS_CATALOG_CONFIG: StoreCatalogPageConfig = {
  breadcrumbLabel: "Product Variants",
  pageTitle: "Product Variants",
  pageDescription: "Manage product variants: modifications, configurations, and options.",
  addButtonAriaLabel: "Add a new variant to the catalog",
  viewModeStorageKey: VARIANTS_CATALOG_VIEW_MODE_STORAGE_KEY,
  storeLinkHref: "/store/pim/product-variants",
  listingMode: "variants",
};

export const SKELETON_ROW_COUNT = 10;
export const SKELETON_CARD_COUNT = 12;

export type CatalogViewMode = "table" | "cards";

export type QuickFilterOption = {
  value: string;
  label: string;
};

export const formatPrice = (price: number) =>
  `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(price)} USD`;

export const formatCatalogPrice = (price: number | null, { from = false }: { from?: boolean } = {}) => {
  if (price === null) {
    return "—";
  }
  const formatted = formatPrice(price);
  return from ? `from ${formatted}` : formatted;
};

export const getSelectValue = (value: string | null) => value ?? ALL_VALUE;

export const extractSortedOptions = (items: StoreCatalogItem[], key: keyof StoreCatalogItem): string[] =>
  Array.from(new Set(items.map((item) => String(item[key])))).sort((left, right) => left.localeCompare(right));

export const getDisplayProductName = (name: string) => name.replace(/^Oryx\s+/u, "").trim();

export const isPurchasable = (dealerStatus: DealerStatus) => dealerStatus === "Available for purchase";

type PurchasableCatalogItem = Pick<StoreCatalogItem, "dealerStatus" | "dealerPrice">;

export const getPurchaseBlockReason = (item: PurchasableCatalogItem): string | null => {
  if (item.dealerStatus === "Hidden") {
    return "This product is hidden and cannot be ordered.";
  }

  if (item.dealerStatus === "Unavailable for purchase") {
    return "This product is temporarily unavailable for purchase.";
  }

  if (item.dealerPrice === null) {
    return "No dealer price is set for this product.";
  }

  return null;
};

export const matchesSearchQuery = (item: StoreCatalogItem, query: string) => {
  if (!query) {
    return true;
  }

  return `${item.name} ${getDisplayProductName(item.name)} ${item.sku}`.toLowerCase().includes(query);
};

export const statusBadgeClassMap: Record<DealerStatus | RetailStatus, string> = {
  Hidden: "bg-zinc-100 text-zinc-700",
  "Available for purchase": "bg-emerald-100 text-emerald-700",
  "Unavailable for purchase": "bg-rose-100 text-rose-700",
  "Available for sale": "bg-sky-100 text-sky-700",
  "Made to order": "bg-amber-100 text-amber-700",
  "Awaiting delivery": "bg-indigo-100 text-indigo-700",
  Archived: "bg-zinc-100 text-zinc-700",
};

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
