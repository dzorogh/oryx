import { logisticsPath } from "@/features/logistics/logistics-paths";
import { plantCode, productById, warehouseCode } from "@/features/logistics/logistics-lookups";
import type { CustomerOrderLine, LocationKind, LogisticsSnapshot } from "@/features/logistics/logistics-types";
import {
  actionKeyString,
  type OrderPlan,
  type OrderPlanAction,
  type OrderPlanActionKey,
  type OrderPlanCoverage,
  type OrderPlanPayload,
} from "@/features/logistics/order-plan/order-plan-types";

const EPS = 1e-9;

export type SourcePlaceKind = "warehouse" | "transfer" | "production_output" | "production_order";
export const SOURCE_PLACE_KINDS: SourcePlaceKind[] = [
  "warehouse",
  "transfer",
  "production_output",
  "production_order",
];

/** Вид места на полосе: склад / в пути / выпуск. */
export type BarKind = "warehouse" | "transfer" | "output";

export type PlaceInfo = {
  locationId: string;
  kind: LocationKind | null;
  entityId: string | null;
  code: string;
  hint: string | null;
  plantId: string | null;
  status: string | null;
  goneLabel: string | null;
  href: string | null;
  order: number;
};

export type OwnerInfo = {
  ownerId: string;
  label: string;
  free: boolean;
};

export type PlanStatus = "draft" | "launched" | "archived";

export const planStatus = (plan: OrderPlan): PlanStatus =>
  plan.archivedAt ? "archived" : plan.launchedAt ? "launched" : "draft";

/** Последний созданный неархивный план, иначе последний архивный. */
export const defaultPlanId = (plans: OrderPlan[]): string | null => {
  const byCreated = [...plans].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return (byCreated.find((plan) => !plan.archivedAt) ?? byCreated[0])?.id ?? null;
};

const GONE_LABELS: Partial<Record<LocationKind, Partial<Record<string, string>>>> = {
  transfer: { done: "доехало", cancelled: "отменено" },
  production_output: { done: "завершён", cancelled: "отменён" },
  production_order: { done: "закрыт", cancelled: "отменён" },
};

export const buildPlaceIndex = (snapshot: LogisticsSnapshot): Map<string, PlaceInfo> => {
  const index = new Map<string, PlaceInfo>();
  const plantOf = (plantId: string | null | undefined) => (plantId ? plantCode(snapshot, plantId) : null);
  for (const warehouse of snapshot.warehouses) {
    index.set(warehouse.stockLocationId, {
      locationId: warehouse.stockLocationId,
      kind: "warehouse",
      entityId: warehouse.id,
      code: warehouseCode(snapshot, warehouse.id),
      hint: null,
      plantId: warehouse.plantId,
      status: null,
      goneLabel: null,
      href: logisticsPath("warehouses", warehouse.id),
      order: Number(warehouse.id),
    });
  }
  for (const transfer of snapshot.transfers) {
    index.set(transfer.stockLocationId, {
      locationId: transfer.stockLocationId,
      kind: "transfer",
      entityId: transfer.id,
      code: transfer.number,
      hint: `${warehouseCode(snapshot, transfer.fromWarehouseId)} → ${warehouseCode(snapshot, transfer.toWarehouseId)}`,
      plantId: null,
      status: transfer.status,
      goneLabel: GONE_LABELS.transfer?.[transfer.status] ?? null,
      href: logisticsPath("transfers", transfer.sequenceNumber),
      order: Number(transfer.sequenceNumber),
    });
  }
  for (const order of snapshot.productionOrders) {
    if (!order.stockLocationId) {
      continue;
    }
    index.set(order.stockLocationId, {
      locationId: order.stockLocationId,
      kind: "production_order",
      entityId: order.id,
      code: order.number,
      hint: plantOf(order.plantId),
      plantId: order.plantId ?? null,
      status: order.status,
      goneLabel: GONE_LABELS.production_order?.[order.status] ?? null,
      href: logisticsPath("production-orders", order.sequenceNumber),
      order: Number(order.sequenceNumber),
    });
  }
  for (const output of snapshot.outputs) {
    if (!output.stockLocationId) {
      continue;
    }
    const order = snapshot.productionOrders.find((item) => item.id === output.productionOrderId);
    index.set(output.stockLocationId, {
      locationId: output.stockLocationId,
      kind: "production_output",
      entityId: output.id,
      code: output.number,
      hint: plantOf(order?.plantId),
      plantId: order?.plantId ?? null,
      status: output.status,
      goneLabel: GONE_LABELS.production_output?.[output.status] ?? null,
      href: logisticsPath("outputs", output.sequenceNumber),
      order: Number(output.sequenceNumber),
    });
  }
  return index;
};

