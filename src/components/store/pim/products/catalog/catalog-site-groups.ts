import type { StoreCatalogItem } from "../store-catalog-demo-data";

/** Ключ группы без площадки — то же значение, что даёт `catalogProductionSite` при пустом plant. */
export const CATALOG_NO_SITE_KEY = "—";
export const CATALOG_NO_SITE_LABEL = "Без площадки";

export type CatalogSiteGroup = {
  siteKey: string;
  label: string;
  items: StoreCatalogItem[];
};

export const compareCatalogSiteKeys = (left: string, right: string): number => {
  if (left === CATALOG_NO_SITE_KEY && right === CATALOG_NO_SITE_KEY) {
    return 0;
  }
  if (left === CATALOG_NO_SITE_KEY) {
    return 1;
  }
  if (right === CATALOG_NO_SITE_KEY) {
    return -1;
  }
  return left.localeCompare(right, undefined, { numeric: true });
};

/** Что рисует тело таблицы: при загрузке группы не показываются. */
export const catalogTableSection = (
  isLoading: boolean,
  groupCount: number,
): "skeletons" | "empty" | "groups" => {
  if (isLoading) {
    return "skeletons";
  }
  if (groupCount === 0) {
    return "empty";
  }
  return "groups";
};

/** Переключает свёртку одной площадки. */
export const toggleCatalogSiteCollapsed = (
  collapsed: ReadonlySet<string>,
  siteKey: string,
): Set<string> => {
  const next = new Set(collapsed);
  if (next.has(siteKey)) {
    next.delete(siteKey);
  } else {
    next.add(siteKey);
  }
  return next;
};

/** Ключи всех текущих групп — для «Свернуть все». */
export const catalogSiteKeysForCollapseAll = (
  groups: ReadonlyArray<Pick<CatalogSiteGroup, "siteKey">>,
): string[] => groups.map((group) => group.siteKey);

/** Видны ли строки группы (не свёрнута). */
export const areCatalogSiteGroupRowsVisible = (
  collapsed: ReadonlySet<string>,
  siteKey: string,
): boolean => !collapsed.has(siteKey);

/** Группирует отфильтрованные строки по `productionSite`. Порядок внутри группы — как во входе. */
export const groupCatalogItemsBySite = (items: StoreCatalogItem[]): CatalogSiteGroup[] => {
  const buckets = new Map<string, StoreCatalogItem[]>();

  for (const item of items) {
    const siteKey = item.productionSite || CATALOG_NO_SITE_KEY;
    const bucket = buckets.get(siteKey);
    if (bucket) {
      bucket.push(item);
    } else {
      buckets.set(siteKey, [item]);
    }
  }

  return Array.from(buckets.keys())
    .sort(compareCatalogSiteKeys)
    .map((siteKey) => ({
      siteKey,
      label: siteKey === CATALOG_NO_SITE_KEY ? CATALOG_NO_SITE_LABEL : siteKey,
      items: buckets.get(siteKey) ?? [],
    }));
};
