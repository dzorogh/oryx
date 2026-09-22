import type {
  AdjustmentOperation,
  AdjustmentStatus,
  CustomerOrder,
  CustomerOrderLine,
  DocumentHistoryEntry,
  DocumentProductLine,
  DocumentProductLineRegionSnapshot,
  DocumentType,
  HistoryDocumentType,
  LogisticsManufacturer,
  LogisticsProduct,
  LogisticsRegion,
  LogisticsSetting,
  LogisticsSnapshot,
  LogisticsWarehouse,
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
  ReservationStatus,
  Shipment,
  ShipmentLine,
  StockAdjustment,
  StockAdjustmentLine,
  StockBalance,
  StockTransaction,
  StoreUser,
  Transfer,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";
import {
  assertAdjustmentExplanation,
  assertAdjustmentLines,
  type AdjustmentDraft,
} from "@/features/logistics/logistics-adjustments";
import {
  derivedStockState,
  documentNumber,
  isFreeOwner,
  STORE_CURRENT_USER_ID,
} from "@/features/logistics/logistics-types";
import {
  formatLogisticsCode,
  mergeLogisticsCodePrefixes,
  setActiveLogisticsCodePrefixes,
  type LogisticsCodePrefixes,
} from "@/features/logistics/logistics-codes";
import { assertDocumentCanBeCancelled } from "@/features/logistics/logistics-rules";
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

const mapProduct = (row: Record<string, unknown>): LogisticsProduct => {
  const id = String(row.id);
  return {
    id,
    code: formatLogisticsCode("product", id),
    sku: String(row.sku),
    name: String(row.name),
    unit: String(row.unit),
    imageUrl: preferKorportalMediaConversion(row.image_url ? String(row.image_url) : null),
    manufacturerId: row.manufacturer_id ? String(row.manufacturer_id) : null,
  };
};

const mapWarehouse = (row: Record<string, unknown>): LogisticsWarehouse => {
  const id = String(row.id);
  return {
    id,
    code: formatLogisticsCode("warehouse", id),
    name: String(row.name),
    manufacturerId: row.manufacturer_id ? String(row.manufacturer_id) : null,
  };
};

const mapManufacturer = (row: Record<string, unknown>): LogisticsManufacturer => {
  const id = String(row.id);
  return {
    id,
    code: formatLogisticsCode("manufacturer", id),
    name: String(row.name),
    warehouseId: String(row.warehouse_id),
  };
};

const mapOwnerType = (value: unknown): OwnerType | null => {
  if (value === "order" || value === "region") {
    return value;
  }
  return null;
};

const mapOwnerId = (value: unknown): string | null => (value == null || value === "" ? null : String(value));

const mapRegion = (row: Record<string, unknown>): LogisticsRegion => {
  const id = String(row.id);
  return {
    id,
    code: formatLogisticsCode("region", id),
    name: String(row.name),
  };
};

const mapSetting = (row: Record<string, unknown>): LogisticsSetting => ({
  id: String(row.id),
  codePrefixes: mergeLogisticsCodePrefixes(
    row.code_prefixes && typeof row.code_prefixes === "object" && !Array.isArray(row.code_prefixes)
      ? (row.code_prefixes as Record<string, unknown>)
      : null,
  ),
});

const dateOrNull = (value: unknown): string | null => (value ? String(value) : null);

type DocRegistryRow = {
  id: string;
  kind: string;
  series: string;
  sequence_number: string | number;
  created_at: string;
  created_by: string | number | null;
};

const attachDoc = (
  docs: Map<string, DocRegistryRow>,
  row: { id: string },
  kind: string,
): DocRegistryRow => {
  const doc = docs.get(String(row.id));
  if (!doc) {
    throw new Error(`store_document missing for ${kind} ${row.id}`);
  }
  return doc;
};

const mapCustomerOrder = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): CustomerOrder => {
  const doc = attachDoc(docs, { id: String(row.id) }, "customer_order");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    status: row.status as CustomerOrder["status"],
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
    expectedEndOn: dateOrNull(row.expected_end_on),
    description: row.description ? String(row.description) : "",
  };
};

