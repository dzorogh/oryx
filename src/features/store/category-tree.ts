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
    label: "ATV",
    popularity: 1,
    children: [
      { id: "atv-4x4", label: "4x4", popularity: 1 },
      { id: "atv-side-by-side", label: "Side-by-Side", popularity: 2 },
      { id: "atv-4x2", label: "4x2", popularity: 3 },
      { id: "atv-electric-motorcycles", label: "Electric Motorcycles", popularity: 4 },
      { id: "atv-golf-cart", label: "Golf Cart", popularity: 5 },
    ],
  },
  {
    id: "off-road-motorcycle",
    label: "Off Road Motorcycle",
    popularity: 2,
    children: [
      { id: "off-road-enduro", label: "Enduro", popularity: 1 },
      { id: "off-road-pitbike", label: "Pitbike", popularity: 2 },
      { id: "off-road-snowmobile", label: "Snowmobile", popularity: 3 },
    ],
  },
  {
    id: "road-motorcycles",
    label: "Road Motorcycles",
    popularity: 3,
    children: [
      { id: "road-scooter", label: "Scooter", popularity: 1 },
      { id: "road-naked-bike", label: "Naked Bike", popularity: 2 },
      { id: "road-street-bike", label: "Street Bike", popularity: 3 },
      { id: "road-sport-travel", label: "Sport Travel", popularity: 4 },
      { id: "road-super-sport", label: "Super Sport", popularity: 5 },
      { id: "road-touring-bike", label: "Touring Bike", popularity: 6 },
      { id: "road-enduro-travel", label: "Enduro Travel", popularity: 7 },
      { id: "road-custom-bike", label: "Custom Bike", popularity: 8 },
      { id: "road-maxi-scooter", label: "Maxi Scooter", popularity: 9 },
      { id: "road-mini-bike", label: "Mini Bike", popularity: 10 },
      { id: "road-road-bike", label: "Road Bike", popularity: 11 },
      { id: "road-tricycle", label: "Tricycle", popularity: 12 },
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

export const getDefaultExpandedCategoryIds = (): string[] =>
  getSortedCategoryTree()
    .filter((node) => node.children?.length)
    .map((node) => node.id);