export const placeFor = (index: Map<string, PlaceInfo>, locationId: string): PlaceInfo =>
  index.get(locationId) ?? {
    locationId,
    kind: null,
    entityId: null,
    code: `#${locationId}`,
    hint: null,
    plantId: null,
    status: null,
    goneLabel: null,
    href: null,
    order: Number(locationId),
  };

export const buildOwnerResolver = (snapshot: LogisticsSnapshot) => {
  const free = new Set(snapshot.stockOwners.filter((owner) => owner.kind === "free").map((owner) => owner.id));
  free.add(snapshot.freeOwnerId);
  const labels = new Map<string, string>();
  for (const region of snapshot.regions) {
    labels.set(region.stockOwnerId, `регион ${region.name}`);
  }
  for (const order of snapshot.customerOrders) {
    labels.set(order.stockOwnerId, order.number);
  }
  return (ownerId: string): OwnerInfo =>
    free.has(ownerId)
      ? { ownerId, label: "свободно", free: true }
      : { ownerId, label: labels.get(ownerId) ?? `#${ownerId}`, free: false };
};

const barKindForPlace = (kind: LocationKind | null): BarKind =>
  kind === "warehouse" ? "warehouse" : kind === "transfer" ? "transfer" : "output";

/** Минус действия: взято больше доступного; PO для «докинуть» отменён. У запущенного плана не считается. */
export const actionShortage = (
  action: OrderPlanAction,
  places: Map<string, PlaceInfo>,
  launched: boolean,
): number => {
  if (launched) {
    return 0;
  }
  if (action.kind === "reserve") {
    return Math.max(0, action.quantity - (action.available ?? 0));
  }
  if (action.locationId && places.get(action.locationId)?.status === "cancelled") {
    return action.quantity;
  }
  return 0;
};

export type SegmentTone =
  | "have-warehouse"
  | "have-transfer"
  | "have-output"
  | "plan-warehouse"
  | "plan-transfer"
  | "plan-output"
  | "minus"
  | "none";

export type BarSegment = { tone: SegmentTone; qty: number };

export type BarModel = {
  segments: BarSegment[];
  /** Сверх заказанного — за краем полосы. */
  overflow: number;
  base: number;
};

const buildBar = (ordered: number, parts: BarSegment[]): BarModel => {
  const total = parts.reduce((sum, part) => sum + part.qty, 0);
  const base = Math.max(ordered, EPS);
  const segments: BarSegment[] = [];
  let room = ordered;
  for (const part of parts) {
    const qty = Math.min(part.qty, Math.max(room, 0));
    if (qty > EPS) {
      segments.push({ tone: part.tone, qty });
    }
    room -= part.qty;
  }
  if (room > EPS) {
    segments.push({ tone: "none", qty: room });
  }
  return { segments, overflow: Math.max(0, total - ordered), base };
};

export type ProductPlan = {
  variantId: string;
  name: string;
  subtitle: string;
  unit: string;
  plantId: string | null;
  ordered: number;
  have: number;
  haveByKind: Record<BarKind, number>;
  plan: number;
  planByKind: Record<BarKind, number>;
  shortageByKind: Record<BarKind, number>;
  shortage: number;
  shortageCount: number;
  /** Для показа: не ниже −excess. Уже существующее превышение резерва даёт 0. */
  remaining: number;
  /** Сколько план добавил сверх заказа: min(план, have + план − заказано). */
  excess: number;
  covered: number;
  /** Обеспечен до плана и действий плана по товару нет. */
  isCovered: boolean;
  bar: BarModel;
};

const zeroKinds = (): Record<BarKind, number> => ({ warehouse: 0, transfer: 0, output: 0 });

const coverageHave = (coverage: OrderPlanCoverage | undefined): Record<BarKind, number> => ({
  warehouse: (coverage?.shipped ?? 0) + (coverage?.warehouse ?? 0),
  transfer: coverage?.transfer ?? 0,
  output: coverage?.output ?? 0,
});

