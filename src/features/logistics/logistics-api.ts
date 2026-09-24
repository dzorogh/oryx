import type {
  AppUser,
  CustomerOrder,
  CustomerOrderLine,
  DocumentHistoryEntry,
  DocumentKind,
  DocumentProductLine,
  LogisticsPlant,
  LogisticsProduct,
  LogisticsRegion,
  LogisticsSetting,
  LogisticsSnapshot,
  LogisticsWarehouse,
  OwnerKind,
  OwnerType,
  ProductionOrder,
  ProductionOrderLine,
  ProductionOutput,
  ProductionOutputAllocation,
  ProductionOutputLine,
  ProductionStatus,
  Reservation,
  ReservationLine,
  ReservationLocationType,
  Shipment,
  ShipmentLine,
  StockAdjustment,
  StockAdjustmentLine,
  StockBalance,
  StockLocation,
  StockOwner,
  StockTransaction,
  Transfer,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";
import { mapOutputCalendarPage } from "@/features/logistics/output-calendar";
import type {
  AdjustmentListRow,
  CustomerOrderListRow,
  LogisticsListProductLine,
  OutputListRow,
  ProductionOrderListRow,
  ReservationListRow,
  ShipmentListRow,
  TransferListRow,
} from "@/features/logistics/logistics-list-types";
import {
  assertAdjustmentExplanation,
  assertAdjustmentLines,
  type AdjustmentDraft,
} from "@/features/logistics/logistics-adjustments";
import {
  derivedStockState,
  documentNumber,
  FREE_OWNER_ID,
  ownerKindToType,
  reservationDirection,
  STORE_CURRENT_USER_ID,
} from "@/features/logistics/logistics-types";
import {
  DOCUMENT_KIND_TO_PREFIX_FIELD,
  DOCUMENT_PREFIX_FIELDS,
  formatLogisticsCode,
  mergeLogisticsCodePrefixes,
  setActiveLogisticsCodePrefixes,
  type LogisticsCodePrefixes,
} from "@/features/logistics/logistics-codes";
import { assertDocumentCanBeCancelled } from "@/features/logistics/logistics-rules";
import { resolveOwnerId, resolveStockLocationId } from "@/features/logistics/logistics-resolve";
import {
  shipmentCreateRpcArgs,
  type ShipmentCreateAndPostInput,
  type ShipmentCreateAndPostResult,
} from "@/features/logistics/shipment-direct-post";
import {
  transferCreateRpcArgs,
  type TransferCreateAndSendInput,
  type TransferCreateAndSendResult,
} from "@/features/logistics/transfer-direct-send";
import { preferKorportalMediaConversion } from "@/lib/korportal-media-url";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const requireClient = () => {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase is not configured");
  }
  return client;
};

const requireData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) {
    throw new Error(error.message);
  }
  if (data == null) {
    throw new Error("Supabase returned no data");
  }
  return data;
};

const dateOrNull = (value: unknown): string | null => (value ? String(value) : null);
const str = (value: unknown): string => String(value);
const strOrNull = (value: unknown): string | null =>
  value == null || value === "" ? null : String(value);

type DocRegistryRow = {
  id: string;
  kind: string;
  sequence_number: string;
  description: string;
  status: string | null;
  expected_end_on: string | null;
  created_at: string;
  created_by: string;
  number_prefix: string;
};

const selectAll = async <T>(
  table: string,
  columns: string,
  map: (row: Record<string, unknown>) => T,
  order: string,
): Promise<T[]> => {
  const client = requireClient();
  const { data, error } = await client.from(table).select(columns).order(order, { ascending: true });
  return requireData(data, error).map((row) => map(row as unknown as Record<string, unknown>));
};

const rpc = async (name: string, args: Record<string, unknown>): Promise<string> => {
  const client = requireClient();
  const { data, error } = await client.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
  return String(data ?? "ok");
};

const rpcJson = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  const client = requireClient();
  const { data, error } = await client.rpc(name, args);
  return requireData(data as T | null, error);
};

type EntityLoc = { kind: StockLocation["kind"]; entityId: string };
type EntityOwner = { kind: OwnerKind; entityId: string | null };

const prefixesFromKinds = (
  kinds: Array<{ code: string; number_prefix: string }>,
): LogisticsCodePrefixes => {
  const overrides: Record<string, string> = {};
  for (const kind of kinds) {
    const field = DOCUMENT_KIND_TO_PREFIX_FIELD[kind.code];
    if (field) {
      overrides[field] = kind.number_prefix;
    }
  }
  return mergeLogisticsCodePrefixes(overrides);
};

export const loadLogisticsSettings = async (): Promise<LogisticsSetting> => {
  const kinds = await selectAll(
    "store_document_kind",
    "code,number_prefix",
    (row) => ({ code: str(row.code), number_prefix: str(row.number_prefix) }),
    "code",
  );
  const codePrefixes = prefixesFromKinds(kinds);
  setActiveLogisticsCodePrefixes(codePrefixes);
  return { id: "1", codePrefixes };
};

export const saveLogisticsCodePrefixes = async (
  prefixes: LogisticsCodePrefixes,
): Promise<LogisticsSetting> => {
  const next = mergeLogisticsCodePrefixes(prefixes);
  for (const field of DOCUMENT_PREFIX_FIELDS) {
    await rpc("store_update_document_kind_prefix", {
      p_kind: field.documentKind,
      p_prefix: next[field.kind],
    });
  }
  setActiveLogisticsCodePrefixes(next);
  return { id: "1", codePrefixes: next };
};

type SnapshotRow = Record<string, unknown>;

