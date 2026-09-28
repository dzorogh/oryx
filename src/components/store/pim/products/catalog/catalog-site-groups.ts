import type { StoreCatalogItem } from "../store-catalog-demo-data";

/** Ключ группы без площадки — то же значение, что даёт `catalogProductionSite` при пустом plant. */
export const CATALOG_NO_SITE_KEY = "—";
export const CATALOG_NO_SITE_LABEL = "Без площадки";

export type CatalogSiteGroup = {
  siteKey: string;
  label: string;
  items: StoreCatalogItem[];
  /** Полное число строк группы в текущем фильтре (может быть больше `items.length`). */
  totalCount: number;
};

export type CatalogVirtualElement =
  | { kind: "header"; siteKey: string; label: string; totalCount: number }
  | { kind: "row"; siteKey: string; item: StoreCatalogItem };

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

/** Что рисует тело таблицы: при первой загрузке группы не показываются. */
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

const siteLabel = (siteKey: string): string =>
  siteKey === CATALOG_NO_SITE_KEY ? CATALOG_NO_SITE_LABEL : siteKey;

/**
 * Группирует загруженные строки по `productionSite`.
 * `groupTotals` — полные счётчики по фильтру; без ключа берётся число уже загруженных строк.
 */
export const groupCatalogItemsBySite = (
  items: StoreCatalogItem[],
  groupTotals?: ReadonlyMap<string, number> | Readonly<Record<string, number>>,
): CatalogSiteGroup[] => {
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

  const totalFor = (siteKey: string, loadedCount: number): number => {
    if (!groupTotals) {
      return loadedCount;
    }
    if (groupTotals instanceof Map) {
      return groupTotals.get(siteKey) ?? loadedCount;
    }
    const record = groupTotals as Readonly<Record<string, number>>;
    return record[siteKey] ?? loadedCount;
  };

  return Array.from(buckets.keys())
    .sort(compareCatalogSiteKeys)
    .map((siteKey) => {
      const groupItems = buckets.get(siteKey) ?? [];
      return {
        siteKey,
        label: siteLabel(siteKey),
        items: groupItems,
        totalCount: totalFor(siteKey, groupItems.length),
      };
    })
    .filter((group) => group.totalCount > 0 || group.items.length > 0);
};

/** Плоский список для виртуального скролла: свёрнутая группа — только заголовок. */
export const buildCatalogVirtualElements = (
  groups: ReadonlyArray<CatalogSiteGroup>,
  collapsed: ReadonlySet<string>,
): CatalogVirtualElement[] => {
  const elements: CatalogVirtualElement[] = [];
  for (const group of groups) {
    elements.push({
      kind: "header",
      siteKey: group.siteKey,
      label: group.label,
      totalCount: group.totalCount,
    });
    if (!areCatalogSiteGroupRowsVisible(collapsed, group.siteKey)) {
      continue;
    }
    for (const item of group.items) {
      elements.push({ kind: "row", siteKey: group.siteKey, item });
    }
  }
  return elements;
};

/** Дописывает порцию. При ошибке запроса возвращает уже показанные строки. */
export const mergeCatalogPageItems = <T>(
  current: readonly T[],
  next: { ok: true; items: readonly T[] } | { ok: false },
): T[] => {
  if (!next.ok) {
    return [...current];
  }
  return [...current, ...next.items];
};

/** Подпись площадки для sticky-полоски: последний заголовок на индексе ≤ `topIndex`. */
export const activeCatalogSiteLabel = (
  elements: ReadonlyArray<CatalogVirtualElement>,
  topIndex: number,
): string | null => {
  if (elements.length === 0 || topIndex < 0) {
    return null;
  }
  let active: string | null = null;
  const end = Math.min(topIndex, elements.length - 1);
  for (let index = 0; index <= end; index += 1) {
    const element = elements[index];
    if (element?.kind === "header") {
      active = element.label;
    }
  }
  return active;
};