export const buildProductPlans = (args: {
  snapshot: LogisticsSnapshot;
  lines: CustomerOrderLine[];
  payload: OrderPlanPayload;
  plan: OrderPlan | null;
  places: Map<string, PlaceInfo>;
}): ProductPlan[] => {
  const { snapshot, lines, payload, plan, places } = args;
  const launched = Boolean(plan?.launchedAt);
  const coverage = launched && plan?.launchedCoverage ? plan.launchedCoverage : payload.coverage;
  return lines.map((line) => {
    const product = productById(snapshot, line.productId);
    const cover = coverage.find((item) => item.variantId === line.productId);
    const haveByKind = coverageHave(cover);
    const have = haveByKind.warehouse + haveByKind.transfer + haveByKind.output;
    const planByKind = zeroKinds();
    const shortageByKind = zeroKinds();
    let shortageCount = 0;
    for (const action of plan?.actions ?? []) {
      if (action.variantId !== line.productId) {
        continue;
      }
      const kind =
        action.kind === "produce" ? "output" : barKindForPlace(places.get(action.locationId ?? "")?.kind ?? null);
      const short = actionShortage(action, places, launched);
      planByKind[kind] += action.quantity - short;
      shortageByKind[kind] += short;
      if (short > EPS) {
        shortageCount += 1;
      }
    }
    const shortage = shortageByKind.warehouse + shortageByKind.transfer + shortageByKind.output;
    const planTotal = planByKind.warehouse + planByKind.transfer + planByKind.output + shortage;
    const ordered = cover?.ordered ?? line.quantity;
    const rawRemaining = ordered - have - planTotal;
    const excess = Math.min(planTotal, Math.max(0, -rawRemaining));
    const parts: BarSegment[] = [
      { tone: "have-warehouse", qty: haveByKind.warehouse },
      { tone: "have-transfer", qty: haveByKind.transfer },
      { tone: "have-output", qty: haveByKind.output },
    ];
    for (const kind of ["warehouse", "transfer", "output"] as const) {
      parts.push({ tone: `plan-${kind}`, qty: planByKind[kind] });
      parts.push({ tone: "minus", qty: shortageByKind[kind] });
    }
    const bar = buildBar(ordered, parts);
    return {
      variantId: line.productId,
      name: product?.name ?? line.productName,
      subtitle: [product?.code, line.plantId ? plantCode(snapshot, line.plantId) : null].filter(Boolean).join(" · "),
      unit: line.productUnit,
      plantId: product?.plantId ?? line.plantId ?? null,
      ordered,
      have,
      haveByKind,
      plan: planTotal,
      planByKind,
      shortageByKind,
      shortage,
      shortageCount,
      remaining: excess > EPS ? -excess : Math.max(0, rawRemaining),
      excess,
      covered: have + planTotal,
      isCovered: have + EPS >= ordered && planTotal <= EPS,
      bar: { ...bar, overflow: excess },
    };
  });
};

export type SourceRow = {
  key: OrderPlanActionKey;
  keyString: string;
  place: PlaceInfo;
  owner: OwnerInfo;
  available: number;
  take: number;
  shortage: number;
};

export type SourceGroup = { kind: SourcePlaceKind; rows: SourceRow[]; take: number };

export const buildSourceGroups = (args: {
  variantId: string;
  payload: OrderPlanPayload;
  plan: OrderPlan | null;
  places: Map<string, PlaceInfo>;
  ownerOf: (ownerId: string) => OwnerInfo;
  /** Read-only view: only rows already in the plan. */
  onlyTaken: boolean;
}): SourceGroup[] => {
  const { variantId, payload, plan, places, ownerOf, onlyTaken } = args;
  const launched = Boolean(plan?.launchedAt);
  const rows = new Map<string, SourceRow>();
  const ensure = (locationId: string, ownerId: string, available: number) => {
    const key: OrderPlanActionKey = { kind: "reserve", variantId, locationId, ownerId, plantId: null };
    const keyString = actionKeyString(key);
    const existing = rows.get(keyString);
    if (existing) {
      return existing;
    }
    const row: SourceRow = {
      key,
      keyString,
      place: placeFor(places, locationId),
      owner: ownerOf(ownerId),
      available,
      take: 0,
      shortage: 0,
    };
    rows.set(keyString, row);
    return row;
  };
  if (!launched) {
    for (const source of payload.sources) {
      if (source.variantId === variantId) {
        ensure(source.locationId, source.ownerId, source.available);
      }
    }
  }
  for (const action of plan?.actions ?? []) {
    if (action.kind !== "reserve" || action.variantId !== variantId || !action.locationId || !action.ownerId) {
      continue;
    }
    const row = ensure(action.locationId, action.ownerId, action.available ?? 0);
    row.available = action.available ?? row.available;
    row.take = action.quantity;
    row.shortage = actionShortage(action, places, launched);
  }
  const visible = [...rows.values()].filter((row) => row.take > EPS || (!onlyTaken && row.available > EPS));
  return SOURCE_PLACE_KINDS.map((kind) => {
    const groupRows = visible
      .filter((row) => row.place.kind === kind)
      .sort(
        (left, right) =>
          Number(right.owner.free) - Number(left.owner.free) ||
          right.available - left.available ||
          left.place.order - right.place.order,
      );
    return { kind, rows: groupRows, take: groupRows.reduce((sum, row) => sum + row.take, 0) };
  }).filter((group) => group.rows.length > 0);
};