export type LogisticsPayload = {
  document_kinds?: SnapshotRow[];
  documents?: SnapshotRow[];
  product_variants?: SnapshotRow[];
  warehouses?: SnapshotRow[];
  plants?: SnapshotRow[];
  regions?: SnapshotRow[];
  stock_locations?: SnapshotRow[];
  stock_owners?: SnapshotRow[];
  customer_orders?: SnapshotRow[];
  production_orders?: SnapshotRow[];
  reservations?: SnapshotRow[];
  transfers?: SnapshotRow[];
  shipments?: SnapshotRow[];
  production_outputs?: SnapshotRow[];
  adjustments?: SnapshotRow[];
  document_product_lines?: SnapshotRow[];
  stock_transactions?: SnapshotRow[];
  users?: SnapshotRow[];
  document_history?: SnapshotRow[];
  balances?: SnapshotRow[];
  found?: boolean;
};

export type MappedLogistics = {
  snapshot: LogisticsSnapshot;
  /** When present, prefer over computeStockBalances(transactions). */
  balances: StockBalance[] | null;
  found: boolean;
};

const mapBalanceRow = (row: SnapshotRow): StockBalance => {
  const ownerKind = str(row.owner_kind) as OwnerKind;
  const locationType = str(row.location_kind) as StockLocation["kind"];
  const ownerType =
    ownerKind === "customer_order" ? "order" : ownerKind === "region" ? "region" : null;
  const ownerId = row.owner_entity_id == null ? null : str(row.owner_entity_id);
  return {
    productId: str(row.product_variant_id),
    stockLocationId: str(row.stock_location_id),
    stockOwnerId: str(row.stock_owner_id),
    locationType,
    locationId: str(row.location_entity_id ?? row.stock_location_id),
    ownerKind,
    stockState: str(row.stock_state) as StockBalance["stockState"],
    quantity: Number(row.quantity),
    assignedToType: ownerType,
    assignedToId: ownerId,
    ownerType,
    ownerId,
  };
};

/**
 * Maps a read-RPC payload to a snapshot: optional keys default to [], SQL balances pass through.
 * When the payload has `document_kinds`, also updates the active document code prefixes.
 */
