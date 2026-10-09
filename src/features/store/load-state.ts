export type StoreLoadStatus = "loading" | "ready" | "error" | "unconfigured";

export type CatalogListFilters = {
  search: string;
  category?: string;
  familyId?: string;
  site?: string;
  dealerStatus?: string;
  retailStatus?: string;
  regionCode: string | null;
};

const withoutAll = (value: string, allValue: string): string | undefined =>
  value === allValue ? undefined : value;

/** Status filters belong to a region. Without one they are omitted, not sent as a silent no-op. */
export const buildCatalogQueryFilters = (input: {
  search: string;
  category: string;
  family: string;
  site: string;
  dealerStatus: string;
  retailStatus: string;
  regionCode: string | null;
  allValue: string;
}): CatalogListFilters => {
  const filters: CatalogListFilters = {
    search: input.search,
    regionCode: input.regionCode,
  };
  const category = withoutAll(input.category, input.allValue);
  const familyId = withoutAll(input.family, input.allValue);
  const site = withoutAll(input.site, input.allValue);
  if (category) {
    filters.category = category;
  }
  if (familyId) {
    filters.familyId = familyId;
  }
  if (site) {
    filters.site = site;
  }
  if (!input.regionCode) {
    return filters;
  }
  const dealerStatus = withoutAll(input.dealerStatus, input.allValue);
  const retailStatus = withoutAll(input.retailStatus, input.allValue);
  if (dealerStatus) {
    filters.dealerStatus = dealerStatus;
  }
  if (retailStatus) {
    filters.retailStatus = retailStatus;
  }
  return filters;
};

export const resolveCatalogFirstPage = <T>(
  page: T | null,
): { status: "unconfigured" } | { status: "ready"; page: T } =>
  page == null ? { status: "unconfigured" } : { status: "ready", page };

export type LoadMoreResolution<T extends { items: readonly unknown[]; hasMore: boolean }> =
  | { ok: false; hasMore: true }
  | { ok: true; hasMore: boolean; page: T };

/** `null` (backend unset) or a thrown page keeps `hasMore`, so the same offset can be requested again. */
export const resolveCatalogLoadMore = <T extends { items: readonly unknown[]; hasMore: boolean }>(
  page: T | null,
): LoadMoreResolution<T> => {
  if (page == null) {
    return { ok: false, hasMore: true };
  }
  if (page.items.length === 0) {
    return { ok: true, hasMore: false, page };
  }
  return { ok: true, hasMore: page.hasMore, page };
};
