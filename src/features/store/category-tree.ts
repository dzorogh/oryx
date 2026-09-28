const ALL_VALUE = "all";

export type CategoryTreeNode = {
  id: string;
  label: string;
  /** Меньшее значение — выше в списке (популярнее). */
  popularity: number;
  children?: CategoryTreeNode[];
};

// Группы и подкатегории отсортированы по популярности (сверху — самые востребованные).
export const STORE_CATEGORY_TREE: CategoryTreeNode[] = [
  {
    id: "atv",
    label: "Квадроциклы",
    popularity: 1,
    children: [
      { id: "atv-4x4", label: "4x4", popularity: 1 },
      { id: "atv-side-by-side", label: "Багги", popularity: 2 },
      { id: "atv-4x2", label: "4x2", popularity: 3 },
      { id: "atv-electric-motorcycles", label: "Электромотоциклы", popularity: 4 },
      { id: "atv-golf-cart", label: "Гольф-кар", popularity: 5 },
    ],
  },
  {
    id: "off-road-motorcycle",
    label: "Внедорожные мотоциклы",
    popularity: 2,
    children: [
      { id: "off-road-enduro", label: "Эндуро", popularity: 1 },
      { id: "off-road-pitbike", label: "Питбайк", popularity: 2 },
      { id: "off-road-snowmobile", label: "Снегоход", popularity: 3 },
    ],
  },
  {
    id: "road-motorcycles",
    label: "Дорожные мотоциклы",
    popularity: 3,
    children: [
      { id: "road-scooter", label: "Скутер", popularity: 1 },
      { id: "road-naked-bike", label: "Нейкед", popularity: 2 },
      { id: "road-street-bike", label: "Стрит", popularity: 3 },
      { id: "road-sport-travel", label: "Спорт-туризм", popularity: 4 },
      { id: "road-super-sport", label: "Суперспорт", popularity: 5 },
      { id: "road-touring-bike", label: "Туризм", popularity: 6 },
      { id: "road-enduro-travel", label: "Туристический эндуро", popularity: 7 },
      { id: "road-custom-bike", label: "Кастом", popularity: 8 },
      { id: "road-maxi-scooter", label: "Макси-скутер", popularity: 9 },
      { id: "road-mini-bike", label: "Минибайк", popularity: 10 },
      { id: "road-road-bike", label: "Дорожный", popularity: 11 },
      { id: "road-tricycle", label: "Трицикл", popularity: 12 },
    ],
  },
];

const sortByPopularity = <T extends { popularity: number }>(items: T[]): T[] =>
  [...items].sort((left, right) => left.popularity - right.popularity);

export const getSortedCategoryTree = (): CategoryTreeNode[] =>
  sortByPopularity(STORE_CATEGORY_TREE).map((group) => ({
    ...group,
    children: group.children ? sortByPopularity(group.children) : undefined,
  }));

type FlatCategoryNode = CategoryTreeNode & {
  parentId: string | null;
  depth: number;
};

const flattenTree = (nodes: CategoryTreeNode[], parentId: string | null = null, depth = 0): FlatCategoryNode[] =>
  nodes.flatMap((node) => {
    const current: FlatCategoryNode = { ...node, parentId, depth };
    if (!node.children?.length) {
      return [current];
    }
    return [current, ...flattenTree(sortByPopularity(node.children), node.id, depth + 1)];
  });

const FLAT_CATEGORY_NODES = flattenTree(getSortedCategoryTree());

const CATEGORY_NODE_BY_ID = new Map(FLAT_CATEGORY_NODES.map((node) => [node.id, node]));

const LEAF_IDS_BY_NODE_ID = new Map<string, string[]>();

const collectLeafIds = (node: CategoryTreeNode): string[] => {
  if (!node.children?.length) {
    return [node.id];
  }
  return sortByPopularity(node.children).flatMap(collectLeafIds);
};

for (const node of FLAT_CATEGORY_NODES) {
  LEAF_IDS_BY_NODE_ID.set(node.id, collectLeafIds(node));
}

export const getCategoryNodeLabel = (nodeId: string): string | null => CATEGORY_NODE_BY_ID.get(nodeId)?.label ?? null;

export const getCategoryFilterLabel = (filterValue: string, allLabel: string): string => {
  if (filterValue === ALL_VALUE) {
    return allLabel;
  }
  return getCategoryNodeLabel(filterValue) ?? allLabel;
};

export const itemMatchesCategoryFilter = (itemCategoryId: string, filterValue: string): boolean => {
  if (filterValue === ALL_VALUE) {
    return true;
  }
  const matchingLeafIds = LEAF_IDS_BY_NODE_ID.get(filterValue);
  if (!matchingLeafIds) {
    return itemCategoryId === filterValue;
  }
  return matchingLeafIds.includes(itemCategoryId);
};

/**
 * UI-дерево → коды `store_category.code` в демо-сиде.
 * Фильтр каталога режет по этим кодам через `store_product_category`, не по угадыванию из названия.
 */
export const CATALOG_TREE_LEAF_TO_CATEGORY_CODES: Readonly<Record<string, readonly string[]>> = {
  "atv-4x4": ["pim-37"],
  "atv-side-by-side": ["pim-18"],
  "atv-4x2": ["pim-25"],
  "atv-electric-motorcycles": ["pim-38", "pim-35"],
  "atv-golf-cart": ["pim-19"],
  "off-road-enduro": ["pim-3"],
  "off-road-pitbike": ["pim-4"],
  "off-road-snowmobile": ["pim-36"],
  "road-scooter": ["pim-7"],
  "road-naked-bike": ["pim-9"],
  "road-street-bike": ["pim-13"],
  "road-sport-travel": ["pim-14"],
  "road-super-sport": ["pim-10"],
  "road-touring-bike": ["pim-12"],
  "road-enduro-travel": ["pim-6"],
  "road-custom-bike": ["pim-15"],
  "road-maxi-scooter": ["pim-8"],
  "road-mini-bike": ["pim-17"],
  "road-road-bike": ["pim-11"],
  "road-tricycle": ["pim-16"],
};

const CATEGORY_CODE_TO_TREE_LEAF = new Map<string, string>();
for (const [treeId, codes] of Object.entries(CATALOG_TREE_LEAF_TO_CATEGORY_CODES)) {
  for (const code of codes) {
    if (!CATEGORY_CODE_TO_TREE_LEAF.has(code)) {
      CATEGORY_CODE_TO_TREE_LEAF.set(code, treeId);
    }
  }
}

/** Коды `store_category` для выбранного узла зашитого дерева (лист или группа). */
export const catalogCategoryCodesForFilter = (filterValue: string): string[] => {
  if (filterValue === ALL_VALUE) {
    return [];
  }
  const leafIds = LEAF_IDS_BY_NODE_ID.get(filterValue) ?? [filterValue];
  const codes = new Set<string>();
  for (const leafId of leafIds) {
    const mapped = CATALOG_TREE_LEAF_TO_CATEGORY_CODES[leafId];
    if (mapped) {
      for (const code of mapped) {
        codes.add(code);
      }
    }
  }
  return [...codes];
};

/** Узел дерева для отображения колонки Category по кодам из БД. */
export const catalogTreeIdForCategoryCodes = (codes: readonly string[]): string | null => {
  for (const code of codes) {
    const treeId = CATEGORY_CODE_TO_TREE_LEAF.get(code);
    if (treeId) {
      return treeId;
    }
  }
  return null;
};

export const getDefaultExpandedCategoryIds = (): string[] =>
  getSortedCategoryTree()
    .filter((node) => node.children?.length)
    .map((node) => node.id);