export const mapLogisticsPayload = (payload: LogisticsPayload): MappedLogistics => {
  const {
    document_kinds: kinds = [],
    documents = [],
    product_variants: variants = [],
    warehouses = [],
    plants = [],
    regions = [],
    stock_locations: stockLocations = [],
    stock_owners: stockOwners = [],
    customer_orders: customerOrdersRaw = [],
    production_orders: productionOrdersRaw = [],
    reservations: reservationsRaw = [],
    transfers: transfersRaw = [],
    shipments: shipmentsRaw = [],
    production_outputs: outputsRaw = [],
    adjustments: adjustmentsRaw = [],
    document_product_lines: rawLines = [],
    stock_transactions: transactionsRaw = [],
  } = payload;

  const codePrefixes = prefixesFromKinds(
    kinds.map((row) => ({ code: str(row.code), number_prefix: str(row.number_prefix) })),
  );
  if (kinds.length > 0) {
    setActiveLogisticsCodePrefixes(codePrefixes);
  }
  const settings: LogisticsSetting = { id: "1", codePrefixes };
  const kindPrefix = new Map(kinds.map((row) => [str(row.code), str(row.number_prefix)]));

  const users: AppUser[] = (payload.users ?? []).map((row) => ({ id: str(row.id), name: str(row.name) }));
  const documentHistory: DocumentHistoryEntry[] = (payload.document_history ?? []).map((row) => ({
    id: str(row.id),
    documentId: str(row.document_id),
    status: row.status == null ? null : str(row.status),
    expectedEndOn: dateOrNull(row.expected_end_on),
    changedAt: str(row.changed_at),
    changedBy: str(row.changed_by),
  }));

  const docs = new Map<string, DocRegistryRow>();
  for (const row of documents) {
    const id = str(row.id);
    const kind = str(row.kind);
    docs.set(id, {
      id,
      kind,
      sequence_number: str(row.sequence_number),
      description: row.description ? str(row.description) : "",
      status: row.status == null ? null : str(row.status),
      expected_end_on: dateOrNull(row.expected_end_on),
      created_at: str(row.created_at),
      created_by: row.created_by == null ? STORE_CURRENT_USER_ID : str(row.created_by),
      number_prefix: kindPrefix.get(kind) ?? kind.toUpperCase(),
    });
  }

  const plantByWarehouse = new Map<string, string>();
  for (const plant of plants) {
    plantByWarehouse.set(str(plant.warehouse_id), str(plant.id));
  }

  const logisticsPlants: LogisticsPlant[] = plants.map((row) => {
    const id = str(row.id);
    return {
      id,
      code: formatLogisticsCode("plant", id),
      name: str(row.name),
      warehouseId: str(row.warehouse_id),
    };
  });
  const plantName = new Map(logisticsPlants.map((p) => [p.id, p.name]));
  const plantCode = new Map(logisticsPlants.map((p) => [p.id, p.code]));

  const logisticsWarehouses: LogisticsWarehouse[] = warehouses.map((row) => {
    const id = str(row.id);
    return {
      id,
      code: formatLogisticsCode("warehouse", id),
      name: str(row.name),
      stockLocationId: str(row.stock_location_id),
      plantId: plantByWarehouse.get(id) ?? null,
    };
  });

  const logisticsRegions: LogisticsRegion[] = regions.map((row) => {
    const id = str(row.id);
    return {
      id,
      code: row.code ? str(row.code) : formatLogisticsCode("region", id),
      name: str(row.name),
      stockOwnerId: str(row.stock_owner_id),
    };
  });

  const stockLocationList: StockLocation[] = stockLocations.map((row) => ({
    id: str(row.id),
    kind: str(row.kind) as StockLocation["kind"],
  }));
  const stockOwnerList: StockOwner[] = stockOwners.map((row) => ({
    id: str(row.id),
    kind: str(row.kind) as OwnerKind,
  }));

  const locEntity = new Map<string, EntityLoc>();
  for (const wh of logisticsWarehouses) {
    locEntity.set(wh.stockLocationId, { kind: "warehouse", entityId: wh.id });
  }
  for (const row of customerOrdersRaw) {
    locEntity.set(str(row.stock_location_id), { kind: "customer_order", entityId: str(row.id) });
  }
  for (const row of productionOrdersRaw) {
    locEntity.set(str(row.stock_location_id), { kind: "production_order", entityId: str(row.id) });
  }
  for (const row of transfersRaw) {
    locEntity.set(str(row.stock_location_id), { kind: "transfer", entityId: str(row.id) });
  }

  const ownerEntity = new Map<string, EntityOwner>();
  for (const owner of stockOwnerList) {
    if (owner.kind === "free") {
      ownerEntity.set(owner.id, { kind: "free", entityId: null });
    }
  }
  for (const row of customerOrdersRaw) {
    ownerEntity.set(str(row.stock_owner_id), { kind: "customer_order", entityId: str(row.id) });
  }
  for (const row of logisticsRegions) {
    ownerEntity.set(row.stockOwnerId, { kind: "region", entityId: row.id });
  }

  const resolveOwnerProjection = (
    ownerId: string | null,
  ): { ownerType: OwnerType | null; ownerId: string | null; ownerKind: OwnerKind } => {
    if (ownerId == null) {
      return { ownerType: null, ownerId: null, ownerKind: "free" };
    }
    const info = ownerEntity.get(ownerId);
    if (!info || info.kind === "free") {
      return { ownerType: null, ownerId: null, ownerKind: "free" };
    }
    return {
      ownerType: ownerKindToType(info.kind),
      ownerId: info.entityId,
      ownerKind: info.kind,
    };
  };

  const variantById = new Map(variants.map((row) => [str(row.id), row]));
  const logisticsProducts: LogisticsProduct[] = variants.map((row) => {
    const id = str(row.id);
    return {
      id,
      productId: str(row.product_id),
      code: formatLogisticsCode("product", id),
      name: str(row.name),
      unit: str(row.unit ?? "шт"),
      imageUrl: preferKorportalMediaConversion(row.image_url ? str(row.image_url) : null),
      plantId: strOrNull(row.plant_id),
    };
  });

  const attachDoc = (id: string, kind: string): DocRegistryRow => {
    const doc = docs.get(id);
    if (!doc) {
      throw new Error(`store_document missing for ${kind} ${id}`);
    }
    return doc;
  };

  const customerOrders: CustomerOrder[] = customerOrdersRaw.map((row) => {
    const doc = attachDoc(str(row.id), "customer_order");
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      status: (doc.status ?? "in_progress") as CustomerOrder["status"],
      regionId: str(row.region_id),
      stockLocationId: str(row.stock_location_id),
      stockOwnerId: str(row.stock_owner_id),
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      expectedEndOn: doc.expected_end_on,
      description: doc.description,
    };
  });

  const productionOrders: ProductionOrder[] = productionOrdersRaw.map((row) => {
    const doc = attachDoc(str(row.id), "production_order");
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      plantId: str(row.plant_id),
      stockLocationId: str(row.stock_location_id),
      status: (doc.status ?? "draft") as ProductionOrder["status"],
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      expectedEndOn: doc.expected_end_on,
    };
  });

  const reservations: Reservation[] = reservationsRaw.map((row) => {
    const doc = attachDoc(str(row.id), "reservation");
    const loc = locEntity.get(str(row.location_id));
    const dest = resolveOwnerProjection(str(row.owner_id));
    const locationType = (loc?.kind ?? "warehouse") as ReservationLocationType;
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      stockLocationId: str(row.location_id),
      locationType,
      locationId: loc?.entityId ?? str(row.location_id),
      ownerId: str(row.owner_id),
      toOwnerType: dest.ownerType,
      toOwnerId: dest.ownerId,
      postedAt: dateOrNull(row.posted_at) ?? doc.created_at,
      creationSource: str(row.creation_source) as Reservation["creationSource"],
      description: doc.description,
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      origin: str(row.creation_source) as Reservation["origin"],
      note: doc.description,
    };
  });

  const transfers: Transfer[] = transfersRaw.map((row) => {
    const doc = attachDoc(str(row.id), "transfer");
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      fromWarehouseId: str(row.from_warehouse_id),
      toWarehouseId: str(row.to_warehouse_id),
      stockLocationId: str(row.stock_location_id),
      status: (doc.status ?? "in_progress") as Transfer["status"],
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      expectedEndOn: doc.expected_end_on,
    };
  });

  const orderByLocation = new Map(
    customerOrders.map((order) => [order.stockLocationId, order.id]),
  );

  const shipments: Shipment[] = shipmentsRaw.map((row) => {
    const doc = attachDoc(str(row.id), "shipment");
    const from = locEntity.get(str(row.from_location_id));
    const to = locEntity.get(str(row.to_location_id));
    const customerOrderId =
      orderByLocation.get(str(row.from_location_id)) ??
      orderByLocation.get(str(row.to_location_id)) ??
      "";
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      fromStockLocationId: str(row.from_location_id),
      toStockLocationId: str(row.to_location_id),
      fromLocationType: from?.kind ?? "warehouse",
      fromLocationId: from?.entityId ?? str(row.from_location_id),
      toLocationType: to?.kind ?? "customer_order",
      toLocationId: to?.entityId ?? str(row.to_location_id),
      customerOrderId,
      createdAt: doc.created_at,
      createdBy: doc.created_by,
    };
  });

  const outputs: ProductionOutput[] = outputsRaw.map((row) => {
    const doc = attachDoc(str(row.id), "production_output");
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      productionOrderId: str(row.production_order_id),
      status: (doc.status ?? "draft") as ProductionOutput["status"],
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      expectedEndOn: doc.expected_end_on,
    };
  });

  const warehouseByLocation = new Map(
    logisticsWarehouses.map((wh) => [wh.stockLocationId, wh.id]),
  );

  const adjustments: StockAdjustment[] = adjustmentsRaw.map((row) => {
    const doc = attachDoc(str(row.id), "adjustment");
    return {
      id: doc.id,
      numberPrefix: doc.number_prefix,
      series: doc.number_prefix,
      sequenceNumber: doc.sequence_number,
      number: documentNumber(doc.number_prefix, doc.sequence_number),
      locationId: str(row.location_id),
      warehouseId: warehouseByLocation.get(str(row.location_id)) ?? str(row.location_id),
      description: doc.description,
      createdAt: doc.created_at,
      createdBy: doc.created_by,
      operation: "mixed",
      explanation: doc.description,
      sourceDocumentType: null,
      sourceDocumentId: null,
      status: "posted",
    };
  });

  const kindByDocumentId = new Map([...docs.values()].map((doc) => [doc.id, doc.kind]));

  const mapLineOwners = (fromOwnerId: string | null, toOwnerId: string | null) => {
    const from = resolveOwnerProjection(fromOwnerId);
    const to = resolveOwnerProjection(toOwnerId);
    return {
      fromOwnerId,
      toOwnerId,
      fromOwnerType: from.ownerType,
      toOwnerType: to.ownerType,
    };
  };

  const documentProductLines: DocumentProductLine[] = rawLines.map((row) => {
    const variantId = str(row.product_variant_id);
    const variant = variantById.get(variantId);
    const plantId = variant?.plant_id ? str(variant.plant_id) : null;
    const owners = mapLineOwners(strOrNull(row.from_owner_id), strOrNull(row.to_owner_id));
    return {
      id: str(row.id),
      documentId: str(row.document_id),
      productVariantId: variantId,
      quantity: Number(row.quantity),
      fromOwnerId: owners.fromOwnerId,
      toOwnerId: owners.toOwnerId,
      variantName: str(row.variant_name),
      unitPrice: row.unit_price == null ? null : Number(row.unit_price),
      currencyId: strOrNull(row.currency_id),
      productId: variantId,
      productName: str(row.variant_name),
      productUnit: variant ? str(variant.unit ?? "шт") : "шт",
      plantId,
      plantName: plantId ? plantName.get(plantId) ?? null : null,
      plantCode: plantId ? plantCode.get(plantId) ?? null : null,
      fromOwnerType: owners.fromOwnerType,
      toOwnerType: owners.toOwnerType,
    };
  });

  const linesByKind = (kind: string) =>
    documentProductLines.filter((line) => kindByDocumentId.get(line.documentId) === kind);

  const customerOrderLines: CustomerOrderLine[] = linesByKind("customer_order").map((line) => ({
    id: line.id,
    orderId: line.documentId,
    productId: line.productId,
    quantity: line.quantity,
    productName: line.productName,
    productUnit: line.productUnit,
    plantId: line.plantId,
    plantName: line.plantName,
    plantCode: line.plantCode,
  }));

  const productionOrderLines: ProductionOrderLine[] = linesByKind("production_order").map((line) => ({
    id: line.id,
    orderId: line.documentId,
    productId: line.productId,
    quantity: line.quantity,
    productName: line.productName,
    productUnit: line.productUnit,
    plantId: line.plantId,
    plantName: line.plantName,
    plantCode: line.plantCode,
  }));

  const reservationLines: ReservationLine[] = linesByKind("reservation").map((line) => ({
    id: line.id,
    reservationId: line.documentId,
    productId: line.productId,
    quantity: line.quantity,
    fromOwnerId: line.fromOwnerId,
    fromOwnerType: line.fromOwnerType,
    productName: line.productName,
    productUnit: line.productUnit,
  }));

  const transferLines: TransferLine[] = [];
  const transferAllocations: TransferAllocation[] = [];
  for (const line of linesByKind("transfer")) {
    transferLines.push({
      id: line.id,
      transferId: line.documentId,
      productId: line.productId,
      quantity: line.quantity,
      productName: line.productName,
      productUnit: line.productUnit,
    });
    if (line.fromOwnerType && line.fromOwnerId) {
      const proj = resolveOwnerProjection(line.fromOwnerId);
      if (proj.ownerType && proj.ownerId) {
        transferAllocations.push({
          id: line.id,
          lineId: line.id,
          ownerType: proj.ownerType,
          ownerId: proj.ownerId,
          quantity: line.quantity,
        });
      }
    }
  }

  const shipmentLines: ShipmentLine[] = linesByKind("shipment").map((line) => ({
    id: line.id,
    shipmentId: line.documentId,
    productId: line.productId,
    quantity: line.quantity,
    toOwnerId: line.toOwnerId,
    fromOwnerId: line.fromOwnerId,
    toOwnerType: line.toOwnerType,
    fromOwnerType: line.fromOwnerType,
    productName: line.productName,
    productUnit: line.productUnit,
  }));

  const outputLines: ProductionOutputLine[] = linesByKind("production_output").map((line) => {
    const to = resolveOwnerProjection(line.toOwnerId);
    return {
      id: line.id,
      outputId: line.documentId,
      productionOrderLineId: "",
      productId: line.productId,
      quantity: line.quantity,
      productName: line.productName,
      productUnit: line.productUnit,
      toOwnerId: to.ownerId,
      toOwnerType: to.ownerType,
    };
  });

  const outputAllocations: ProductionOutputAllocation[] = [];

  const adjustmentLines: StockAdjustmentLine[] = linesByKind("adjustment").map((line) => ({
    id: line.id,
    adjustmentId: line.documentId,
    productId: line.productId,
    quantity: line.quantity,
    productName: line.productName,
    productUnit: line.productUnit,
  }));

  for (const adj of adjustments) {
    const lines = adjustmentLines.filter((line) => line.adjustmentId === adj.id);
    const signs = new Set(lines.map((line) => Math.sign(line.quantity)));
    if (signs.size === 1 && signs.has(-1)) {
      adj.operation = "write_off";
    } else if (signs.size === 1 && signs.has(1)) {
      adj.operation = "increase";
    } else {
      adj.operation = "mixed";
    }
  }

  const docKindById = new Map([...docs.values()].map((doc) => [doc.id, doc.kind as DocumentKind]));

  const transactions: StockTransaction[] = transactionsRaw.map((row) => {
    const stockLocationId = str(row.location_id);
    const stockOwnerId = str(row.owner_id);
    const loc = locEntity.get(stockLocationId);
    const owner = resolveOwnerProjection(stockOwnerId);
    const locationType = loc?.kind ?? "warehouse";
    const documentId = str(row.document_id);
    const documentKind = docKindById.get(documentId) ?? "adjustment";
    const ownerKind = ownerEntity.get(stockOwnerId)?.kind ?? "free";
    return {
      id: str(row.id),
      createdAt: str(row.created_at),
      productVariantId: str(row.product_variant_id),
      productId: str(row.product_variant_id),
      quantity: Number(row.quantity),
      stockLocationId,
      stockOwnerId,
      documentId,
      documentKind,
      locationType,
      locationId: loc?.entityId ?? stockLocationId,
      ownerKind,
      stockState: derivedStockState(locationType, ownerKind),
      assignedToType: owner.ownerType,
      assignedToId: owner.ownerId,
      documentType: documentKind,
      ownerType: owner.ownerType,
      ownerId: owner.ownerId,
    };
  });

  const snapshot: LogisticsSnapshot = {
    products: logisticsProducts,
    plants: logisticsPlants,
    warehouses: logisticsWarehouses,
    regions: logisticsRegions,
    stockLocations: stockLocationList,
    stockOwners: stockOwnerList,
    freeOwnerId: FREE_OWNER_ID,
    settings,
    documentProductLines,
    customerOrders,
    customerOrderLines,
    productionOrders,
    productionOrderLines,
    reservations,
    reservationLines,
    transfers,
    transferLines,
    transferAllocations,
    shipments,
    shipmentLines,
    outputs,
    outputLines,
    outputAllocations,
    adjustments,
    adjustmentLines,
    transactions,
    users,
    documentHistory,
  };

  const balances =
    payload.balances != null ? payload.balances.map(mapBalanceRow) : null;

  return {
    snapshot,
    balances,
    found: payload.found !== false,
  };
};