const mapProductionOrder = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): ProductionOrder => {
  const doc = attachDoc(docs, { id: String(row.id) }, "production_order");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    manufacturerId: String(row.manufacturer_id),
    status: row.status as ProductionOrder["status"],
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapReservation = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): Reservation => {
  const doc = attachDoc(docs, { id: String(row.id) }, "reservation");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    locationType: row.location_type as ReservationLocationType,
    locationId: String(row.location_id),
    toOwnerType: mapOwnerType(row.to_owner_type),
    toOwnerId: mapOwnerId(row.to_owner_id),
    status: row.status as ReservationStatus,
    origin: row.origin as Reservation["origin"],
    note: row.note ? String(row.note) : "",
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
  };
};

const mapTransfer = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): Transfer => {
  const doc = attachDoc(docs, { id: String(row.id) }, "transfer");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    fromWarehouseId: String(row.from_warehouse_id),
    toWarehouseId: String(row.to_warehouse_id),
    status: row.status as Transfer["status"],
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapShipment = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): Shipment => {
  const doc = attachDoc(docs, { id: String(row.id) }, "shipment");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    customerOrderId: String(row.customer_order_id),
    fromLocationType: row.from_location_type as Shipment["fromLocationType"],
    fromLocationId: String(row.from_location_id),
    toLocationType: row.to_location_type as Shipment["toLocationType"],
    toLocationId: String(row.to_location_id),
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
  };
};

