import { formatLogisticsCode } from "@/features/logistics/logistics-codes";

export type OutputCalendarCategory = {
  id: string;
  parentId: string | null;
  name: string;
};

export type OutputCalendarProduct = {
  id: string;
  name: string;
  unit: string;
  plantId: string | null;
  categoryIds: string[];
};

export type OutputCalendarRegion = {
  id: string;
  name: string;
  ownerId: string;
};

export type OutputCalendarCustomerOrder = {
  id: string;
  number: string;
  regionId: string;
  ownerId: string;
  sequenceNumber: string;
};

export type OutputCalendarStockRow = {
  productId: string;
  ownerId: string;
  locationKind: "warehouse" | "transfer";
  /** Warehouse id or transfer document id. */
  locationId: string;
  /** Transfer sequence number; null for warehouses. */
  locationSequence: string | null;
  quantity: number;
};

export type OutputCalendarOutputLine = {
  outputId: string;
  outputNumber: string;
  /** Null for a locally created output until the page is refreshed. */
  outputSequence: string | null;
  status: "draft" | "in_progress";
  expectedEndOn: string | null;
  productionOrderId: string;
  productionOrderNumber: string;
  productionOrderSequence: string | null;
  plantId: string;
  productId: string;
  ownerId: string;
  quantity: number;
  /** Locally created this session — bypasses owner/plant filters until refresh. */
  isNew?: boolean;
};

export type OutputCalendarOpenOrder = {
  productionOrderId: string;
  number: string;
  sequenceNumber: string;
  plantId: string;
  productId: string;
  remaining: number;
};

export type OutputCalendarPage = {
  freeOwnerId: string;
  categories: OutputCalendarCategory[];
  products: OutputCalendarProduct[];
  plants: Array<{ id: string }>;
  regions: OutputCalendarRegion[];
  customerOrders: OutputCalendarCustomerOrder[];
  stock: OutputCalendarStockRow[];
  outputLines: OutputCalendarOutputLine[];
  openOrders: OutputCalendarOpenOrder[];
};

export type OutputCalendarOwnerFilter = {
  free: boolean;
  regionIds: string[];
  withRegionOrders: boolean;
  orderIds: string[];
};

export type YearMonth = { year: number; month: number };

const MONTH_RU = ["", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

const asId = (value: unknown): string => String(value ?? "");

const asNullableId = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  return String(value);
};

const asNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const isOpenOutputStatus = (value: unknown): value is "draft" | "in_progress" =>
  value === "draft" || value === "in_progress";

export const mapOutputCalendarPage = (raw: unknown): OutputCalendarPage => {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (key: string): unknown[] => (Array.isArray(row[key]) ? (row[key] as unknown[]) : []);

  return {
    freeOwnerId: asId(row.freeOwnerId),
    categories: list("categories").map((item) => {
      const c = item as Record<string, unknown>;
      return {
        id: asId(c.id),
        parentId: asNullableId(c.parentId),
        name: String(c.name ?? ""),
      };
    }),
    products: list("products").map((item) => {
      const p = item as Record<string, unknown>;
      const cats = Array.isArray(p.categoryIds) ? p.categoryIds : [];
      return {
        id: asId(p.id),
        name: String(p.name ?? ""),
        unit: String(p.unit ?? "шт"),
        plantId: asNullableId(p.plantId),
        categoryIds: cats.map(asId),
      };
    }),
    plants: list("plants").map((item) => {
      if (item && typeof item === "object" && "id" in (item as object)) {
        return { id: asId((item as { id: unknown }).id) };
      }
      return { id: asId(item) };
    }),
    regions: list("regions").map((item) => {
      const r = item as Record<string, unknown>;
      return {
        id: asId(r.id),
        name: String(r.name ?? ""),
        ownerId: asId(r.ownerId),
      };
    }),
    customerOrders: list("customerOrders").map((item) => {
      const o = item as Record<string, unknown>;
      return {
        id: asId(o.id),
        number: String(o.number ?? ""),
        regionId: asId(o.regionId),
        ownerId: asId(o.ownerId),
        sequenceNumber: asId(o.sequenceNumber),
      };
    }),
    stock: list("stock").map((item) => {
      const s = item as Record<string, unknown>;
      return {
        productId: asId(s.productId),
        ownerId: asId(s.ownerId),
        locationKind: s.locationKind === "transfer" ? ("transfer" as const) : ("warehouse" as const),
        locationId: asId(s.locationId),
        locationSequence: asNullableId(s.locationSequence),
        quantity: asNumber(s.quantity),
      };
    }),
    outputLines: list("outputLines").flatMap((item) => {
      const l = item as Record<string, unknown>;
      if (!isOpenOutputStatus(l.status)) return [];
      return [
        {
          outputId: asId(l.outputId),
          outputNumber: String(l.outputNumber ?? ""),
          outputSequence: asNullableId(l.outputSequence),
          status: l.status,
          expectedEndOn:
            l.expectedEndOn == null || l.expectedEndOn === "" ? null : String(l.expectedEndOn).slice(0, 10),
          productionOrderId: asId(l.productionOrderId),
          productionOrderNumber: String(l.productionOrderNumber ?? ""),
          productionOrderSequence: asNullableId(l.productionOrderSequence),
          plantId: asId(l.plantId),
          productId: asId(l.productId),
          ownerId: asId(l.ownerId),
          quantity: asNumber(l.quantity),
          isNew: Boolean(l.isNew),
        },
      ];
    }),
    openOrders: list("openOrders").map((item) => {
      const o = item as Record<string, unknown>;
      return {
        productionOrderId: asId(o.productionOrderId),
        number: String(o.number ?? ""),
        sequenceNumber: asId(o.sequenceNumber),
        plantId: asId(o.plantId),
        productId: asId(o.productId),
        remaining: asNumber(o.remaining),
      };
    }),
  };
};

