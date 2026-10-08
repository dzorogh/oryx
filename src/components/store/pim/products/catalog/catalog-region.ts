import type { StoreCatalogItem } from "@/features/store/domain/catalog-item";

/** Catalog row with prices and statuses of one region; no region means no prices. */
export const resolveCatalogItemForRegion = (
  item: StoreCatalogItem,
  regionCode: string | null,
): StoreCatalogItem => {
  if (!regionCode) {
    return {
      ...item,
      dealerPrice: null,
      retailPrice: null,
      dealerCurrency: null,
      retailCurrency: null,
    };
  }
  const prices = item.regionPrices?.[regionCode];
  const statuses = item.regionStatuses?.[regionCode];
  return {
    ...item,
    dealerPrice: prices?.dealer?.amount ?? null,
    retailPrice: prices?.retail?.amount ?? null,
    dealerCurrency: prices?.dealer?.currency ?? null,
    retailCurrency: prices?.retail?.currency ?? null,
    dealerStatus: statuses?.dealer ?? item.dealerStatus,
    retailStatus: statuses?.retail ?? item.retailStatus,
  };
};