export type ProduceRow = {
  key: OrderPlanActionKey;
  keyString: string;
  place: PlaceInfo | null;
  plantId: string | null;
  take: number;
  shortage: number;
};

export const buildProduceRows = (args: {
  snapshot: LogisticsSnapshot;
  variantId: string;
  plantId: string | null;
  plan: OrderPlan | null;
  places: Map<string, PlaceInfo>;
  /** Read-only view: only rows already in the plan, no «Новый PO». */
  onlyTaken: boolean;
}): { existing: ProduceRow[]; created: ProduceRow[]; newPlantIds: string[] } => {
  const { snapshot, variantId, plantId, plan, places, onlyTaken } = args;
  const launched = Boolean(plan?.launchedAt);
  const actions = (plan?.actions ?? []).filter(
    (action) => action.kind === "produce" && action.variantId === variantId,
  );
  const existing = new Map<string, ProduceRow>();
  const addExisting = (locationId: string) => {
    const key: OrderPlanActionKey = { kind: "produce", variantId, locationId, ownerId: null, plantId: null };
    const keyString = actionKeyString(key);
    if (!existing.has(keyString)) {
      const place = placeFor(places, locationId);
      existing.set(keyString, { key, keyString, place, plantId: place.plantId, take: 0, shortage: 0 });
    }
    return existing.get(keyString)!;
  };
  if (!onlyTaken) {
    for (const order of snapshot.productionOrders) {
      if (order.status === "cancelled" || !order.stockLocationId) {
        continue;
      }
      const hasLine = snapshot.productionOrderLines.some(
        (line) => line.orderId === order.id && line.productId === variantId,
      );
      if ((plantId && order.plantId === plantId) || hasLine) {
        addExisting(order.stockLocationId);
      }
    }
  }
  const created: ProduceRow[] = [];
  for (const action of actions) {
    if (action.locationId) {
      const row = addExisting(action.locationId);
      row.take = action.quantity;
      row.shortage = actionShortage(action, places, launched);
    } else if (action.plantId) {
      const key: OrderPlanActionKey = { kind: "produce", variantId, locationId: null, ownerId: null, plantId: action.plantId };
      created.push({
        key,
        keyString: actionKeyString(key),
        place: null,
        plantId: action.plantId,
        take: action.quantity,
        shortage: 0,
      });
    }
  }
  const usedPlants = new Set(created.map((row) => row.plantId));
  const allowedPlants = plantId ? [plantId] : snapshot.plants.map((plant) => plant.id);
  return {
    existing: [...existing.values()]
      .filter((row) => !onlyTaken || row.take > EPS)
      .sort((left, right) => (left.place?.order ?? 0) - (right.place?.order ?? 0)),
    created: created.sort((left, right) => Number(left.plantId) - Number(right.plantId)),
    newPlantIds: onlyTaken ? [] : allowedPlants.filter((id) => !usedPlants.has(id)),
  };
};

export type SummaryRow = {
  keyString: string;
  variantId: string;
  name: string;
  owner: OwnerInfo | null;
  quantity: number;
  shortage: number;
  excess: boolean;
};

export type SummaryGroup = {
  id: string;
  kind: SourcePlaceKind | "new_po";
  title: string;
  hint: string | null;
  goneLabel: string | null;
  href: string | null;
  result: { number: string; href: string | null } | null;
  rows: SummaryRow[];
};

export type PlanSummary = {
  take: SummaryGroup[];
  order: SummaryGroup[];
  uncovered: Array<{ variantId: string; name: string; quantity: number }>;
};

const RESULT_PATHS: Record<string, string> = {
  reservation: "reservations",
  production_output: "outputs",
  production_order: "production-orders",
};

const resultOf = (actions: OrderPlanAction[]): SummaryGroup["result"] => {
  const action = actions.find((item) => item.resultNumber);
  if (!action?.resultNumber) {
    return null;
  }
  const segment = action.resultKind ? RESULT_PATHS[action.resultKind] : undefined;
  return {
    number: action.resultNumber,
    href: segment && action.resultSequence ? logisticsPath(segment, action.resultSequence) : null,
  };
};