const mapListProducts = (raw: unknown): LogisticsListProductLine[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      productId: str(row.productId ?? row.product_variant_id ?? ""),
      quantity: Number(row.quantity ?? 0),
      productName: strOrNull(row.productName ?? row.variant_name),
      productUnit: strOrNull(row.productUnit ?? row.unit) ?? "шт",
    };
  });
};

const loadListRpc = async <T>(name: string, map: (row: Record<string, unknown>) => T): Promise<T[]> => {
  const data = await rpcJson<unknown>(name, {});
  if (!Array.isArray(data)) {
    return [];
  }
  return data.map((item) => map(item as Record<string, unknown>));
};

export const mapCustomerOrderListRow = (row: Record<string, unknown>): CustomerOrderListRow => ({
  id: str(row.id),
  sequenceNumber: str(row.sequenceNumber),
  number: str(row.number),
  status: str(row.status) as CustomerOrderListRow["status"],
  expectedEndOn: dateOrNull(row.expectedEndOn),
  createdAt: str(row.createdAt),
  description: row.description ? str(row.description) : "",
  products: mapListProducts(row.products),
  ordered: Number(row.ordered ?? 0),
  reserved: Number(row.reserved ?? 0),
  shipped: Number(row.shipped ?? 0),
  openToReserve: Number(row.openToReserve ?? 0),
  createdBy: str(row.createdBy ?? ""),
});