const mapOutput = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): ProductionOutput => {
  const doc = attachDoc(docs, { id: String(row.id) }, "output");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    productionOrderId: String(row.production_order_id),
    status: row.status as ProductionOutput["status"],
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapAdjustment = (docs: Map<string, DocRegistryRow>, row: Record<string, unknown>): StockAdjustment => {
  const doc = attachDoc(docs, { id: String(row.id) }, "adjustment");
  return {
    id: doc.id,
    series: doc.series,
    sequenceNumber: String(doc.sequence_number),
    number: documentNumber(doc.series, doc.sequence_number),
    operation: row.operation as AdjustmentOperation,
    warehouseId: String(row.warehouse_id),
    explanation: row.explanation == null ? "" : String(row.explanation),
    sourceDocumentType: (row.source_document_type as DocumentType | null) ?? null,
    sourceDocumentId: row.source_document_id ? String(row.source_document_id) : null,
    status: row.status as AdjustmentStatus,
    createdAt: String(doc.created_at),
    createdBy: doc.created_by ? String(doc.created_by) : STORE_CURRENT_USER_ID,
  };
};

const mapRegionSnapshot = (row: Record<string, unknown>): DocumentProductLineRegionSnapshot => ({
  id: String(row.id),
  lineId: String(row.line_id),
  regionId: row.region_id == null ? null : String(row.region_id),
  regionCode: String(row.region_code),
  regionName: String(row.region_name),
  purchasePrice: row.purchase_price == null ? null : Number(row.purchase_price),
  purchaseCurrency: row.purchase_currency == null ? null : String(row.purchase_currency),
  dealerPrice: row.dealer_price == null ? null : Number(row.dealer_price),
  dealerCurrency: row.dealer_currency == null ? null : String(row.dealer_currency),
  retailPrice: row.retail_price == null ? null : Number(row.retail_price),
  retailCurrency: row.retail_currency == null ? null : String(row.retail_currency),
  dealerStatus: row.dealer_status == null ? null : String(row.dealer_status),
  retailStatus: row.retail_status == null ? null : String(row.retail_status),
});

const mapDocumentProductLine = (
  row: Record<string, unknown>,
  snapshotsByLine: Map<string, DocumentProductLineRegionSnapshot[]>,
): DocumentProductLine => {
  const id = String(row.id);
  return {
    id,
    documentId: String(row.document_id),
    productId: row.product_id == null ? null : String(row.product_id),
    manufacturerId: row.manufacturer_id == null ? null : String(row.manufacturer_id),
    quantity: Number(row.quantity),
    fromOwnerType: mapOwnerType(row.from_owner_type),
    fromOwnerId: mapOwnerId(row.from_owner_id),
    toOwnerType: mapOwnerType(row.to_owner_type),
    toOwnerId: mapOwnerId(row.to_owner_id),
    productName: String(row.product_name),
    productSku: String(row.product_sku),
    productUnit: String(row.product_unit),
    variant: row.variant == null ? null : String(row.variant),
    manufacturerName: row.manufacturer_name == null ? null : String(row.manufacturer_name),
    manufacturerCode: row.manufacturer_code == null ? null : String(row.manufacturer_code),
    regionSnapshots: snapshotsByLine.get(id) ?? [],
  };
};

const mapTransaction = (row: Record<string, unknown>): StockTransaction => {
  const locationType = row.location_type as StockTransaction["locationType"];
  const assignedToType = mapOwnerType(row.assigned_to_type);
  const assignedToId = mapOwnerId(row.assigned_to_id);
  return {
    id: String(row.id),
    createdAt: String(row.created_at),
    productId: String(row.product_id),
    quantity: Number(row.quantity),
    locationType,
    locationId: String(row.location_id),
    assignedToType,
    assignedToId,
    documentType: row.document_type as DocumentType,
    documentId: String(row.document_id),
    stockState: derivedStockState(locationType, assignedToType, assignedToId),
    ownerType: assignedToType,
    ownerId: assignedToId,
  };
};

const mapUser = (row: Record<string, unknown>): StoreUser => ({
  id: String(row.id),
  name: String(row.name),
});

const mapDocumentHistory = (row: Record<string, unknown>): DocumentHistoryEntry => ({
  id: String(row.id),
  documentType: row.document_type as HistoryDocumentType,
  documentId: String(row.document_id),
  eventType: row.event_type as DocumentHistoryEntry["eventType"],
  status: String(row.status),
  expectedEndOn: dateOrNull(row.expected_end_on),
  createdAt: String(row.created_at),
  createdBy: String(row.created_by),
});

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

const DEFAULT_SETTING: LogisticsSetting = {
  id: "1",
  codePrefixes: mergeLogisticsCodePrefixes(),
};

export const loadLogisticsSettings = async (): Promise<LogisticsSetting> => {
  const rows = await selectAll(
    "store_setting",
    "id,code_prefixes",
    mapSetting,
    "id",
  );
  const settings = rows[0] ?? DEFAULT_SETTING;
  setActiveLogisticsCodePrefixes(settings.codePrefixes);
  return settings;
};

export const saveLogisticsCodePrefixes = async (
  prefixes: LogisticsCodePrefixes,
): Promise<LogisticsSetting> => {
  const current = await loadLogisticsSettings();
  const next = mergeLogisticsCodePrefixes(prefixes);
  await updateRow("store_setting", current.id, { code_prefixes: next });
  setActiveLogisticsCodePrefixes(next);
  return { ...current, codePrefixes: next };
};

export const loadLogisticsSnapshot = async (): Promise<LogisticsSnapshot> => {
  const settings = await loadLogisticsSettings();
  const client = requireClient();

  const { data: docRows, error: docError } = await client
    .from("store_document")
    .select("id,kind,series,sequence_number,created_at,created_by")
    .order("id", { ascending: true });
  const documents = requireData(docRows, docError) as unknown as DocRegistryRow[];
  const docs = new Map<string, DocRegistryRow>();
  for (const doc of documents) {
    docs.set(String(doc.id), {
      ...doc,
      id: String(doc.id),
      sequence_number: String(doc.sequence_number),
      created_by: doc.created_by == null ? null : String(doc.created_by),
    });
  }

  const kindByDocumentId = new Map(documents.map((doc) => [String(doc.id), String(doc.kind)]));

  const [
    products,
    warehouses,
    manufacturers,
    regions,
    customerOrders,
    productionOrders,
    reservations,
    transfers,
    shipments,
    outputs,
    adjustments,
    rawLines,
    rawSnapshots,
    transactions,
    users,
    documentHistory,
  ] = await Promise.all([
    selectAll("store_product", "id,sku,name,unit,image_url,manufacturer_id", mapProduct, "id"),
    selectAll("store_warehouse", "id,name,manufacturer_id", mapWarehouse, "id"),
    selectAll("store_manufacturer", "id,name,warehouse_id", mapManufacturer, "id"),
    selectAll("store_region", "id,name", mapRegion, "id"),
    selectAll("store_customer_order", "id,status,expected_end_on,description", (row) => mapCustomerOrder(docs, row), "id"),
    selectAll("store_production_order", "id,manufacturer_id,status,expected_end_on", (row) => mapProductionOrder(docs, row), "id"),
    selectAll(
      "store_reservation",
      "id,location_type,location_id,to_owner_type,to_owner_id,status,origin,note",
      (row) => mapReservation(docs, row),
      "id",
    ),
    selectAll(
      "store_transfer",
      "id,from_warehouse_id,to_warehouse_id,status,expected_end_on",
      (row) => mapTransfer(docs, row),
      "id",
    ),
    selectAll(
      "store_shipment",
      "id,customer_order_id,from_location_type,from_location_id,to_location_type,to_location_id",
      (row) => mapShipment(docs, row),
      "id",
    ),
    selectAll("store_output", "id,production_order_id,status,expected_end_on", (row) => mapOutput(docs, row), "id"),
    selectAll(
      "store_adjustment",
      "id,operation,warehouse_id,explanation,source_document_type,source_document_id,status",
      (row) => mapAdjustment(docs, row),
      "id",
    ),
    selectAll(
      "store_document_product_line",
      "id,document_id,product_id,manufacturer_id,quantity,from_owner_type,from_owner_id,to_owner_type,to_owner_id,product_name,product_sku,product_unit,variant,manufacturer_name,manufacturer_code",
      (row) => row,
      "id",
    ),
    selectAll(
      "store_document_product_line_region_snapshot",
      "id,line_id,region_id,region_code,region_name,purchase_price,purchase_currency,dealer_price,dealer_currency,retail_price,retail_currency,dealer_status,retail_status",
      mapRegionSnapshot,
      "id",
    ),
    selectAll(
      "store_stock_transaction",
      "id,created_at,product_id,quantity,location_type,location_id,assigned_to_type,assigned_to_id,document_type,document_id",
      mapTransaction,
      "created_at",
    ),
    selectAll("store_user", "id,name", mapUser, "id"),
    selectAll(
      "store_document_history",
      "id,document_type,document_id,event_type,status,expected_end_on,created_at,created_by",
      mapDocumentHistory,
      "id",
    ),
  ]);

  const snapshotsByLine = new Map<string, DocumentProductLineRegionSnapshot[]>();
  for (const snap of rawSnapshots) {
    const list = snapshotsByLine.get(snap.lineId) ?? [];
    list.push(snap);
    snapshotsByLine.set(snap.lineId, list);
  }

  const documentProductLines = (rawLines as unknown as Record<string, unknown>[]).map((row) =>
    mapDocumentProductLine(row, snapshotsByLine),
  );

  const linesByKind = (kind: string) =>
    documentProductLines.filter((line) => kindByDocumentId.get(line.documentId) === kind);

  const productIdOf = (line: DocumentProductLine): string => line.productId ?? "";

  const customerOrderLines: CustomerOrderLine[] = linesByKind("customer_order").map((line) => ({
    id: line.id,
    orderId: line.documentId,
    productId: productIdOf(line),
    quantity: line.quantity,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
    manufacturerId: line.manufacturerId,
    manufacturerName: line.manufacturerName,
    manufacturerCode: line.manufacturerCode,
  }));

  const productionOrderLines: ProductionOrderLine[] = linesByKind("production_order").map((line) => ({
    id: line.id,
    orderId: line.documentId,
    productId: productIdOf(line),
    quantity: line.quantity,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
    manufacturerId: line.manufacturerId,
    manufacturerName: line.manufacturerName,
    manufacturerCode: line.manufacturerCode,
  }));

  const reservationLines: ReservationLine[] = linesByKind("reservation").map((line) => ({
    id: line.id,
    reservationId: line.documentId,
    productId: productIdOf(line),
    quantity: line.quantity,
    fromOwnerType: line.fromOwnerType,
    fromOwnerId: line.fromOwnerId,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
  }));

  const transferLines: TransferLine[] = [];
  const transferAllocations: TransferAllocation[] = [];
  for (const line of linesByKind("transfer")) {
    transferLines.push({
      id: line.id,
      transferId: line.documentId,
      productId: productIdOf(line),
      quantity: line.quantity,
      productName: line.productName,
      productSku: line.productSku,
      productUnit: line.productUnit,
    });
    if (!isFreeOwner(line.fromOwnerType, line.fromOwnerId) && line.fromOwnerType && line.fromOwnerId) {
      transferAllocations.push({
        id: line.id,
        lineId: line.id,
        ownerType: line.fromOwnerType,
        ownerId: line.fromOwnerId,
        quantity: line.quantity,
      });
    }
  }

  const shipmentLines: ShipmentLine[] = linesByKind("shipment").map((line) => ({
    id: line.id,
    shipmentId: line.documentId,
    productId: productIdOf(line),
    quantity: line.quantity,
    toOwnerType: line.toOwnerType,
    toOwnerId: line.toOwnerId,
    fromOwnerType: line.fromOwnerType,
    fromOwnerId: line.fromOwnerId,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
  }));

  const outputLines: ProductionOutputLine[] = linesByKind("output").map((line) => ({
    id: line.id,
    outputId: line.documentId,
    productionOrderLineId: "",
    productId: productIdOf(line),
    quantity: line.quantity,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
    toOwnerType: line.toOwnerType,
    toOwnerId: line.toOwnerId,
  }));

  const outputAllocations: ProductionOutputAllocation[] = [];

  const adjustmentLines: StockAdjustmentLine[] = linesByKind("adjustment").map((line) => ({
    id: line.id,
    adjustmentId: line.documentId,
    productId: productIdOf(line),
    quantity: line.quantity,
    productName: line.productName,
    productSku: line.productSku,
    productUnit: line.productUnit,
  }));

  return {
    products,
    warehouses,
    manufacturers,
    regions,
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

export const insertReturningId = async (table: string, row: Record<string, unknown>): Promise<string> => {
  const client = requireClient();
  const { data, error } = await client.from(table).insert(row).select("id").single();
  return String(requireData(data, error).id);
};

export const postReservation = (id: string) => rpc("store_post_reservation", { p_id: id });

export type ReservationLineInput = {
  productId: string;
  quantity: number;
  fromOwnerType?: OwnerType | null;
  fromOwnerId?: string | null;
};

export const createReservationDraft = async (args: {
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const created = await rpcJson<{ id: number | string; status: string }>(
    "store_create_reservation_draft",
    {
      p_location_type: args.locationType,
      p_location_id: Number(args.locationId),
      p_to_owner_type: args.toOwnerType ?? null,
      p_to_owner_id: args.toOwnerId ? Number(args.toOwnerId) : null,
      p_note: args.note ?? "",
      p_origin: "manual",
      p_lines: args.lines.map((line) => ({
        product_id: Number(line.productId),
        quantity: line.quantity,
        from_owner_type: line.fromOwnerType ?? null,
        from_owner_id: line.fromOwnerId ? Number(line.fromOwnerId) : null,
      })),
    },
  );
  return String(created.id);
};

export const createAndPostReservation = async (args: {
  locationType: ReservationLocationType;
  locationId: string;
  toOwnerType?: OwnerType | null;
  toOwnerId?: string | null;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const created = await rpcJson<{ id: number | string; status: string }>(
    "store_create_and_post_reservation",
    {
      p_location_type: args.locationType,
      p_location_id: Number(args.locationId),
      p_to_owner_type: args.toOwnerType ?? null,
      p_to_owner_id: args.toOwnerId ? Number(args.toOwnerId) : null,
      p_note: args.note ?? "",
      p_origin: "manual",
      p_lines: args.lines.map((line) => ({
        product_id: Number(line.productId),
        quantity: line.quantity,
        from_owner_type: line.fromOwnerType ?? null,
        from_owner_id: line.fromOwnerId ? Number(line.fromOwnerId) : null,
      })),
    },
  );
  return String(created.id);
};

export const addReservationLine = async (args: ReservationLineInput & { reservationId: string }) => {
  const client = requireClient();
  const { data, error } = await client.rpc("store_add_document_product_line", {
    p_document_id: Number(args.reservationId),
    p_product_id: Number(args.productId),
    p_quantity: args.quantity,
    p_from_owner_type: args.fromOwnerType ?? null,
    p_from_owner_id: args.fromOwnerId ? Number(args.fromOwnerId) : null,
    p_to_owner_type: null,
    p_to_owner_id: null,
  });
  if (error) {
    throw new Error(error.message);
  }
  return String(data);
};

export const completeOutput = (id: string) => rpc("store_complete_output", { p_id: id });

export const createAndPostShipment = async (
  input: ShipmentCreateAndPostInput,
): Promise<ShipmentCreateAndPostResult> => {
  const created = await rpcJson<{ id: number | string; direction: string }>(
    "store_create_and_post_shipment",
    shipmentCreateRpcArgs(input),
  );
  if (created.direction !== "shipment" && created.direction !== "return") {
    throw new Error("Ожидался документ отгрузки или возврата");
  }
  return { id: String(created.id), direction: created.direction };
};

export const newProductionOutputRequestKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `out-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  requestKey: string;
  orderId: string;
  lines: ProductionOutputLineInput[];
  expectedEndOn?: string | null;
  complete?: boolean;
}) => {
  for (const line of args.lines) {
    if (line.allocation && line.allocation.quantity > 0 && line.allocation.quantity > line.quantity) {
      throw new Error("Занятое количество не может превышать выпуск");
    }
  }
  return {
    p_request_key: args.requestKey,
    p_production_order_id: Number(args.orderId),
    p_lines: args.lines.map((line) => ({
      product_id: Number(line.productId),
      quantity: line.quantity,
      allocation_owner_type: line.allocation?.quantity ? line.allocation.ownerType : null,
      allocation_owner_id: line.allocation?.quantity ? Number(line.allocation.ownerId) : null,
      allocation_quantity: line.allocation?.quantity ?? null,
    })),
    p_expected_end_on: args.expectedEndOn || null,
    p_complete: args.complete !== false,
  };
};

export const createProductionOutput = async (args: {
  requestKey: string;
  orderId: string;
  lines: ProductionOutputLineInput[];
  expectedEndOn?: string | null;
  complete?: boolean;
}): Promise<string> => {
  const created = await rpcJson<{ id: number | string }>(
    "store_create_production_output",
    buildCreateProductionOutputRpcArgs(args),
  );
  return String(created.id);
};

export const createProductionForOrder = async (args: {
  manufacturerId: string;
  customerOrderId: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  const created = await createProductionOrder({
    manufacturerId: args.manufacturerId,
    expectedEndOn: args.expectedEndOn,
    lines: args.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  });
  await createAndPostReservation({
    locationType: "production_order",
    locationId: String(created.id),
    toOwnerType: "order",
    toOwnerId: args.customerOrderId,
    lines: args.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      fromOwnerType: null,
      fromOwnerId: null,
    })),
  });
  return created.id;
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
  const created = await rpcJson<{ id: number | string; status: string }>(
    "store_create_and_post_adjustment",
    {
      p_operation: draft.operation,
      p_warehouse_id: Number(draft.warehouseId),
      p_explanation: explanation,
      p_source_document_type: draft.sourceDocumentType ?? null,
      p_source_document_id: draft.sourceDocumentId ? Number(draft.sourceDocumentId) : null,
      p_lines: lines.map((line) => ({
        product_id: Number(line.productId),
        quantity: line.quantity,
      })),
    },
  );
  if (created.status !== "posted") {
    throw new Error("Ожидалась проведённая корректировка");
  }
  return { id: String(created.id), status: "posted" };
};

export const createAndSendTransfer = async (
  input: TransferCreateAndSendInput,
): Promise<TransferCreateAndSendResult> => {
  const created = await rpcJson<{ id: number | string; status: string }>(
    "store_create_and_send_transfer",
    transferCreateRpcArgs(input),
  );
  if (created.status !== "sent") {
    throw new Error(`Expected sent transfer, received ${String(created.status)}`);
  }
  return { id: String(created.id), status: "sent" };
};
export const sendTransfer = (id: string) => rpc("store_send_transfer", { p_id: id });
export const completeTransfer = (id: string) => rpc("store_complete_transfer", { p_id: id });
export const closeCustomerOrder = (id: string) => rpc("store_close_customer_order", { p_id: id });

export const createCustomerOrder = async (args: {
  description?: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  const created = await rpcJson<{
    id: number | string;
    lines: Array<{ id: number | string; product_id: number | string }>;
  }>("store_create_customer_order", {
    p_description: args.description ?? "",
    p_expected_end_on: args.expectedEndOn || null,
    p_lines: args.lines.map((line) => ({
      product_id: Number(line.productId),
      quantity: line.quantity,
    })),
  });
  return { id: String(created.id), lines: created.lines };
};

export const closeProductionOrder = (id: string) => rpc("store_close_production_order", { p_id: id });
export const setProductionStatus = (id: string, status: ProductionStatus) =>
  rpc("store_set_production_status", { p_id: id, p_status: status });
export const createProductionOrder = async (args: {
  manufacturerId: string;
  expectedEndOn?: string | null;
  lines: Array<{ productId: string; quantity: number }>;
}) => {
  const created = await rpcJson<{ id: number | string; lines: Array<{ id: number | string; product_id: number | string }> }>(
    "store_create_production_order",
    {
      p_manufacturer_id: Number(args.manufacturerId),
      p_lines: args.lines.map((line) => ({
        product_id: Number(line.productId),
        quantity: line.quantity,
      })),
    },
  );
  const id = String(created.id);
  if (args.expectedEndOn) {
    await updateExpectedEnd("store_production_order", id, args.expectedEndOn);
  }
  return { id, lines: created.lines };
};
export const addProductionLine = (args: { orderId: string; productId: string; quantity: number }) =>
  rpc("store_add_production_line", {
    p_id: Number(args.orderId),
    p_product_id: Number(args.productId),
    p_quantity: args.quantity,
  });
/** @deprecated Production orders no longer materialize WIP; kept as no-op for leftover callers. */
export const syncProductionStock = async (_id: string) => "ok";
/** Status-only cancel for unposted drafts already supported by the domain. Posted documents use the cancel helper. */
export const cancelDocument = (kind: string, id: string, status?: string | null) => {
  assertDocumentCanBeCancelled(kind, status);
  return rpc("store_cancel_document", { p_kind: kind, p_id: id });
};

export const insertRows = async (table: string, rows: Record<string, unknown> | Record<string, unknown>[]) => {
  const client = requireClient();
  const { error } = await client.from(table).insert(rows);
  if (error) {
    throw new Error(error.message);
  }
};

export const updateRow = async (table: string, id: string, values: Record<string, unknown>) => {
  const client = requireClient();
  const { error } = await client.from(table).update(values).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
};

export const updateExpectedEnd = (table: string, id: string, expectedEndOn: string | null) =>
  updateRow(table, id, { expected_end_on: expectedEndOn || null });

export const deleteRows = async (table: string, column: string, value: string) => {
  const client = requireClient();
  const { error } = await client.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(error.message);
  }
};

export const createProduct = (args: { sku: string; name: string; unit: string }) =>
  insertRows("store_product", {
    sku: args.sku,
    name: args.name,
    unit: args.unit,
  });

export const createWarehouse = (args: { name: string }) =>
  insertReturningId("store_warehouse", {
    name: args.name,
    manufacturer_id: null,
  });

export const updateWarehouse = (args: { id: string; name: string }) =>
  updateRow("store_warehouse", args.id, { name: args.name });

export const createRegion = (args: { name: string }) =>
  insertReturningId("store_region", {
    name: args.name,
  });

export const updateRegion = (args: { id: string; name: string }) =>
  updateRow("store_region", args.id, { name: args.name });

export const createManufacturer = async (args: { name: string }) => {
  const warehouseId = await insertReturningId("store_warehouse", {
    name: args.name,
    manufacturer_id: null,
  });
  const id = await insertReturningId("store_manufacturer", {
    name: args.name,
    warehouse_id: warehouseId,
  });
  await updateRow("store_warehouse", warehouseId, { manufacturer_id: id });
  return id;
};

export const updateManufacturer = async (args: { id: string; name: string }) => {
  await updateRow("store_manufacturer", args.id, { name: args.name });
};

export { isSupabaseConfigured };
