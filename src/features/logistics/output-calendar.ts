import { formatLogisticsCode, regionCatalogCode } from "@/features/logistics/logistics-codes";
import { OUTPUT_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import {
  allocatedAmount,
  convert,
  estimatedCostFromTotals,
  isPaymentOverdue,
  isPaymentStatus,
  mapOrderRates,
  MONEY_EPSILON,
  orderTotal,
  todayIso,
  unallocated,
  type MoneyLineTotal,
  type OrderRates,
  type PaymentStatus,
} from "@/features/logistics/order-money";

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
  /** Stored `store_region.code` (fallback `REG-{id}`). */
  code: string;
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
  status: "draft";
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

export type OutputCalendarMoneyOrder = {
  id: string;
  kind: "production_order" | "customer_order";
  number: string;
  sequenceNumber: string;
  status: string;
  /** Production order plant. */
  plantId: string | null;
  /** Customer order region. */
  regionId: string | null;
  currencyCode: string;
  amount: number | null;
  rates: OrderRates;
  lineTotals: MoneyLineTotal[];
};

export type OutputCalendarPayment = {
  id: string;
  orderId: string;
  dueOn: string;
  amount: number;
  status: PaymentStatus;
};

export type OutputCalendarPage = {
  freeOwnerId: string;
  /** All calendar sums are in this currency. */
  productionCurrency: string;
  categories: OutputCalendarCategory[];
  products: OutputCalendarProduct[];
  plants: Array<{ id: string }>;
  regions: OutputCalendarRegion[];
  customerOrders: OutputCalendarCustomerOrder[];
  stock: OutputCalendarStockRow[];
  outputLines: OutputCalendarOutputLine[];
  openOrders: OutputCalendarOpenOrder[];
  /** Non-cancelled production and customer orders with their money facts. */
  moneyOrders: OutputCalendarMoneyOrder[];
  /** Every payment of `moneyOrders`, paid included. */
  payments: OutputCalendarPayment[];
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

const isOpenOutputStatus = (value: unknown): value is "draft" => value === "draft";

export const mapOutputCalendarPage = (raw: unknown): OutputCalendarPage => {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = (key: string): unknown[] => (Array.isArray(row[key]) ? (row[key] as unknown[]) : []);

  return {
    freeOwnerId: asId(row.freeOwnerId),
    productionCurrency: row.productionCurrency ? String(row.productionCurrency) : "USD",
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
        code: regionCatalogCode(r.code, asId(r.id)),
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
    moneyOrders: list("moneyOrders").map((item) => {
      const o = item as Record<string, unknown>;
      const totals = Array.isArray(o.lineTotals) ? (o.lineTotals as Array<Record<string, unknown>>) : [];
      return {
        id: asId(o.id),
        kind: o.kind === "customer_order" ? ("customer_order" as const) : ("production_order" as const),
        number: String(o.number ?? ""),
        sequenceNumber: asId(o.sequenceNumber),
        status: String(o.status ?? ""),
        plantId: asNullableId(o.plantId),
        regionId: asNullableId(o.regionId),
        currencyCode: String(o.currencyCode ?? "USD"),
        amount: o.amount == null || o.amount === "" ? null : asNumber(o.amount),
        rates: mapOrderRates(o.rates),
        lineTotals: totals.map((t) => ({
          currencyCode: t.currencyCode == null ? null : String(t.currencyCode),
          total: asNumber(t.total),
        })),
      };
    }),
    payments: list("payments").flatMap((item) => {
      const p = item as Record<string, unknown>;
      if (!isPaymentStatus(p.status)) return [];
      return [
        {
          id: asId(p.id),
          orderId: asId(p.orderId),
          dueOn: String(p.dueOn ?? "").slice(0, 10),
          amount: asNumber(p.amount),
          status: p.status,
        },
      ];
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

/**
 * Month columns: from the earliest overdue output or unpaid payment (else the current month)
 * to the latest of both, at least current month + 5. `paymentDueDates` — unpaid payments of non-cancelled orders.
 */
export const computeMonthRange = (
  lines: Array<Pick<OutputCalendarOutputLine, "expectedEndOn" | "status">>,
  today: Date = new Date(),
  paymentDueDates: string[] = [],
): YearMonth[] => {
  const cur = currentYearMonth(today);
  const curKey = ymKey(cur);
  let earliestOverdue: number | null = null;
  let latest = curKey;
  const dates = [
    ...lines.filter((line) => line.status === "draft").map((line) => line.expectedEndOn),
    ...paymentDueDates,
  ];
  for (const date of dates) {
    const ym = yearMonthOf(date);
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

/** Inclusive ISO date range of a month or day column. */
export type CalendarPeriod = { from: string; to: string };

const pad2 = (n: number) => String(n).padStart(2, "0");

export const dayIso = (ym: YearMonth, day: number): string => `${ym.year}-${pad2(ym.month)}-${pad2(day)}`;

export const daysInMonth = (ym: YearMonth): number => new Date(ym.year, ym.month, 0).getDate();

export const monthPeriod = (ym: YearMonth): CalendarPeriod => ({
  from: dayIso(ym, 1),
  to: dayIso(ym, daysInMonth(ym)),
});

export const inPeriod = (iso: string | null | undefined, period: CalendarPeriod): boolean => {
  if (!iso) return false;
  const date = iso.slice(0, 10);
  return date >= period.from && date <= period.to;
};

export type CalendarColumn =
  | { kind: "month"; key: string; ym: YearMonth; period: CalendarPeriod }
  | { kind: "day"; key: string; ym: YearMonth; day: number; iso: string; period: CalendarPeriod };

/** Collapsed months stay one column; each expanded month becomes a column per day (empty days included). */
export const buildCalendarColumns = (months: YearMonth[], expanded: Set<number>): CalendarColumn[] =>
  months.flatMap((ym): CalendarColumn[] => {
    const key = ymKey(ym);
    if (!expanded.has(key)) {
      return [{ kind: "month", key: `m${key}`, ym, period: monthPeriod(ym) }];
    }
    return Array.from({ length: daysInMonth(ym) }, (_, index) => {
      const iso = dayIso(ym, index + 1);
      return { kind: "day" as const, key: `d${iso}`, ym, day: index + 1, iso, period: { from: iso, to: iso } };
    });
  });

export const periodCell = (
  productId: string,
  period: CalendarPeriod,
  lines: OutputCalendarOutputLine[],
  ownerSet: Set<string>,
  plantId: string | null,
): CellBreakdown => {
  const matched: OutputCalendarOutputLine[] = [];
  let quantity = 0;
  let hasFresh = false;
  for (const line of lines) {
    if (line.productId !== productId) continue;
    if (line.status !== "draft") continue;
    if (!outputPassesFilters(line, ownerSet, plantId)) continue;
    if (!inPeriod(line.expectedEndOn, period)) continue;
    matched.push(line);
    quantity += line.quantity;
    if (line.isNew) hasFresh = true;
  }
  return { quantity, lines: matched, hasFresh };
};

export const monthCell = (
  productId: string,
  ym: YearMonth,
  lines: OutputCalendarOutputLine[],
  ownerSet: Set<string>,
  plantId: string | null,
): CellBreakdown => periodCell(productId, monthPeriod(ym), lines, ownerSet, plantId);

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
    if (line.status !== "draft") continue;
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
    if (line.status !== "draft") continue;
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
    if (line.status !== "draft") continue;
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
        line.status === "draft" &&
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

export const STATUS_RU = {
  draft: OUTPUT_STATUS_LABELS.draft,
} as const;

export const formatOutputDate = (iso: string | null): string => {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
};

// ---------------------------------------------------------------------------
// Money rows: «Платежи заводам» (row per plant) and «Поступления от клиентов» (row per region)
// ---------------------------------------------------------------------------

export type UnpaidStatus = Exclude<PaymentStatus, "paid">;

export const UNPAID_STATUSES: readonly UnpaidStatus[] = ["planned", "invoiced"];

/** Exclusion sets: empty — default (everything shown); new plants after a refresh stay visible. */
export type PlantPaymentsFilter = { hiddenPlantIds: string[]; hiddenStatuses: UnpaidStatus[] };

export type IncomingFilter = {
  hiddenRegionIds: string[];
  hiddenOrderIds: string[];
  hiddenStatuses: UnpaidStatus[];
};

export const defaultPlantPaymentsFilter = (): PlantPaymentsFilter => ({ hiddenPlantIds: [], hiddenStatuses: [] });

export const defaultIncomingFilter = (): IncomingFilter => ({
  hiddenRegionIds: [],
  hiddenOrderIds: [],
  hiddenStatuses: [],
});

export const plantPaymentsFilterChanged = (filter: PlantPaymentsFilter): boolean =>
  filter.hiddenPlantIds.length > 0 || filter.hiddenStatuses.length > 0;

export const incomingFilterChanged = (filter: IncomingFilter): boolean =>
  filter.hiddenRegionIds.length > 0 || filter.hiddenOrderIds.length > 0 || filter.hiddenStatuses.length > 0;

export const outputsFilterChanged = (
  filter: OutputCalendarOwnerFilter,
  page: Pick<OutputCalendarPage, "regions" | "customerOrders">,
  plantId: string | null,
): boolean => ownersChangedCount(filter, page) > 0 || plantId != null;

/** One order with money totals in its own currency. */
export type MoneyOrderFacts = {
  order: OutputCalendarMoneyOrder;
  estimated: number;
  total: number;
  allocated: number;
  /** «Не распределено по платежам»; negative when payments exceed the amount. */
  rest: number;
  payments: OutputCalendarPayment[];
};

export const moneyOrderFacts = (
  order: OutputCalendarMoneyOrder,
  payments: OutputCalendarPayment[],
): MoneyOrderFacts => {
  const own = payments.filter((payment) => payment.orderId === order.id);
  const estimated = estimatedCostFromTotals(order.lineTotals, order.currencyCode, order.rates);
  const total = orderTotal(order.amount, estimated);
  return { order, estimated, total, allocated: allocatedAmount(own), rest: unallocated(total, own), payments: own };
};

/** Amount of an order payment in the production currency, by the order snapshot. */
export const toProductionCurrency = (
  amount: number,
  order: Pick<OutputCalendarMoneyOrder, "currencyCode" | "rates">,
  productionCurrency: string,
): number => convert(amount, order.currencyCode, productionCurrency, order.rates) ?? 0;

const isUnpaid = (payment: OutputCalendarPayment): payment is OutputCalendarPayment & { status: UnpaidStatus } =>
  payment.status !== "paid";

/** Due dates of unpaid payments of non-cancelled orders — they widen the month range. */
export const unpaidPaymentDueDates = (page: Pick<OutputCalendarPage, "moneyOrders" | "payments">): string[] => {
  const live = new Set(page.moneyOrders.filter((order) => order.status !== "cancelled").map((order) => order.id));
  return page.payments.filter((payment) => live.has(payment.orderId) && isUnpaid(payment)).map((p) => p.dueOn);
};

export type MoneyRowKind = "plant" | "region";

export type MoneyRow = {
  kind: MoneyRowKind;
  /** Plant id or region id. */
  id: string;
  code: string;
  facts: MoneyOrderFacts[];
};

const byNumericId = (a: string, b: string) => Number(a) - Number(b) || a.localeCompare(b);

const hasMoneyToShow = (facts: MoneyOrderFacts[], hiddenStatuses: UnpaidStatus[]): boolean =>
  facts.some(
    (fact) =>
      fact.rest > MONEY_EPSILON ||
      fact.payments.some((payment) => isUnpaid(payment) && !hiddenStatuses.includes(payment.status)),
  );

const liveFacts = (page: Pick<OutputCalendarPage, "moneyOrders" | "payments">, kind: OutputCalendarMoneyOrder["kind"]) =>
  page.moneyOrders
    .filter((order) => order.kind === kind && order.status !== "cancelled")
    .map((order) => moneyOrderFacts(order, page.payments));

const groupFacts = (facts: MoneyOrderFacts[], keyOf: (fact: MoneyOrderFacts) => string | null) => {
  const groups = new Map<string, MoneyOrderFacts[]>();
  for (const fact of facts) {
    const key = keyOf(fact);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) ?? []), fact]);
  }
  return groups;
};

/** Plants with unpaid payments or unallocated money; options of the «Платежи заводам» panel. */
export const plantPaymentOptions = (page: Pick<OutputCalendarPage, "moneyOrders" | "payments">): string[] =>
  [...groupFacts(liveFacts(page, "production_order"), (fact) => fact.order.plantId).entries()]
    .filter(([, facts]) => hasMoneyToShow(facts, []))
    .map(([id]) => id)
    .sort(byNumericId);

/** Customer orders with money to show; options of the «Поступления» panel. */
export const incomingOrderOptions = (
  page: Pick<OutputCalendarPage, "moneyOrders" | "payments">,
): OutputCalendarMoneyOrder[] =>
  liveFacts(page, "customer_order")
    .filter((fact) => fact.order.regionId && hasMoneyToShow([fact], []))
    .map((fact) => fact.order)
    .sort((a, b) => byNumericId(a.sequenceNumber, b.sequenceNumber));

export const incomingRegionOptions = (
  page: Pick<OutputCalendarPage, "moneyOrders" | "payments" | "regions">,
): OutputCalendarRegion[] => {
  const ids = new Set(incomingOrderOptions(page).map((order) => order.regionId));
  return page.regions.filter((region) => ids.has(region.id));
};

export const plantMoneyRows = (
  page: Pick<OutputCalendarPage, "moneyOrders" | "payments">,
  filter: PlantPaymentsFilter,
): MoneyRow[] =>
  [...groupFacts(liveFacts(page, "production_order"), (fact) => fact.order.plantId).entries()]
    .filter(([plantId, facts]) => !filter.hiddenPlantIds.includes(plantId) && hasMoneyToShow(facts, filter.hiddenStatuses))
    .sort(([a], [b]) => byNumericId(a, b))
    .map(([plantId, facts]) => ({ kind: "plant", id: plantId, code: formatLogisticsCode("plant", plantId), facts }));

export const regionMoneyRows = (
  page: Pick<OutputCalendarPage, "moneyOrders" | "payments" | "regions">,
  filter: IncomingFilter,
): MoneyRow[] => {
  const codeById = new Map(page.regions.map((region) => [region.id, region.code]));
  const facts = liveFacts(page, "customer_order").filter((fact) => !filter.hiddenOrderIds.includes(fact.order.id));
  return [...groupFacts(facts, (fact) => fact.order.regionId).entries()]
    .filter(([regionId, group]) => !filter.hiddenRegionIds.includes(regionId) && hasMoneyToShow(group, filter.hiddenStatuses))
    .sort(([a], [b]) => byNumericId(a, b))
    .map(([regionId, group]) => ({
      kind: "region",
      id: regionId,
      code: codeById.get(regionId) ?? regionCatalogCode(null, regionId),
      facts: group,
    }));
};

export type MoneyCellEntry = {
  payment: OutputCalendarPayment;
  order: OutputCalendarMoneyOrder;
  overdue: boolean;
  /** Production currency. */
  converted: number;
};

export type MoneyCell = { amount: number; entries: MoneyCellEntry[]; overdue: boolean };

/** Σ unpaid payments due in `period`, converted to the production currency by each order's snapshot. */
export const moneyPeriodCell = (
  row: MoneyRow,
  period: CalendarPeriod,
  hiddenStatuses: UnpaidStatus[],
  productionCurrency: string,
  today: string = todayIso(),
): MoneyCell => {
  const entries: MoneyCellEntry[] = [];
  for (const fact of row.facts) {
    for (const payment of fact.payments) {
      if (!isUnpaid(payment) || hiddenStatuses.includes(payment.status)) continue;
      if (!inPeriod(payment.dueOn, period)) continue;
      entries.push({
        payment,
        order: fact.order,
        overdue: isPaymentOverdue(payment, today),
        converted: toProductionCurrency(payment.amount, fact.order, productionCurrency),
      });
    }
  }
  entries.sort((a, b) => a.payment.dueOn.localeCompare(b.payment.dueOn) || byNumericId(a.payment.id, b.payment.id));
  return {
    amount: entries.reduce((sum, entry) => sum + entry.converted, 0),
    entries,
    overdue: entries.some((entry) => entry.overdue),
  };
};

export type MoneyUnallocatedEntry = MoneyOrderFacts & { converted: number };

/** Σ max(0, «Не распределено по платежам») of the row's orders in the production currency. */
export const moneyUnallocatedCell = (
  row: MoneyRow,
  productionCurrency: string,
): { amount: number; entries: MoneyUnallocatedEntry[] } => {
  const entries = row.facts
    .filter((fact) => fact.rest > MONEY_EPSILON)
    .map((fact) => ({ ...fact, converted: toProductionCurrency(fact.rest, fact.order, productionCurrency) }));
  return { amount: entries.reduce((sum, entry) => sum + entry.converted, 0), entries };
};

// ---------------------------------------------------------------------------
// «Считаем: …» — outputs filter only
// ---------------------------------------------------------------------------

const listWithMore = (items: string[], max = 3): string =>
  items.length <= max ? items.join(", ") : `${items.slice(0, max).join(", ")} +${items.length - max}`;

export const outputsFilterSummary = (
  filter: OutputCalendarOwnerFilter,
  page: Pick<OutputCalendarPage, "regions" | "customerOrders">,
  plantId: string | null,
): string => {
  const parts: string[] = [];
  if (filter.free) parts.push("Свободно");
  const regionNames = page.regions.filter((r) => filter.regionIds.includes(r.id)).map((r) => r.name);
  if (regionNames.length > 0) {
    const label =
      regionNames.length === page.regions.length ? "все регионы" : listWithMore(regionNames);
    parts.push(filter.withRegionOrders ? `${label} (с заказами)` : label);
  }
  const orders = page.customerOrders.filter((o) => filter.orderIds.includes(o.id)).map((o) => o.number);
  if (orders.length > 0) {
    parts.push(orders.length === page.customerOrders.length ? "все заказы клиента" : listWithMore(orders));
  }
  const owners = parts.length > 0 ? parts.join(" + ") : "никого";
  return `Считаем: ${owners}${plantId ? ` · ${formatLogisticsCode("plant", plantId)}` : ""}`;
};