export const defaultOwnerFilter = (page: OutputCalendarPage): OutputCalendarOwnerFilter => ({
  free: true,
  regionIds: page.regions.map((r) => r.id),
  withRegionOrders: true,
  orderIds: page.customerOrders.map((o) => o.id),
});

/** Owner set W from filter state. */
export const buildOwnerSet = (
  filter: OutputCalendarOwnerFilter,
  page: Pick<OutputCalendarPage, "freeOwnerId" | "regions" | "customerOrders">,
): Set<string> => {
  const W = new Set<string>();
  if (filter.free) {
    W.add(page.freeOwnerId);
  }
  const regionById = new Map(page.regions.map((r) => [r.id, r]));
  for (const regionId of filter.regionIds) {
    const region = regionById.get(regionId);
    if (region) W.add(region.ownerId);
  }
  if (filter.withRegionOrders) {
    for (const order of page.customerOrders) {
      if (filter.regionIds.includes(order.regionId)) {
        W.add(order.ownerId);
      }
    }
  }
  const orderById = new Map(page.customerOrders.map((o) => [o.id, o]));
  for (const orderId of filter.orderIds) {
    const order = orderById.get(orderId);
    if (order) W.add(order.ownerId);
  }
  return W;
};

export const stockQuantity = (
  productId: string,
  stock: OutputCalendarStockRow[],
  ownerSet: Set<string>,
): number => {
  let sum = 0;
  for (const row of stock) {
    if (row.productId !== productId) continue;
    if (!ownerSet.has(row.ownerId)) continue;
    sum += row.quantity;
  }
  return sum;
};

export type CalendarOwner =
  | { kind: "free" }
  | { kind: "region"; region: OutputCalendarRegion }
  | { kind: "order"; order: OutputCalendarCustomerOrder }
  | { kind: "unknown" };

export const resolveOwner = (
  ownerId: string,
  page: Pick<OutputCalendarPage, "freeOwnerId" | "regions" | "customerOrders">,
): CalendarOwner => {
  if (ownerId === page.freeOwnerId) return { kind: "free" };
  const region = page.regions.find((r) => r.ownerId === ownerId);
  if (region) return { kind: "region", region };
  const order = page.customerOrders.find((o) => o.ownerId === ownerId);
  if (order) return { kind: "order", order };
  return { kind: "unknown" };
};

export type StockBreakdownRow = OutputCalendarStockRow & { owner: CalendarOwner };

/** Stock rows behind the «Остаток» cell, largest first. */
export const stockBreakdown = (
  productId: string,
  page: Pick<OutputCalendarPage, "stock" | "freeOwnerId" | "regions" | "customerOrders">,
  ownerSet: Set<string>,
): StockBreakdownRow[] =>
  page.stock
    .filter((row) => row.productId === productId && ownerSet.has(row.ownerId))
    .map((row) => ({ ...row, owner: resolveOwner(row.ownerId, page) }))
    .sort((a, b) => b.quantity - a.quantity);

export const yearMonthOf = (iso: string | null | undefined): YearMonth | null => {
  if (!iso) return null;
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return null;
  return { year: y, month: m };
};

export const ymKey = (ym: YearMonth): number => ym.year * 12 + ym.month;

export const parseYmKey = (key: number): YearMonth => ({
  year: Math.floor((key - 1) / 12),
  month: ((key - 1) % 12) + 1,
});

export const currentYearMonth = (today: Date = new Date()): YearMonth => ({
  year: today.getFullYear(),
  month: today.getMonth() + 1,
});

export const formatYearMonthLabel = (ym: YearMonth): string => `${MONTH_RU[ym.month]} ${ym.year}`;