export const loadCustomerOrderList = () =>
  loadListRpc<CustomerOrderListRow>("store_customer_order_list", mapCustomerOrderListRow);

export const loadProductionOrderList = () =>
  loadListRpc<ProductionOrderListRow>("store_production_order_list", (row) => ({
    id: str(row.id),
    sequenceNumber: str(row.sequenceNumber),
    number: str(row.number),
    status: str(row.status) as ProductionOrderListRow["status"],
    expectedEndOn: dateOrNull(row.expectedEndOn),
    createdAt: str(row.createdAt),
    plantId: str(row.plantId),
    products: mapListProducts(row.products),
    createdBy: str(row.createdBy ?? ""),
  }));

export const loadTransferList = () =>
  loadListRpc<TransferListRow>("store_transfer_list", (row) => ({
    id: str(row.id),
    sequenceNumber: str(row.sequenceNumber),
    number: str(row.number),
    status: str(row.status) as TransferListRow["status"],
    expectedEndOn: dateOrNull(row.expectedEndOn),
    createdAt: str(row.createdAt),
    fromWarehouseId: str(row.fromWarehouseId),
    toWarehouseId: str(row.toWarehouseId),
    products: mapListProducts(row.products),
    createdBy: str(row.createdBy ?? ""),
  }));

export const loadShipmentList = () =>
  loadListRpc<ShipmentListRow>("store_shipment_list", (row) => ({
    id: str(row.id),
    sequenceNumber: str(row.sequenceNumber),
    number: str(row.number),
    createdAt: str(row.createdAt),
    fromLocationType: str(row.fromLocationType),
    fromLocationId: str(row.fromLocationId),
    toLocationType: str(row.toLocationType),
    toLocationId: str(row.toLocationId),
    direction: str(row.direction) as ShipmentListRow["direction"],
    customerOrderId: str(row.customerOrderId ?? ""),
    customerOrderNumber: str(row.customerOrderNumber ?? ""),
    products: mapListProducts(row.products),
    createdBy: str(row.createdBy ?? ""),
  }));

