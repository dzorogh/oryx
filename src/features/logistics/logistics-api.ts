import type {
  AppUser,
  CustomerOrder,
  CustomerOrderLine,
  DocumentHistoryEntry,
  DocumentKind,
  DocumentProductLine,
  LogisticsPlant,
  LogisticsCategory,
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
import {
  DOCUMENT_FILE_BUCKET,
  mapCustomerOrderOmsContext,
  type CustomerOrderOmsContext,
} from "@/features/logistics/customer-order-oms";
import {
  mapOrderMoneyContext,
  type OrderCurrency,
  type OrderMoneyContext,
  type OrderRates,
  type PaymentStatus,
} from "@/features/logistics/order-money";
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
import { richTextToPlain } from "@/features/logistics/rich-text-plain";
import {
  derivedStockState,
  documentNumber,
  FREE_OWNER_ID,
  ownerKindToType,
  reservationDirection,
  STORE_CURRENT_USER_ID,
} from "@/features/logistics/logistics-types";
import {
  entityCodePrefixesFromRows,
  formatEntityCode,
  getActiveEntityCodePrefixes,
  setActiveEntityCodePrefixes,
  storedEntityCode,
} from "@/lib/entity-codes";
import {
  ensureEntityCodePrefixes,
  loadEntityCodePrefixes,
} from "@/lib/entity-codes-api";
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

export const loadLogisticsSettings = async (): Promise<LogisticsSetting> => {
  const codePrefixes = await loadEntityCodePrefixes();
  return { id: "1", codePrefixes };
};

type SnapshotRow = Record<string, unknown>;

export type LogisticsPayload = {
  code_prefixes?: SnapshotRow[];
  documents?: SnapshotRow[];
  product_variants?: SnapshotRow[];
  categories?: SnapshotRow[];
  dealer_prices?: SnapshotRow[];
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
  order_plan?: unknown;
  order_money?: unknown;
  order_payments?: unknown;
  currencies?: unknown;
  tenants?: unknown;
  variant_logistics?: unknown;
  container_types?: unknown;
  transfer_money?: unknown;
  order_payment_events?: unknown;
  document_files?: unknown;
  found?: boolean;
};

export type MappedLogistics = {
  snapshot: LogisticsSnapshot;
  /** When present, prefer over computeStockBalances(transactions). */
  balances: StockBalance[] | null;
  /** Raw `order_plan` of a customer order context; map with `mapOrderPlanPayload`. */
  orderPlan: unknown;
  /** Money of a production order or customer order context; `money` is null for other documents. */
  orderMoney: OrderMoneyContext;
  /** Tenants, packing, delivery money, payment events and files of a customer order context. */
  orderOms: CustomerOrderOmsContext;
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
 * When the payload has `code_prefixes`, also updates the active entity code prefixes.
 */
export const mapLogisticsPayload = (payload: LogisticsPayload): MappedLogistics => {
  const {
    documents = [],
    product_variants: variants = [],
    categories: categoriesRaw = [],
    dealer_prices: dealerPricesRaw = [],
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

  if (payload.code_prefixes !== undefined) {
    setActiveEntityCodePrefixes(
      entityCodePrefixesFromRows(
        payload.code_prefixes.map((row) => ({
          entity: str(row.entity),
          number_prefix: str(row.number_prefix),
        })),
      ),
    );
  }
  const codePrefixes = getActiveEntityCodePrefixes();
  const settings: LogisticsSetting = { id: "1", codePrefixes };
  const documentPrefix = (kind: string): string =>
    (codePrefixes as Partial<Record<string, string>>)[kind] ?? kind.toUpperCase();

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
      number_prefix: documentPrefix(kind),
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
      code: formatEntityCode("plant", id),
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
      code: formatEntityCode("warehouse", id),
      name: str(row.name),
      stockLocationId: str(row.stock_location_id),
      kind:
        row.kind === "plant" || row.kind === "hub" || row.kind === "customer"
          ? row.kind
          : plantByWarehouse.has(id)
            ? "plant"
            : "customer",
      plantId: plantByWarehouse.get(id) ?? null,
    };
  });

  const logisticsRegions: LogisticsRegion[] = regions.map((row) => {
    const id = str(row.id);
    return {
      id,
      code: storedEntityCode("region", row.code, id),
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
  for (const row of outputsRaw) {
    if (row.stock_location_id != null) {
      locEntity.set(str(row.stock_location_id), { kind: "production_output", entityId: str(row.id) });
    }
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
  const categoryIdsOf = (value: unknown): string[] =>
    Array.isArray(value) ? value.map((id) => str(id)) : [];
  const logisticsCategories: LogisticsCategory[] = categoriesRaw.map((row) => ({
    id: str(row.id),
    parentId: strOrNull(row.parent_id ?? row.parentId),
    name: str(row.name ?? ""),
  }));
  const logisticsProducts: LogisticsProduct[] = variants.map((row) => {
    const id = str(row.id);
    return {
      id,
      productId: str(row.product_id),
      code: formatEntityCode("product", id),
      name: str(row.name),
      unit: str(row.unit ?? "шт"),
      imageUrl: preferKorportalMediaConversion(row.image_url ? str(row.image_url) : null),
      plantId: strOrNull(row.plant_id),
      categoryIds: categoryIdsOf(row.category_ids ?? row.categoryIds),
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
      sourceKind: row.source_kind === "plant" || row.source_kind === "hub" ? row.source_kind : null,
      sourcePlantId: strOrNull(row.source_plant_id),
      sourceWarehouseId: strOrNull(row.source_warehouse_id),
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
      stockLocationId: row.stock_location_id == null ? undefined : str(row.stock_location_id),
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
    categories: logisticsCategories,
    products: logisticsProducts,
    dealerPrices: dealerPricesRaw.map((row) => ({
      productId: str(row.product_variant_id),
      regionId: strOrNull(row.region_id),
      amount: Number(row.amount),
      currencyId: strOrNull(row.currency_id),
      currencyCode: strOrNull(row.currency_code),
    })),
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
    orderPlan: payload.order_plan ?? null,
    orderMoney: mapOrderMoneyContext(payload),
    orderOms: mapCustomerOrderOmsContext(payload),
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
  const [data] = await Promise.all([rpcJson<unknown>(name, {}), ensureEntityCodePrefixes()]);
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
    description: richTextToPlain(row.description ? str(row.description) : ""),
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
  const [payload] = await Promise.all([rpcJson<LogisticsPayload>(name, args), ensureEntityCodePrefixes()]);
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
  const [data] = await Promise.all([
    rpcJson<unknown>("store_output_calendar_page", {}),
    ensureEntityCodePrefixes(),
  ]);
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
    const detail = cause instanceof Error ? cause.message : "Не удалось создать запланированный выпуск";
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
    const outputId = await createProductionOutput({
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
    return {
      productionOrderId: String(created.id),
      outputId,
      sequenceNumber: created.sequenceNumber,
    };
  } catch (caught) {
    throw new ProductionForOrderOutputError(String(created.id), created.sequenceNumber, caught);
  }
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
  sourceKind?: "plant" | "hub" | null;
  sourceId?: string | null;
  lines: Array<{ productId: string; quantity: number; unitPrice?: number | null }>;
  /** floatrates rates; null — the RPC snapshots `store_currency.rate`. */
  rates?: OrderRates | null;
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
      unit_price: line.unitPrice ?? null,
    })),
    p_source_kind: args.sourceKind ?? null,
    p_source_id: args.sourceId ? Number(args.sourceId) : null,
    p_rates: args.rates ?? null,
  });
  return { id: String(created.id), lines: created.lines };
};

export const addCustomerOrderLines = async (args: {
  orderId: string;
  lines: Array<{ productId: string; quantity: number; unitPrice?: number | null }>;
}) =>
  rpc("store_add_customer_order_lines", {
    p_id: Number(args.orderId),
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
      unit_price: line.unitPrice ?? null,
    })),
  });