export const buildPlanSummary = (args: {
  snapshot: LogisticsSnapshot;
  plan: OrderPlan | null;
  products: ProductPlan[];
  places: Map<string, PlaceInfo>;
  ownerOf: (ownerId: string) => OwnerInfo;
}): PlanSummary => {
  const { snapshot, plan, products, places, ownerOf } = args;
  const launched = Boolean(plan?.launchedAt);
  const productOrder = new Map(products.map((product, index) => [product.variantId, index]));
  const productName = (variantId: string) =>
    products.find((product) => product.variantId === variantId)?.name ??
    productById(snapshot, variantId)?.name ??
    variantId;
  const excess = new Set(products.filter((product) => product.excess > EPS).map((product) => product.variantId));
  const groups = new Map<string, { group: SummaryGroup; actions: OrderPlanAction[]; section: "take" | "order"; order: number }>();

  for (const action of plan?.actions ?? []) {
    let id: string;
    let section: "take" | "order";
    let seed: Omit<SummaryGroup, "rows" | "result">;
    let order: number;
    if (action.kind === "reserve" && action.locationId) {
      const place = placeFor(places, action.locationId);
      const kind = (SOURCE_PLACE_KINDS as string[]).includes(place.kind ?? "")
        ? (place.kind as SourcePlaceKind)
        : "warehouse";
      id = `take:${action.locationId}`;
      section = "take";
      order = SOURCE_PLACE_KINDS.indexOf(kind) * 1e7 + place.order;
      seed = { id, kind, title: place.code, hint: place.hint, goneLabel: place.goneLabel, href: place.href };
    } else if (action.locationId) {
      const place = placeFor(places, action.locationId);
      id = `order:${action.locationId}`;
      section = "order";
      order = place.order;
      seed = {
        id,
        kind: "production_order",
        title: place.code,
        hint: place.hint,
        goneLabel: place.status === "cancelled" ? place.goneLabel : null,
        href: place.href,
      };
    } else {
      const plantId = action.plantId ?? "";
      id = `new:${plantId}`;
      section = "order";
      order = 1e9 + Number(plantId);
      seed = { id, kind: "new_po", title: `Новый PO · ${plantCode(snapshot, plantId)}`, hint: null, goneLabel: null, href: null };
    }
    const entry = groups.get(id) ?? { group: { ...seed, result: null, rows: [] }, actions: [], section, order };
    entry.actions.push(action);
    entry.group.rows.push({
      keyString: actionKeyString(action),
      variantId: action.variantId,
      name: productName(action.variantId),
      owner: action.kind === "reserve" && action.ownerId ? ownerOf(action.ownerId) : null,
      quantity: action.quantity,
      shortage: actionShortage(action, places, launched),
      excess: excess.has(action.variantId),
    });
    groups.set(id, entry);
  }

  const sorted = [...groups.values()].sort((left, right) => left.order - right.order);
  for (const entry of sorted) {
    entry.group.result = launched ? resultOf(entry.actions) : null;
    entry.group.rows.sort(
      (left, right) => (productOrder.get(left.variantId) ?? 0) - (productOrder.get(right.variantId) ?? 0),
    );
  }
  return {
    take: sorted.filter((entry) => entry.section === "take").map((entry) => entry.group),
    order: sorted.filter((entry) => entry.section === "order").map((entry) => entry.group),
    uncovered: products
      .filter((product) => product.remaining > EPS)
      .map((product) => ({ variantId: product.variantId, name: product.name, quantity: product.remaining })),
  };
};

export type PlanProblems = { shortages: number; excess: number; firstVariantId: string | null };

export const planProblems = (products: ProductPlan[], launched: boolean): PlanProblems => {
  if (launched) {
    return { shortages: 0, excess: 0, firstVariantId: null };
  }
  const shortages = products.reduce((sum, product) => sum + product.shortageCount, 0);
  const excessProducts = products.filter((product) => product.excess > EPS);
  const first = products.find((product) => product.shortageCount > 0 || product.excess > EPS);
  return { shortages, excess: excessProducts.length, firstVariantId: first?.variantId ?? null };
};

export const pluralRu = (count: number, one: string, few: string, many: string): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return one;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return few;
  }
  return many;
};

export const hasAction = (plan: OrderPlan | null): boolean => (plan?.actions.length ?? 0) > 0;