export const mapOutputListRow = (row: Record<string, unknown>): OutputListRow => ({
  id: str(row.id),
  sequenceNumber: str(row.sequenceNumber),
  number: str(row.number),
  status: str(row.status) as OutputListRow["status"],
  expectedEndOn: dateOrNull(row.expectedEndOn),
  createdAt: str(row.createdAt),
  productionOrderId: str(row.productionOrderId),
  productionOrderNumber: str(row.productionOrderNumber ?? ""),
  productionOrderSequenceNumber: str(row.productionOrderSequenceNumber ?? ""),
  plantId: str(row.plantId ?? ""),
  products: mapListProducts(row.products),
  createdBy: str(row.createdBy ?? ""),
});

export const loadOutputList = () => loadListRpc<OutputListRow>("store_output_list", mapOutputListRow);

export const loadAdjustmentList = () =>
  loadListRpc<AdjustmentListRow>("store_adjustment_list", (row) => ({
    id: str(row.id),
    sequenceNumber: str(row.sequenceNumber),
    number: str(row.number),
    createdAt: str(row.createdAt),
    description: row.description ? str(row.description) : "",
    warehouseId: str(row.warehouseId ?? ""),
    products: mapListProducts(row.products),
    signedQuantity: Number(row.signedQuantity ?? 0),
    operation: str(row.operation ?? "mixed") as AdjustmentListRow["operation"],
    createdBy: str(row.createdBy ?? ""),
  }));

const ownerTypeOrNull = (value: unknown): OwnerType | null =>
  value == null ? null : (str(value) as OwnerType);

export const loadReservationList = () =>
  loadListRpc<ReservationListRow>("store_reservation_list", (row) => {
    const lines = Array.isArray(row.lines)
      ? row.lines.map((item) => {
          const line = item as Record<string, unknown>;
          return {
            id: str(line.id),
            productId: str(line.productId),
            quantity: Number(line.quantity ?? 0),
            fromOwnerType: ownerTypeOrNull(line.fromOwnerType),
            fromOwnerId: strOrNull(line.fromOwnerId),
            fromOwnerNumber: strOrNull(line.fromOwnerNumber),
            productName: strOrNull(line.productName),
            productUnit: strOrNull(line.productUnit) ?? "шт",
          };
        })
      : [];
    const toOwnerType = ownerTypeOrNull(row.toOwnerType);
    const toOwnerId = strOrNull(row.toOwnerId);
    return {
      id: str(row.id),
      sequenceNumber: str(row.sequenceNumber),
      number: str(row.number),
      createdAt: str(row.createdAt),
      description: row.description ? str(row.description) : "",
      creationSource: str(row.creationSource ?? "manual"),
      locationType: str(row.locationType) as ReservationListRow["locationType"],
      locationId: str(row.locationId),
      locationNumber: strOrNull(row.locationNumber),
      locationSequence: strOrNull(row.locationSequence),
      locationIsPlantWarehouse: row.locationIsPlantWarehouse === true,
      toOwnerType,
      toOwnerId,
      toOwnerNumber: strOrNull(row.toOwnerNumber),
      lines,
      direction: reservationDirection({ toOwnerType, toOwnerId }, lines),
      createdBy: str(row.createdBy ?? ""),
    };
  });

const loadMappedRpc = async (name: string, args: Record<string, unknown>): Promise<MappedLogistics> => {
  const payload = await rpcJson<LogisticsPayload>(name, args);
  return mapLogisticsPayload(payload);
};

export const loadDocumentContext = (kind: string, ref: string) =>
  loadMappedRpc("store_document_context", { p_kind: kind, p_ref: ref });

export const loadPlaceContext = (kind: string, id: string) =>
  loadMappedRpc("store_place_context", { p_kind: kind, p_id: id });

export const loadProductContext = (variantId: string) =>
  loadMappedRpc("store_product_context", { p_variant_id: variantId });

export const loadFormContext = (form: string) =>
  loadMappedRpc("store_form_context", { p_form: form });

export const loadStockPage = () => loadMappedRpc("store_stock_page", {});

export const loadLedgerPage = () => loadMappedRpc("store_ledger_page", {});

export const loadCatalogPage = () => loadMappedRpc("store_catalog_page", {});

export const loadOutputCalendarPage = async () => {
  const data = await rpcJson<unknown>("store_output_calendar_page", {});
  return mapOutputCalendarPage(data);
};

export type ReservationLineInput = {
  productId: string;
  quantity: number;
  fromOwnerType?: OwnerType | null;
  fromOwnerId?: string | null;
};

const reservationRpcArgs = async (args: {
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const locationId = await resolveStockLocationId(args.locationType, args.locationId);
  const ownerId = await resolveOwnerId(args.toOwnerType ?? null, args.toOwnerId ?? null);
  const lines = await Promise.all(
    args.lines.map(async (line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
      from_owner_id: Number(await resolveOwnerId(line.fromOwnerType ?? null, line.fromOwnerId ?? null)),
    })),
  );
  return {
    p_location_id: Number(locationId),
    p_owner_id: Number(ownerId),
    p_description: args.note ?? "",
    p_creation_source: "manual",
    p_lines: lines,
  };
};

