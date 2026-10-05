export type OrderPlanActionKind = "reserve" | "produce";

export type OrderPlanCoverageKind = "shipped" | "warehouse" | "transfer" | "production_output";

export type OrderPlanCoverageDocument = { kind: string; number: string; sequence: string };

/** Часть «Уже есть» в одном месте. У ранних снимков «Было» места нет — `locationId` пустой. */
export type OrderPlanCoveragePlace = {
  kind: OrderPlanCoverageKind;
  locationId: string | null;
  quantity: number;
  documents: OrderPlanCoverageDocument[];
};

/** «Уже есть» по товару заказа: отгружено, резерв заказа на складах и в пути, строки в черновиках выпусков. */
export type OrderPlanCoverage = {
  variantId: string;
  ordered: number;
  shipped: number;
  warehouse: number;
  transfer: number;
  output: number;
  places: OrderPlanCoveragePlace[];
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

const COVERAGE_KINDS: OrderPlanCoverageKind[] = ["shipped", "warehouse", "transfer", "production_output"];

const mapCoveragePlace = (row: Row): OrderPlanCoveragePlace => ({
  kind: COVERAGE_KINDS.find((kind) => kind === row.kind) ?? "warehouse",
  locationId: strOrNull(row.locationId),
  quantity: num(row.quantity),
  documents: rows(row.documents).map((doc) => ({
    kind: str(doc.kind),
    number: str(doc.number),
    sequence: str(doc.sequence),
  })),
});

const mapCoverage = (row: Row): OrderPlanCoverage => {
  const totals = {
    shipped: num(row.shipped),
    warehouse: num(row.warehouse),
    transfer: num(row.transfer),
    output: num(row.output),
  };
  const places = Array.isArray(row.places)
    ? rows(row.places).map(mapCoveragePlace)
    : (
        [
          ["shipped", totals.shipped],
          ["warehouse", totals.warehouse],
          ["transfer", totals.transfer],
          ["production_output", totals.output],
        ] as const
      )
        .filter(([, quantity]) => quantity !== 0)
        .map(([kind, quantity]) => ({ kind, locationId: null, quantity, documents: [] }));
  return { variantId: str(row.variantId), ordered: num(row.ordered), ...totals, places };
};

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
