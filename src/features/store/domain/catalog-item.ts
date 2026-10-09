import type { StaticImageData } from "next/image";
import type { CurrencyCode } from "@/features/store/domain/currency";
import type { DealerStatus, RetailStatus } from "@/features/store/domain/statuses";

export const CATALOG_PAGE_SIZE = 48;

/** Ключ группы без площадки — то же значение, что даёт `catalogProductionSite` при пустом plant. */
export const CATALOG_NO_SITE_KEY = "—";

export type CatalogRegionPrice = {
  amount: number;
  currency: CurrencyCode;
};

export type CatalogRegionPrices = {
  dealer: CatalogRegionPrice | null;
  retail: CatalogRegionPrice | null;
};

export type CatalogRegionStatuses = {
  dealer: DealerStatus;
  retail: RetailStatus;
};

export type StoreCatalogItem = {
  id: string;
  /** Parent store_product.id. */
  productId: string;
  name: string;
  code: string;
  imageSrc: StaticImageData | string;
  imageAlt: string;
  categoryId: string;
  category: string;
  family: string;
  brand: string | null;
  stock: number;
  updatedAt: string | null;
  dealerPrice: number | null;
  retailPrice: number | null;
  dealerCurrency?: CurrencyCode | null;
  retailCurrency?: CurrencyCode | null;
  dealerStatus: DealerStatus;
  retailStatus: RetailStatus;
  productionSite: string;
  /** Prices keyed by region code; used when a region is selected. */
  regionPrices?: Record<string, CatalogRegionPrices>;
  /** Statuses keyed by region code. */
  regionStatuses?: Record<string, CatalogRegionStatuses>;
};