export const createAndPostReservation = async (args: {
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const created = await rpcJson<{ id: number | string }>(
    "store_create_and_post_reservation",
    await reservationRpcArgs(args),
  );
  return String(created.id);
};

export const completeOutput = (id: string) => rpc("store_complete_production_output", { p_id: id });

export const createAndPostShipment = async (
  input: ShipmentCreateAndPostInput,
): Promise<ShipmentCreateAndPostResult> => {
  const created = await rpcJson<{ id: number | string; direction: string }>(
    "store_create_and_post_shipment",
    await shipmentCreateRpcArgs(input),
  );
  if (created.direction !== "shipment" && created.direction !== "return") {
    throw new Error("Ожидался документ отгрузки или возврата");
  }
  return { id: String(created.id), direction: created.direction };
};

export type ProductionOutputLineInput = {
  productId: string;
  quantity: number;
  allocation?: {
    ownerType: OwnerType;
    ownerId: string;
    quantity: number;
  };
};

export const buildCreateProductionOutputRpcArgs = (args: {
  orderId: string;
  lines: ProductionOutputLineInput[];
  expectedEndOn?: string | null;
  complete?: boolean;
  /** Pre-resolved stock owner ids keyed by productId (optional; tests omit). */
  resolvedAllocationOwnerIds?: Record<string, number | null>;
}) => {
  for (const line of args.lines) {
    if (line.allocation && line.allocation.quantity > 0 && line.allocation.quantity > line.quantity) {
      throw new Error("Занятое количество не может превышать выпуск");
    }
  }
  return {
    p_production_order_id: Number(args.orderId),
    p_lines: args.lines.map((line) => {
      const allocQty = line.allocation?.quantity ?? 0;
      const ownerId =
        allocQty > 0
          ? (args.resolvedAllocationOwnerIds?.[line.productId] ?? Number(line.allocation!.ownerId))
          : null;
      return {
        product_variant_id: Number(line.productId),
        quantity: line.quantity,
        allocation_owner_id: ownerId,
        allocation_quantity: allocQty > 0 ? allocQty : 0,
      };
    }),
    p_expected_end_on: args.expectedEndOn || null,
    p_complete: args.complete !== false,
  };
};

export const createProductionOutput = async (args: {
  orderId: string;
  lines: ProductionOutputLineInput[];
  expectedEndOn?: string | null;
  complete?: boolean;
}): Promise<string> => {
  const resolved: Record<string, number | null> = {};
  for (const line of args.lines) {
    if (line.allocation?.quantity) {
      resolved[line.productId] = Number(
        await resolveOwnerId(line.allocation.ownerType, line.allocation.ownerId),
      );
    }
  }
  const created = await rpcJson<{ id: number | string }>(
    "store_create_production_output",
    buildCreateProductionOutputRpcArgs({ ...args, resolvedAllocationOwnerIds: resolved }),
  );
  return String(created.id);
};

export class ProductionForOrderOutputError extends Error {
  productionOrderId: string;
  sequenceNumber: string | null;
  constructor(productionOrderId: string, sequenceNumber: string | null, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : "Не удалось создать черновик выпуска";
    super(detail);
    this.name = "ProductionForOrderOutputError";
    this.productionOrderId = productionOrderId;
    this.sequenceNumber = sequenceNumber;
  }
}

export const createProductionForOrder = async (args: {
  plantId?: string;
  customerOrderId: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  const plantId = args.plantId;
  if (!plantId) {
    throw new Error("Нужен plantId");
  }
  const created = await createProductionOrder({
    plantId,
    expectedEndOn: args.expectedEndOn,
    lines: args.lines,
  });
  try {
    await createProductionOutput({
      orderId: String(created.id),
      expectedEndOn: args.expectedEndOn,
      complete: false,
      lines: args.lines.map((line) => ({
        productId: line.productId,
        quantity: line.quantity,
        allocation: {
          ownerType: "order",
          ownerId: args.customerOrderId,
          quantity: line.quantity,
        },
      })),
    });
  } catch (caught) {
    throw new ProductionForOrderOutputError(String(created.id), created.sequenceNumber, caught);
  }
  return created.id;
};

export const createProductionOrderWithDraftOutput = async (args: {
  plantId: string;
  productId: string;
  quantity: number;
  expectedEndOn: string | null;
}): Promise<{ productionOrderId: string; outputId: string; sequenceNumber: string | null }> => {
  const created = await createProductionOrder({
    plantId: args.plantId,
    expectedEndOn: args.expectedEndOn,
    lines: [{ productId: args.productId, quantity: args.quantity }],
  });
  try {
    const outputId = await createProductionOutput({
      orderId: created.id,
      expectedEndOn: args.expectedEndOn,
      complete: false,
      lines: [{ productId: args.productId, quantity: args.quantity }],
    });
    return {
      productionOrderId: created.id,
      outputId,
      sequenceNumber: created.sequenceNumber,
    };
  } catch (caught) {
    throw new ProductionForOrderOutputError(created.id, created.sequenceNumber, caught);
  }
};

export const reserveInProductionOutput = async (args: {
  outputId: string;
  ownerType: OwnerType;
  ownerId: string;
  lines: Array<{ productId: string; quantity: number }>;
}): Promise<void> => {
  const ownerStockId = await resolveOwnerId(args.ownerType, args.ownerId);
  await rpc("store_reserve_in_production_output", {
    p_output_id: Number(args.outputId),
    p_owner_id: Number(ownerStockId),
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });
};

export const releaseInProductionOutput = async (args: {
  outputId: string;
  ownerType: OwnerType;
  ownerId: string;
  lines: Array<{ productId: string; quantity: number }>;
}): Promise<void> => {
  const ownerStockId = await resolveOwnerId(args.ownerType, args.ownerId);
  await rpc("store_move_in_production_output", {
    p_output_id: Number(args.outputId),
    p_from_owner_id: Number(ownerStockId),
    p_to_owner_id: null,
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });
};

export type AdjustmentCreateResult = {
  id: string;
  status: "posted";
};

export const createAndPostAdjustment = async (
  draft: AdjustmentDraft,
  balances: StockBalance[],
): Promise<AdjustmentCreateResult> => {
  const explanation = assertAdjustmentExplanation(draft.explanation);
  const lines = assertAdjustmentLines(draft, balances);
  const locationId = await resolveStockLocationId("warehouse", draft.warehouseId);
  const { adjustmentSignedQuantity } = await import("@/features/logistics/logistics-adjustments");
  const created = await rpcJson<{ id: number | string }>("store_create_and_post_adjustment", {
    p_location_id: Number(locationId),
    p_description: explanation,
    p_lines: lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: adjustmentSignedQuantity(draft.operation, line.quantity),
    })),
  });
  return { id: String(created.id), status: "posted" };
};