export const addDraftOutputLines = async (args: {
  outputId: string;
  lines: Array<{ productId: string; quantity: number }>;
}) =>
  rpcJson<{ lines?: Array<number | string> }>("store_add_draft_output_lines", {
    p_output_id: Number(args.outputId),
    p_lines: args.lines.map((line) => ({
      product_variant_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });

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
  /** floatrates rates; null — the RPC snapshots `store_currency.rate`. */
  rates?: OrderRates | null;
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
    p_rates: args.rates ?? null,
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

export const setOrderLineQuantity = (args: {
  documentId: string;
  productId: string;
  quantity: number;
}) =>
  rpc("store_set_order_line_quantity", {
    p_document_id: Number(args.documentId),
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

export const setOrderCurrency = (documentId: string, currencyCode: string) =>
  rpc("store_set_order_currency", { p_document_id: Number(documentId), p_currency_code: currencyCode });

export const setOrderAmount = (documentId: string, amount: number | null) =>
  rpc("store_set_order_amount", { p_document_id: Number(documentId), p_amount: amount });

export const setOrderRates = (documentId: string, rates: OrderRates) =>
  rpc("store_set_order_rates", { p_document_id: Number(documentId), p_rates: rates });

export const saveOrderPayment = (args: {
  documentId: string;
  paymentId?: string | null;
  dueOn: string;
  amount: number;
  status: PaymentStatus;
}) =>
  rpcJson<number | string>("store_save_order_payment", {
    p_document_id: Number(args.documentId),
    p_due_on: args.dueOn,
    p_amount: args.amount,
    p_status: args.status,
    p_payment_id: args.paymentId ? Number(args.paymentId) : null,
  }).then(String);

export const deleteOrderPayment = (paymentId: string) =>
  rpc("store_delete_order_payment", { p_payment_id: Number(paymentId) });

export const copyCustomerOrder = async (orderId: string) => {
  const created = await rpcJson<{ id: number | string; sequence_number: number | string }>(
    "store_copy_customer_order",
    { p_id: Number(orderId) },
  );
  return { id: String(created.id), sequenceNumber: String(created.sequence_number) };
};

export const setDocumentDescription = (documentId: string, description: string) =>
  rpc("store_set_document_description", { p_document_id: Number(documentId), p_description: description });

export type StoreTenantRow = { id: string; name: string; regionId: string | null; sortOrder: number };
export type StoreRegionOption = { id: string; code: string; name: string };

/** Settings → Тенанты: tenants and live regions (anon SELECT). */
export const loadTenantSettings = async (): Promise<{ tenants: StoreTenantRow[]; regions: StoreRegionOption[] }> => {
  const client = requireClient();
  const [tenants, regions] = await Promise.all([
    client.from("store_tenant").select("id,name,region_id,sort_order").order("sort_order", { ascending: true }),
    client.from("store_region").select("id,code,name").is("deleted_at", null).order("sort_order", { ascending: true }),
  ]);
  return {
    tenants: requireData(tenants.data, tenants.error).map((row) => ({
      id: str(row.id),
      name: str(row.name),
      regionId: strOrNull(row.region_id),
      sortOrder: Number(row.sort_order ?? 0),
    })),
    regions: requireData(regions.data, regions.error).map((row) => ({
      id: str(row.id),
      code: storedEntityCode("region", row.code, str(row.id)),
      name: str(row.name),
    })),
  };
};

export const setTenantRegion = (tenantId: string, regionId: string | null) =>
  rpc("store_set_tenant_region", { p_tenant_id: tenantId, p_region_id: regionId ? Number(regionId) : null });

/** Uploads to the `store-documents` bucket, then records metadata; removes the object if the record fails. */
export const uploadDocumentFile = async (args: { documentId: string; file: File; storagePath: string }) => {
  const client = requireClient();
  const bucket = client.storage.from(DOCUMENT_FILE_BUCKET);
  const { error } = await bucket.upload(args.storagePath, args.file, {
    contentType: args.file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) {
    throw new Error(error.message);
  }
  try {
    return await rpcJson<number | string>("store_add_document_file", {
      p_document_id: Number(args.documentId),
      p_storage_path: args.storagePath,
      p_name: args.file.name,
      p_size_bytes: args.file.size,
      p_mime_type: args.file.type || "",
    }).then(String);
  } catch (caught) {
    await bucket.remove([args.storagePath]);
    throw caught;
  }
};

/** Deletes the record first (the file disappears from the card), then the object. */
export const deleteDocumentFile = async (fileId: string) => {
  const client = requireClient();
  const path = await rpc("store_delete_document_file", { p_file_id: Number(fileId) });
  await client.storage.from(DOCUMENT_FILE_BUCKET).remove([path]);
};

/** Short-lived signed URL that downloads the object under its original name. */
export const documentFileDownloadUrl = async (storagePath: string, name: string) => {
  const client = requireClient();
  const { data, error } = await client.storage
    .from(DOCUMENT_FILE_BUCKET)
    .createSignedUrl(storagePath, 60, { download: name });
  if (error || !data) {
    throw new Error(error?.message ?? "Не удалось получить ссылку на файл");
  }
  return data.signedUrl;
};

export type StoreMoneySettings = {
  productionCurrencyCode: string | null;
  currencies: OrderCurrency[];
};

export const loadStoreMoneySettings = async (): Promise<StoreMoneySettings> => {
  const client = requireClient();
  const [currencies, setting] = await Promise.all([
    client.from("store_currency").select("id,code,name").is("deleted_at", null).order("code", { ascending: true }),
    client.from("store_setting").select("production_currency_id").maybeSingle(),
  ]);
  const rows = requireData(currencies.data, currencies.error).map((row) => ({
    id: str(row.id),
    code: str(row.code),
    name: str(row.name),
  }));
  if (setting.error) {
    throw new Error(setting.error.message);
  }
  const currencyId = setting.data?.production_currency_id;
  return {
    productionCurrencyCode: rows.find((row) => row.id === String(currencyId ?? ""))?.code ?? null,
    currencies: rows,
  };
};

export const saveProductionCurrency = (currencyCode: string) =>
  rpc("store_set_production_currency", { p_currency_code: currencyCode });

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

export const createProductVariant = async (args: {
  name: string;
  productId: string;
  unit?: string;
  plantId?: string | null;
  imageUrl?: string | null;
}) => {
  const created = await rpcJson<{ product_id: number; variant_id: number }>("store_create_product_variant", {
    p_name: args.name,
    p_unit: args.unit ?? "шт",
    p_plant_id: args.plantId ? Number(args.plantId) : null,
    p_image_url: args.imageUrl ?? null,
    p_product_id: Number(args.productId),
  });
  return { productId: String(created.product_id), variantId: String(created.variant_id) };
};

export const createWarehouse = (args: { name: string; kind?: "hub" | "customer" }) =>
  rpcJson<number | string>("store_create_warehouse", {
    p_name: args.name,
    p_kind: args.kind ?? "customer",
  }).then(String);

export const updateWarehouse = (args: { id: string; name: string; kind?: "hub" | "customer" | "plant" }) =>
  rpc("store_update_warehouse", {
    p_id: Number(args.id),
    p_name: args.name,
    p_kind: args.kind ?? null,
  });

export const createRegion = (args: { name: string }) =>
  rpcJson<number | string>("store_create_region", { p_name: args.name, p_code: null }).then(String);

export const updateRegion = (args: {
  id: string;
  name: string;
  hubWarehouseId?: string | null;
  orderCurrencyId?: string | null;
}) =>
  rpc("store_update_region", {
    p_id: Number(args.id),
    p_name: args.name,
    p_hub_warehouse_id: args.hubWarehouseId == null || args.hubWarehouseId === "" ? null : Number(args.hubWarehouseId),
    p_order_currency_id:
      args.orderCurrencyId == null || args.orderCurrencyId === "" ? null : Number(args.orderCurrencyId),
  });

export const createPlant = (args: { name: string }) =>
  rpcJson<number | string>("store_create_plant", { p_name: args.name }).then(String);

export const updatePlant = (args: { id: string; name: string }) =>
  rpc("store_update_plant", { p_id: Number(args.id), p_name: args.name });

export { isSupabaseConfigured };
export { resolveOwnerId, resolveStockLocationId } from "@/features/logistics/logistics-resolve";
