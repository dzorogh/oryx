export type CategoryRef = {
  id: string;
  parentId: string | null;
  name: string;
};

export type CategoryProduct = {
  id: string;
  name: string;
  categoryIds: string[];
};

export type CategoryTreeNode<T extends CategoryProduct = CategoryProduct> = {
  id: string;
  name: string;
  depth: number;
  /** Direct product count shown under this group (not subtree). */
  productCount: number;
  products: T[];
  children: CategoryTreeNode<T>[];
};

const childrenOf = (categories: CategoryRef[], parentId: string | null) =>
  categories
    .filter((category) => category.parentId === parentId)
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id));

const byProductName = <T extends CategoryProduct>(a: T, b: T) => a.name.localeCompare(b.name, "ru");

const productsInCategory = <T extends CategoryProduct>(
  products: T[],
  categoryId: string,
  visibleIds: Set<string>,
) => products.filter((product) => visibleIds.has(product.id) && product.categoryIds.includes(categoryId));

const categoryHasVisible = <T extends CategoryProduct>(
  categories: CategoryRef[],
  products: T[],
  categoryId: string,
  visibleIds: Set<string>,
): boolean => {
  if (productsInCategory(products, categoryId, visibleIds).length > 0) return true;
  return childrenOf(categories, categoryId).some((child) =>
    categoryHasVisible(categories, products, child.id, visibleIds),
  );
};

const buildNode = <T extends CategoryProduct>(
  categories: CategoryRef[],
  products: T[],
  category: CategoryRef,
  visibleIds: Set<string>,
  depth: number,
  compareProducts: (a: T, b: T) => number,
): CategoryTreeNode<T> | null => {
  if (!categoryHasVisible(categories, products, category.id, visibleIds)) return null;
  const direct = productsInCategory(products, category.id, visibleIds).slice().sort(compareProducts);
  const children = childrenOf(categories, category.id)
    .map((child) => buildNode(categories, products, child, visibleIds, depth + 1, compareProducts))
    .filter((node): node is CategoryTreeNode<T> => node != null);
  return {
    id: category.id,
    name: category.name,
    depth,
    productCount: direct.length,
    products: direct,
    children,
  };
};

/** Ids of every subcategory under a group, depth-first, without the group itself. */
export const descendantCategoryIds = (node: CategoryTreeNode): string[] =>
  node.children.flatMap((child) => [child.id, ...descendantCategoryIds(child)]);

export const UNCATEGORIZED_GROUP_ID = "__uncategorized";

export const allCategoryGroupIds = (categories: { id: string }[]): string[] => [
  ...categories.map((category) => category.id),
  UNCATEGORIZED_GROUP_ID,
];

export const buildCategoryTree = <T extends CategoryProduct>(
  categories: CategoryRef[],
  products: T[],
  visibleProductIds: Set<string>,
  compareProducts: (a: T, b: T) => number = byProductName,
): { roots: CategoryTreeNode<T>[]; uncategorized: T[] } => {
  const roots = childrenOf(categories, null)
    .map((category) => buildNode(categories, products, category, visibleProductIds, 0, compareProducts))
    .filter((node): node is CategoryTreeNode<T> => node != null);
  const uncategorized = products
    .filter((product) => visibleProductIds.has(product.id) && product.categoryIds.length === 0)
    .slice()
    .sort(compareProducts);
  return { roots, uncategorized };
};

export const pluralTovar = (n: number): string => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} товар`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} товара`;
  return `${n} товаров`;
};

export const pluralPozicii = (n: number): string => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} позиция`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} позиции`;
  return `${n} позиций`;
};

/** Категории товара без предков: товар виден один раз, в самой глубокой. */
export const leafCategoryIds = (categoryIds: string[], categories: CategoryRef[]): string[] => {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const assigned = categoryIds.filter((id) => byId.has(id));
  const isAncestorOf = (ancestorId: string, categoryId: string): boolean => {
    let parentId = byId.get(categoryId)?.parentId ?? null;
    while (parentId) {
      if (parentId === ancestorId) return true;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return false;
  };
  return assigned.filter((id) => !assigned.some((other) => other !== id && isAncestorOf(id, other)));
};