export const lastDayOfMonthIso = (ym: YearMonth): string => {
  const day = new Date(ym.year, ym.month, 0).getDate();
  return `${ym.year}-${String(ym.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

export const computeMonthRange = (
  lines: Array<Pick<OutputCalendarOutputLine, "expectedEndOn" | "status">>,
  today: Date = new Date(),
): YearMonth[] => {
  const cur = currentYearMonth(today);
  const curKey = ymKey(cur);
  let earliestOverdue: number | null = null;
  let latest = curKey;
  for (const line of lines) {
    if (line.status !== "draft" && line.status !== "in_progress") continue;
    const ym = yearMonthOf(line.expectedEndOn);
    if (!ym) continue;
    const key = ymKey(ym);
    if (key < curKey) {
      if (earliestOverdue === null || key < earliestOverdue) earliestOverdue = key;
    }
    if (key > latest) latest = key;
  }
  const start = earliestOverdue ?? curKey;
  const minEnd = curKey + 5;
  const end = Math.max(latest, minEnd);
  const months: YearMonth[] = [];
  for (let key = start; key <= end; key += 1) {
    months.push(parseYmKey(key));
  }
  return months;
};

export const outputPassesFilters = (
  line: OutputCalendarOutputLine,
  ownerSet: Set<string>,
  plantId: string | null,
): boolean => {
  if (line.isNew) return true;
  if (!ownerSet.has(line.ownerId)) return false;
  if (plantId != null && line.plantId !== plantId) return false;
  return true;
};

export type CellBreakdown = {
  quantity: number;
  lines: OutputCalendarOutputLine[];
  hasFresh: boolean;
};

export const monthCell = (
  productId: string,
  ym: YearMonth,
  lines: OutputCalendarOutputLine[],
  ownerSet: Set<string>,
  plantId: string | null,
): CellBreakdown => {
  const matched: OutputCalendarOutputLine[] = [];
  let quantity = 0;
  let hasFresh = false;
  for (const line of lines) {
    if (line.productId !== productId) continue;
    if (line.status !== "draft" && line.status !== "in_progress") continue;
    if (!outputPassesFilters(line, ownerSet, plantId)) continue;
    const lineYm = yearMonthOf(line.expectedEndOn);
    if (!lineYm || lineYm.year !== ym.year || lineYm.month !== ym.month) continue;
    matched.push(line);
    quantity += line.quantity;
    if (line.isNew) hasFresh = true;
  }
  return { quantity, lines: matched, hasFresh };
};

export const noDateCell = (
  productId: string,
  lines: OutputCalendarOutputLine[],
  ownerSet: Set<string>,
  plantId: string | null,
): CellBreakdown => {
  const matched: OutputCalendarOutputLine[] = [];
  let quantity = 0;
  let hasFresh = false;
  for (const line of lines) {
    if (line.productId !== productId) continue;
    if (line.status !== "draft" && line.status !== "in_progress") continue;
    if (!outputPassesFilters(line, ownerSet, plantId)) continue;
    if (line.expectedEndOn) continue;
    matched.push(line);
    quantity += line.quantity;
    if (line.isNew) hasFresh = true;
  }
  return { quantity, lines: matched, hasFresh };
};

/** Unique plant codes from open outputs for a product. */
export const plantCodesForProduct = (
  productId: string,
  lines: OutputCalendarOutputLine[],
): string[] => {
  const ids = new Set<string>();
  for (const line of lines) {
    if (line.productId !== productId) continue;
    if (line.status !== "draft" && line.status !== "in_progress") continue;
    ids.add(line.plantId);
  }
  return Array.from(ids)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => formatLogisticsCode("plant", id));
};

export const plantFilterOptions = (
  lines: OutputCalendarOutputLine[],
  openOrders: OutputCalendarOpenOrder[] = [],
): string[] => {
  const ids = new Set<string>();
  for (const line of lines) {
    if (line.status !== "draft" && line.status !== "in_progress") continue;
    ids.add(line.plantId);
  }
  for (const order of openOrders) {
    if (order.remaining > 0) ids.add(order.plantId);
  }
  return Array.from(ids).sort((a, b) => Number(a) - Number(b));
};

export const productVisibleForPlant = (
  productId: string,
  lines: OutputCalendarOutputLine[],
  plantId: string | null,
  openOrders: OutputCalendarOpenOrder[] = [],
): boolean => {
  if (plantId == null) return true;
  return (
    lines.some(
      (line) =>
        line.productId === productId &&
        (line.status === "draft" || line.status === "in_progress") &&
        (line.plantId === plantId || line.isNew),
    ) || openOrders.some((order) => order.productId === productId && order.plantId === plantId && order.remaining > 0)
  );
};

/** Plan of open production orders not yet split into outputs («Не распределено»). */
export const unassignedCell = (
  productId: string,
  openOrders: OutputCalendarOpenOrder[],
  plantId: string | null,
): { quantity: number; orders: OutputCalendarOpenOrder[] } => {
  const orders = openOrdersForProduct(productId, openOrders).filter(
    (order) => plantId == null || order.plantId === plantId,
  );
  return { quantity: orders.reduce((sum, order) => sum + order.remaining, 0), orders };
};

export type CategoryTreeNode = {
  id: string;
  name: string;
  depth: number;
  /** Direct product count shown under this group (not subtree). */
  productCount: number;
  products: OutputCalendarProduct[];
  children: CategoryTreeNode[];
};

const childrenOf = (categories: OutputCalendarCategory[], parentId: string | null) =>
  categories
    .filter((c) => c.parentId === parentId)
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id));

const byProductName = (a: OutputCalendarProduct, b: OutputCalendarProduct) =>
  a.name.localeCompare(b.name, "ru");

const productsInCategory = (
  products: OutputCalendarProduct[],
  categoryId: string,
  visibleIds: Set<string>,
) =>
  products.filter((p) => visibleIds.has(p.id) && p.categoryIds.includes(categoryId));

const categoryHasVisible = (
  categories: OutputCalendarCategory[],
  products: OutputCalendarProduct[],
  categoryId: string,
  visibleIds: Set<string>,
): boolean => {
  if (productsInCategory(products, categoryId, visibleIds).length > 0) return true;
  return childrenOf(categories, categoryId).some((child) =>
    categoryHasVisible(categories, products, child.id, visibleIds),
  );
};

const buildNode = (
  categories: OutputCalendarCategory[],
  products: OutputCalendarProduct[],
  category: OutputCalendarCategory,
  visibleIds: Set<string>,
  depth: number,
): CategoryTreeNode | null => {
  if (!categoryHasVisible(categories, products, category.id, visibleIds)) return null;
  const direct = productsInCategory(products, category.id, visibleIds).slice().sort(byProductName);
  const children = childrenOf(categories, category.id)
    .map((child) => buildNode(categories, products, child, visibleIds, depth + 1))
    .filter((n): n is CategoryTreeNode => n != null);
  return {
    id: category.id,
    name: category.name,
    depth,
    productCount: direct.length,
    products: direct,
    children,
  };
};

export const buildCategoryTree = (
  categories: OutputCalendarCategory[],
  products: OutputCalendarProduct[],
  visibleProductIds: Set<string>,
): { roots: CategoryTreeNode[]; uncategorized: OutputCalendarProduct[] } => {
  const roots = childrenOf(categories, null)
    .map((cat) => buildNode(categories, products, cat, visibleProductIds, 0))
    .filter((n): n is CategoryTreeNode => n != null);
  const uncategorized = products
    .filter((p) => visibleProductIds.has(p.id) && p.categoryIds.length === 0)
    .slice()
    .sort(byProductName);
  return { roots, uncategorized };
};

/** Count of deselected pieces vs default-all (for toolbar badge). */
export const ownersChangedCount = (
  filter: OutputCalendarOwnerFilter,
  page: Pick<OutputCalendarPage, "regions" | "customerOrders">,
): number => {
  let n = 0;
  if (!filter.free) n += 1;
  n += page.regions.length - filter.regionIds.length;
  if (!filter.withRegionOrders) n += 1;
  n += page.customerOrders.length - filter.orderIds.length;
  return n;
};

export const applyLocalOutput = (
  page: OutputCalendarPage,
  line: OutputCalendarOutputLine,
): OutputCalendarPage => ({
  ...page,
  outputLines: [...page.outputLines, { ...line, isNew: true }],
  openOrders: page.openOrders
    .map((order) => {
      if (order.productionOrderId === line.productionOrderId && order.productId === line.productId) {
        return { ...order, remaining: Math.max(0, order.remaining - line.quantity) };
      }
      return order;
    })
    .filter((order) => order.remaining > 0),
});

export const openOrdersForProduct = (
  productId: string,
  openOrders: OutputCalendarOpenOrder[],
): OutputCalendarOpenOrder[] =>
  openOrders
    .filter((o) => o.productId === productId && o.remaining > 0)
    .slice()
    .sort((a, b) => Number(a.productionOrderId) - Number(b.productionOrderId));

export const productCode = (productId: string): string => formatLogisticsCode("product", productId);

export const STATUS_RU: Record<"draft" | "in_progress", string> = {
  draft: "Черновик",
  in_progress: "В работе",
};

export const formatOutputDate = (iso: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
};

export const pluralTovar = (n: number): string => {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} товар`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} товара`;
  return `${n} товаров`;
};
