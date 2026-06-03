import {
  getParentProductIdFromVariantCatalogId,
  getProductDetailHref,
  getVariantCatalogItems,
} from "../detail/product-detail-demo-data";
import { STORE_CATALOG_ITEMS, type DealerStatus, RetailStatus, type StoreCatalogItem } from "../store-catalog-demo-data";
import { getDisplayProductName } from "./catalog-display";
import {
  CATALOG_COLUMNS_STORAGE_KEY,
  VARIANTS_CATALOG_COLUMNS_STORAGE_KEY,
} from "./catalog-columns";

export const ALL_VALUE = "all";
export const PAGE_SIZE = 48;
export const CATALOG_LISTING_MODE_STORAGE_KEY = "store-catalog-listing-mode";
export const CATALOG_LISTING_QUERY_PARAM = "listing";
export { CATALOG_COLUMNS_STORAGE_KEY, VARIANTS_CATALOG_COLUMNS_STORAGE_KEY };

export type CatalogListingMode = "products" | "variants";

export const CATALOG_LISTING_MODES: CatalogListingMode[] = ["products", "variants"];

export const CATALOG_LISTING_MODE_LABELS: Record<CatalogListingMode, string> = {
  products: "Products",
  variants: "Variants",
};

export const CATALOG_LISTING_MODE_DESCRIPTIONS: Record<CatalogListingMode, string> = {
  products:
    "Base items linked to category, brand, and family. Not purchasable — for info catalogs and presentations.",
  variants:
    "Purchasable items with prices and stock. Site, specs, and channel status may differ between variants.",
};

export const STORE_CATALOG_PAGE = {
  breadcrumbLabel: "Products",
  pageTitle: "Products",
  pageDescription: "Manage assortment, pricing, and dealer and retail channel statuses.",
  storeLinkHref: "/store/pim/products",
} as const;

export const parseCatalogListingMode = (value: string | null | undefined): CatalogListingMode =>
  value === "variants" ? "variants" : "products";

export const getCatalogSourceItems = (listingMode: CatalogListingMode): StoreCatalogItem[] =>
  listingMode === "variants" ? getVariantCatalogItems() : STORE_CATALOG_ITEMS;

export const getCatalogItemDetailHref = (itemId: string, listingMode: CatalogListingMode): string => {
  const productId =
    listingMode === "variants" ? getParentProductIdFromVariantCatalogId(itemId) : itemId;
  return getProductDetailHref(productId);
};

export const getCatalogColumnsStorageKey = (listingMode: CatalogListingMode) =>
  listingMode === "products" ? CATALOG_COLUMNS_STORAGE_KEY : VARIANTS_CATALOG_COLUMNS_STORAGE_KEY;

export const getCatalogAddButtonAriaLabel = (listingMode: CatalogListingMode) =>
  listingMode === "products"
    ? "Add a new product to the catalog"
    : "Add a new variant to the catalog";

export const SKELETON_ROW_COUNT = 10;

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

export { getDisplayProductName } from "./catalog-display";

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

export const formatCatalogUpdatedAt = (updatedAt: string) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(updatedAt));

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