export const createAndSendTransfer = async (
  input: TransferCreateAndSendInput,
): Promise<TransferCreateAndSendResult> => {
  const created = await rpcJson<{ id: number | string; status: string }>(
    "store_create_and_send_transfer",
    await transferCreateRpcArgs(input),
  );
  if (created.status !== "in_progress" && created.status !== "sent") {
    throw new Error(`Ожидалось перемещение in_progress, получено ${String(created.status)}`);
  }
  return { id: String(created.id), status: "sent" };
};

export const sendTransfer = (id: string) => rpc("store_send_transfer", { p_id: id });
export const completeTransfer = (id: string) => rpc("store_complete_transfer", { p_id: id });
export const closeCustomerOrder = (id: string) => rpc("store_close_customer_order", { p_id: id });

export const createCustomerOrder = async (args: {
  regionId?: string;
  description?: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  let regionId = args.regionId;
  if (!regionId) {
    const regions = await selectAll("store_region", "id", (r) => r, "id");
    if (!regions.length) {
      regionId = await createRegion({ name: "Основной" });
    } else {
      regionId = String(regions[0].id);
    }
  }
  const created = await rpcJson<{ id: number | string; lines: unknown }>("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: args.description ?? "",
    p_expected_end_on: args.expectedEndOn || null,
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });
  return { id: String(created.id), lines: created.lines };
};

export const closeProductionOrder = (id: string) => rpc("store_close_production_order", { p_id: id });
export const setProductionStatus = (id: string, status: ProductionStatus) => {
  const raw = String(status);
  const mapped = raw === "planned" ? "draft" : raw === "closed" ? "done" : raw;
  return rpc("store_set_production_status", { p_id: id, p_status: mapped });
};

export const createProductionOrder = async (args: {
  plantId?: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  const plantId = args.plantId;
  if (!plantId) throw new Error("Нужен plantId");
  const created = await rpcJson<{
    id: number | string;
    lines: unknown;
    sequence_number?: number | string | null;
  }>("store_create_production_order", {
    p_plant_id: Number(plantId),
    p_expected_end_on: args.expectedEndOn || null,
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });
  return {
    id: String(created.id),
    lines: created.lines,
    sequenceNumber:
      created.sequence_number == null || created.sequence_number === ""
        ? null
        : String(created.sequence_number),
  };
};

export const addProductionLine = (args: { orderId: string; productId: string; quantity: number }) =>
  rpc("store_add_production_line", {
    p_id: Number(args.orderId),
    p_product_variant_id: Number(args.productId),
    p_quantity: args.quantity,
  });

export const syncProductionStock = async (_id: string) => "ok";

export const cancelDocument = (kind: string, id: string, status?: string | null) => {
  const normalized = kind === "output" ? "production_output" : kind;
  assertDocumentCanBeCancelled(normalized, status);
  return rpc("store_cancel_document", { p_kind: normalized, p_id: id });
};

export const updateExpectedEnd = (documentId: string, expectedEndOn: string | null) =>
  rpc("store_update_expected_end", {
    p_id: Number(documentId),
    p_expected_end_on: expectedEndOn || null,
  });

/** @deprecated Direct table writes removed — use RPCs. */
export const insertRows = async () => {
  throw new Error("Прямая запись в таблицы Store запрещена");
};
export const updateRow = async () => {
  throw new Error("Прямая запись в таблицы Store запрещена");
};
export const deleteRows = async () => {
  throw new Error("Прямое удаление в таблицах Store запрещено");
};
export const insertReturningId = async () => {
  throw new Error("Прямая запись в таблицы Store запрещена");
};

export const createProduct = async (args: { name: string; unit: string; plantId?: string }) => {
  const created = await rpcJson<{ product_id: number; variant_id: number }>("store_create_product_variant", {
    p_name: args.name,
    p_unit: args.unit,
    p_plant_id: args.plantId ? Number(args.plantId) : null,
    p_image_url: null,
    p_product_id: null,
  });
  return String(created.variant_id);
};

export const createWarehouse = (args: { name: string }) =>
  rpcJson<number | string>("store_create_warehouse", { p_name: args.name }).then(String);

export const updateWarehouse = (args: { id: string; name: string }) =>
  rpc("store_update_warehouse", { p_id: Number(args.id), p_name: args.name });

export const createRegion = (args: { name: string }) =>
  rpcJson<number | string>("store_create_region", { p_name: args.name, p_code: null }).then(String);

export const updateRegion = (args: { id: string; name: string }) =>
  rpc("store_update_region", { p_id: Number(args.id), p_name: args.name });

export const createPlant = (args: { name: string }) =>
  rpcJson<number | string>("store_create_plant", { p_name: args.name }).then(String);

export const updatePlant = (args: { id: string; name: string }) =>
  rpc("store_update_plant", { p_id: Number(args.id), p_name: args.name });

export { isSupabaseConfigured };
export { resolveOwnerId, resolveStockLocationId } from "@/features/logistics/logistics-resolve";
