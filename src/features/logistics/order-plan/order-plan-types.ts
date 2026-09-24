export type OrderPlanActionKind = "reserve" | "produce";

/** «Уже есть» по товару заказа: отгружено, резерв заказа на складах и в пути, строки в черновиках выпусков. */
export type OrderPlanCoverage = {
  variantId: string;
  ordered: number;
  shipped: number;
  warehouse: number;
  transfer: number;
  output: number;
};

/** Строка источника: место × владелец с доступным количеством. */
export type OrderPlanSource = {
  variantId: string;
  locationId: string;
  ownerId: string;
  available: number;
};

export type OrderPlanAction = {
  id: string;
  kind: OrderPlanActionKind;
  variantId: string;
  quantity: number;
  locationId: string | null;
  ownerId: string | null;
  plantId: string | null;
  /** Live `store_place_available` for draft reserve actions; null otherwise. */
  available: number | null;
  resultDocumentId: string | null;
  resultKind: string | null;
  resultNumber: string | null;
  resultSequence: string | null;
};

export type OrderPlan = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  launchedAt: string | null;
  archivedAt: string | null;
  launchedCoverage: OrderPlanCoverage[] | null;
  actions: OrderPlanAction[];
};

export type OrderPlanPayload = {
  coverage: OrderPlanCoverage[];
  sources: OrderPlanSource[];
  plans: OrderPlan[];
};

export type OrderPlanActionKey = {
  kind: OrderPlanActionKind;
  variantId: string;
  locationId: string | null;
  ownerId: string | null;
  plantId: string | null;
};

export const EMPTY_ORDER_PLAN_PAYLOAD: OrderPlanPayload = { coverage: [], sources: [], plans: [] };

export const actionKeyString = (key: OrderPlanActionKey): string =>
  [key.kind, key.variantId, key.locationId ?? "", key.ownerId ?? "", key.plantId ?? ""].join("|");

type Row = Record<string, unknown>;

const str = (value: unknown): string => String(value);
const strOrNull = (value: unknown): string | null => (value == null || value === "" ? null : String(value));
const num = (value: unknown): number => Number(value ?? 0);
const rows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);

const mapCoverage = (row: Row): OrderPlanCoverage => ({
  variantId: str(row.variantId),
  ordered: num(row.ordered),
  shipped: num(row.shipped),
  warehouse: num(row.warehouse),
  transfer: num(row.transfer),
  output: num(row.output),
});

const mapAction = (row: Row): OrderPlanAction => ({
  id: str(row.id),
  kind: str(row.kind) === "produce" ? "produce" : "reserve",
  variantId: str(row.variantId),
  quantity: num(row.quantity),
  locationId: strOrNull(row.locationId),
  ownerId: strOrNull(row.ownerId),
  plantId: strOrNull(row.plantId),
  available: row.available == null ? null : num(row.available),
  resultDocumentId: strOrNull(row.resultDocumentId),
  resultKind: strOrNull(row.resultKind),
  resultNumber: strOrNull(row.resultNumber),
  resultSequence: strOrNull(row.resultSequence),
});

export const mapOrderPlanPayload = (raw: unknown): OrderPlanPayload => {
  if (!raw || typeof raw !== "object") {
    return EMPTY_ORDER_PLAN_PAYLOAD;
  }
  const payload = raw as Row;
  return {
    coverage: rows(payload.coverage).map(mapCoverage),
    sources: rows(payload.sources).map((row) => ({
      variantId: str(row.variantId),
      locationId: str(row.locationId),
      ownerId: str(row.ownerId),
      available: num(row.available),
    })),
    plans: rows(payload.plans).map((row) => ({
      id: str(row.id),
      name: str(row.name),
      createdAt: str(row.createdAt),
      updatedAt: str(row.updatedAt ?? row.createdAt),
      launchedAt: strOrNull(row.launchedAt),
      archivedAt: strOrNull(row.archivedAt),
      launchedCoverage: Array.isArray(row.launchedCoverage)
        ? rows(row.launchedCoverage).map(mapCoverage)
        : null,
      actions: rows(row.actions).map(mapAction),
    })),
  };
};
