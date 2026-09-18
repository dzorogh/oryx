import type {
  CustomerOrder,
  CustomerOrderLine,
  LogisticsManufacturer,
  LogisticsProduct,
  LogisticsSetting,
  LogisticsSnapshot,
  LogisticsWarehouse,
  ProductionOrder,
  ProductionOrderLine,
  ProductionOutput,
  ProductionOutputAllocation,
  ProductionOutputLine,
  LocationType,
  ProductionStatus,
  Reservation,
  ReservationLine,
  ReservationLocationType,
  ReservationOperation,
  ReservationOrigin,
  ReservationStatus,
  Shipment,
  ShipmentLine,
  ShipmentReturn,
  ShipmentReturnLine,
  StockTransaction,
  Transfer,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";
import {
  formatLogisticsCode,
  mergeLogisticsCodePrefixes,
  setActiveLogisticsCodePrefixes,
  type LogisticsCodePrefixes,
} from "@/features/logistics/logistics-codes";
import { assertDocumentCanBeCancelled } from "@/features/logistics/logistics-rules";
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

const mapSetting = (row: Record<string, unknown>): LogisticsSetting => ({
  id: String(row.id),
  codePrefixes: mergeLogisticsCodePrefixes(
    row.code_prefixes && typeof row.code_prefixes === "object" && !Array.isArray(row.code_prefixes)
      ? (row.code_prefixes as Record<string, unknown>)
      : null,
  ),
});

const dateOrNull = (value: unknown): string | null => (value ? String(value) : null);

const mapCustomerOrder = (row: Record<string, unknown>): CustomerOrder => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("customerOrder", id),
    status: row.status as CustomerOrder["status"],
    createdAt: String(row.created_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    expectedEndOn: dateOrNull(row.expected_end_on),
    description: row.description ? String(row.description) : "",
  };
};

const mapCustomerOrderLine = (row: Record<string, unknown>): CustomerOrderLine => ({
  id: String(row.id),
  orderId: String(row.order_id),
  productId: String(row.product_id),
  quantity: Number(row.quantity),
});

const mapProductionOrder = (row: Record<string, unknown>): ProductionOrder => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("productionOrder", id),
    manufacturerId: String(row.manufacturer_id),
    status: row.status as ProductionOrder["status"],
    createdAt: String(row.created_at),
    closedAt: row.closed_at ? String(row.closed_at) : null,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapProductionOrderLine = (row: Record<string, unknown>): ProductionOrderLine => ({
  id: String(row.id),
  orderId: String(row.order_id),
  productId: String(row.product_id),
  quantity: Number(row.quantity),
  activatedQuantity: Number(row.activated_quantity),
});

const mapReservation = (row: Record<string, unknown>): Reservation => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("reservation", id),
    customerOrderId: String(row.customer_order_id),
    locationType: row.location_type as ReservationLocationType,
    locationId: String(row.location_id),
    operation: row.operation as ReservationOperation,
    status: row.status as ReservationStatus,
    origin: row.origin as ReservationOrigin,
    note: row.note ? String(row.note) : "",
    createdAt: String(row.created_at),
    postedAt: row.posted_at ? String(row.posted_at) : null,
  };
};

const mapReservationLine = (row: Record<string, unknown>): ReservationLine => ({
  id: String(row.id),
  reservationId: String(row.reservation_id),
  customerOrderLineId: String(row.customer_order_line_id),
  quantity: Number(row.quantity),
});

const mapTransfer = (row: Record<string, unknown>): Transfer => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("transfer", id),
    fromWarehouseId: String(row.from_warehouse_id),
    toWarehouseId: String(row.to_warehouse_id),
    status: row.status as Transfer["status"],
    createdAt: String(row.created_at),
    sentAt: row.sent_at ? String(row.sent_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapTransferLine = (row: Record<string, unknown>): TransferLine => ({
  id: String(row.id),
  transferId: String(row.transfer_id),
  productId: String(row.product_id),
  quantity: Number(row.quantity),
});

const mapTransferAllocation = (row: Record<string, unknown>): TransferAllocation => ({
  id: String(row.id),
  lineId: String(row.line_id),
  customerOrderId: String(row.customer_order_id),
  customerOrderLineId: String(row.customer_order_line_id),
  quantity: Number(row.quantity),
});

const mapShipment = (row: Record<string, unknown>): Shipment => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("shipment", id),
    customerOrderId: String(row.customer_order_id),
    warehouseId: String(row.warehouse_id),
    status: row.status as Shipment["status"],
    createdAt: String(row.created_at),
    postedAt: row.posted_at ? String(row.posted_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  };
};

const mapShipmentLine = (row: Record<string, unknown>): ShipmentLine => ({
  id: String(row.id),
  shipmentId: String(row.shipment_id),
  customerOrderLineId: String(row.customer_order_line_id),
  productId: String(row.product_id),
  quantity: Number(row.quantity),
});

const mapOutput = (row: Record<string, unknown>): ProductionOutput => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("output", id),
    productionOrderId: String(row.production_order_id),
    status: row.status as ProductionOutput["status"],
    createdAt: String(row.created_at),
    doneAt: dateOrNull(row.done_at),
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    expectedEndOn: dateOrNull(row.expected_end_on),
  };
};

const mapOutputLine = (row: Record<string, unknown>): ProductionOutputLine => ({
  id: String(row.id),
  outputId: String(row.output_id),
  productionOrderLineId: String(row.production_order_line_id),
  productId: String(row.product_id),
  quantity: Number(row.quantity),
});

const mapOutputAllocation = (row: Record<string, unknown>): ProductionOutputAllocation => ({
  id: String(row.id),
  lineId: String(row.line_id),
  customerOrderId: String(row.customer_order_id),
  customerOrderLineId: String(row.customer_order_line_id),
  quantity: Number(row.quantity),
});

const mapReturn = (row: Record<string, unknown>): ShipmentReturn => {
  const id = String(row.id);
  return {
    id,
    number: formatLogisticsCode("return", id),
    shipmentId: String(row.shipment_id),
    status: row.status as ShipmentReturn["status"],
    createdAt: String(row.created_at),
    postedAt: row.posted_at ? String(row.posted_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
  };
};

const mapReturnLine = (row: Record<string, unknown>): ShipmentReturnLine => ({
  id: String(row.id),
  returnId: String(row.return_id),
  shipmentLineId: String(row.shipment_line_id),
  quantity: Number(row.quantity),
});

const mapTransaction = (row: Record<string, unknown>): StockTransaction => ({
  transactionId: String(row.transaction_id),
  occurredAt: String(row.occurred_at),
  postedAt: String(row.posted_at),
  productId: String(row.product_id),
  unit: String(row.unit),
  quantity: Number(row.quantity),
  locationType: row.location_type as StockTransaction["locationType"],
  locationId: String(row.location_id),
  stockState: row.stock_state as StockTransaction["stockState"],
  customerOrderId: row.customer_order_id ? String(row.customer_order_id) : null,
  customerOrderLineId: row.customer_order_line_id ? String(row.customer_order_line_id) : null,
  sourceType: row.source_type as StockTransaction["sourceType"],
  sourceId: String(row.source_id),
  sourceLineId: row.source_line_id ? String(row.source_line_id) : null,
  operationId: String(row.operation_id),
  idempotencyKey: String(row.idempotency_key),
  reversesTransactionId: row.reverses_transaction_id ? String(row.reverses_transaction_id) : null,
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
  const [
    products,
    warehouses,
    manufacturers,
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
    returns,
    returnLines,
    transactions,
  ] = await Promise.all([
    selectAll("store_product", "id,sku,name,unit,image_url,manufacturer_id", mapProduct, "id"),
    selectAll("store_warehouse", "id,name,manufacturer_id", mapWarehouse, "id"),
    selectAll("store_manufacturer", "id,name,warehouse_id", mapManufacturer, "id"),
    selectAll("store_customer_order", "id,status,created_at,closed_at,expected_end_on,description", mapCustomerOrder, "id"),
    selectAll("store_customer_order_line", "id,order_id,product_id,quantity", mapCustomerOrderLine, "id"),
    selectAll(
      "store_production_order",
      "id,manufacturer_id,status,created_at,closed_at,expected_end_on",
      mapProductionOrder,
      "id",
    ),
    selectAll(
      "store_production_order_line",
      "id,order_id,product_id,quantity,activated_quantity",
      mapProductionOrderLine,
      "id",
    ),
    selectAll(
      "store_reservation",
      "id,customer_order_id,location_type,location_id,operation,status,origin,note,created_at,posted_at",
      mapReservation,
      "id",
    ),
    selectAll(
      "store_reservation_line",
      "id,reservation_id,customer_order_line_id,quantity",
      mapReservationLine,
      "id",
    ),
    selectAll(
      "store_transfer",
      "id,from_warehouse_id,to_warehouse_id,status,created_at,sent_at,cancelled_at,expected_end_on",
      mapTransfer,
      "id",
    ),
    selectAll("store_transfer_line", "id,transfer_id,product_id,quantity", mapTransferLine, "id"),
    selectAll(
      "store_transfer_allocation",
      "id,line_id,customer_order_id,customer_order_line_id,quantity",
      mapTransferAllocation,
      "id",
    ),
    selectAll(
      "store_shipment",
      "id,customer_order_id,warehouse_id,status,created_at,posted_at,cancelled_at",
      mapShipment,
      "id",
    ),
    selectAll(
      "store_shipment_line",
      "id,shipment_id,customer_order_line_id,product_id,quantity",
      mapShipmentLine,
      "id",
    ),
    selectAll(
      "store_output",
      "id,production_order_id,status,created_at,done_at,cancelled_at,expected_end_on",
      mapOutput,
      "id",
    ),
    selectAll(
      "store_output_line",
      "id,output_id,production_order_line_id,product_id,quantity",
      mapOutputLine,
      "id",
    ),
    selectAll(
      "store_output_allocation",
      "id,line_id,customer_order_id,customer_order_line_id,quantity",
      mapOutputAllocation,
      "id",
    ),
    selectAll(
      "store_return",
      "id,shipment_id,status,created_at,posted_at,cancelled_at",
      mapReturn,
      "id",
    ),
    selectAll("store_return_line", "id,return_id,shipment_line_id,quantity", mapReturnLine, "id"),
    selectAll(
      "store_stock_transaction",
      "transaction_id,occurred_at,posted_at,product_id,unit,quantity,location_type,location_id,stock_state,customer_order_id,customer_order_line_id,source_type,source_id,source_line_id,operation_id,idempotency_key,reverses_transaction_id",
      mapTransaction,
      "posted_at",
    ),
  ]);

  return {
    products,
    warehouses,
    manufacturers,
    settings,
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
    returns,
    returnLines,
    transactions,
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
  customerOrderLineId: string;
  quantity: number;
};

export const createReservationDraft = async (args: {
  customerOrderId: string;
  locationType: ReservationLocationType;
  locationId: string;
  operation: ReservationOperation;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const id = await insertReturningId("store_reservation", {
    customer_order_id: args.customerOrderId,
    location_type: args.locationType,
    location_id: args.locationId,
    operation: args.operation,
    origin: "manual",
    note: args.note ?? "",
    status: "draft",
  });
  await insertRows(
    "store_reservation_line",
    args.lines.map((line) => ({
      reservation_id: id,
      customer_order_line_id: line.customerOrderLineId,
      quantity: line.quantity,
    })),
  );
  return id;
};

export const createAndPostReservation = async (args: {
  customerOrderId: string;
  locationType: ReservationLocationType;
  locationId: string;
  operation: ReservationOperation;
  note?: string;
  lines: ReservationLineInput[];
}) => {
  const id = await createReservationDraft(args);
  await postReservation(id);
  return id;
};

export const addReservationLine = (args: ReservationLineInput & { reservationId: string }) =>
  insertRows("store_reservation_line", {
    reservation_id: args.reservationId,
    customer_order_line_id: args.customerOrderLineId,
    quantity: args.quantity,
  });

export const postShipment = (id: string) => rpc("store_post_shipment", { p_id: id });
export const postReturn = (id: string) => rpc("store_post_return", { p_id: id });
export const completeOutput = (id: string) => rpc("store_complete_output", { p_id: id });

export const createAndPostShipment = async (args: {
  customerOrderId: string;
  warehouseId: string;
  lines: Array<{ customerOrderLineId: string; productId: string; quantity: number }>;
  post?: boolean;
}) => {
  const id = await insertReturningId("store_shipment", {
    customer_order_id: args.customerOrderId,
    warehouse_id: args.warehouseId,
    status: "draft",
  });
  await insertRows(
    "store_shipment_line",
    args.lines.map((line) => ({
      shipment_id: id,
      customer_order_line_id: line.customerOrderLineId,
      product_id: line.productId,
      quantity: line.quantity,
    })),
  );
  if (args.post !== false) {
    await postShipment(id);
  }
  return id;
};

export const createAndPostReturn = async (args: {
  shipmentId: string;
  lines: Array<{ shipmentLineId: string; quantity: number }>;
  post?: boolean;
}) => {
  const id = await insertReturningId("store_return", {
    shipment_id: args.shipmentId,
    status: "draft",
  });
  await insertRows(
    "store_return_line",
    args.lines.map((line) => ({
      return_id: id,
      shipment_line_id: line.shipmentLineId,
      quantity: line.quantity,
    })),
  );
  if (args.post !== false) {
    await postReturn(id);
  }
  return id;
};

export const createProductionOutput = async (args: {
  orderId: string;
  lineId: string;
  productId: string;
  quantity: number;
  allocation?: {
    customerOrderId: string;
    customerOrderLineId: string;
    quantity: number;
  };
  expectedEndOn?: string | null;
  complete?: boolean;
}) => {
  if (args.allocation && args.allocation.quantity > 0) {
    await createAndPostReservation({
      customerOrderId: args.allocation.customerOrderId,
      locationType: "production_order_line",
      locationId: args.lineId,
      operation: "reserve",
      lines: [
        {
          customerOrderLineId: args.allocation.customerOrderLineId,
          quantity: args.allocation.quantity,
        },
      ],
    });
  }
  const id = await insertReturningId("store_output", {
    production_order_id: args.orderId,
    status: "planned",
    expected_end_on: args.expectedEndOn || null,
  });
  await insertRows("store_output_line", {
    output_id: id,
    production_order_line_id: args.lineId,
    product_id: args.productId,
    quantity: args.quantity,
  });
  if (args.complete !== false) {
    await completeOutput(id);
  }
  return id;
};

export const createProductionForOrder = async (args: {
  manufacturerId: string;
  customerOrderId: string;
  expectedEndOn?: string | null;
  lines: Array<{ customerOrderLineId: string; productId: string; quantity: number }>;
}) => {
  const created = await createProductionOrder({
    manufacturerId: args.manufacturerId,
    expectedEndOn: args.expectedEndOn,
    lines: args.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
  });
  const lineIdByProduct = new Map(created.lines.map((line) => [String(line.product_id), String(line.id)]));
  const linesByLocation = new Map<string, Array<{ customerOrderLineId: string; quantity: number }>>();
  for (const line of args.lines) {
    const locationId = lineIdByProduct.get(line.productId) ?? "";
    const bucket = linesByLocation.get(locationId) ?? [];
    bucket.push({ customerOrderLineId: line.customerOrderLineId, quantity: line.quantity });
    linesByLocation.set(locationId, bucket);
  }
  for (const [locationId, lines] of linesByLocation) {
    await createAndPostReservation({
      customerOrderId: args.customerOrderId,
      locationType: "production_order_line",
      locationId,
      operation: "reserve",
      lines,
    });
  }
  return created.id;
};

export const createAndSendReservedTransfer = async (args: {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{
    productId: string;
    quantity: number;
    customerOrderId: string;
    customerOrderLineId: string;
    allocated: number;
  }>;
  expectedEndOn?: string | null;
  send?: boolean;
}) => {
  const id = await insertReturningId("store_transfer", {
    from_warehouse_id: args.fromWarehouseId,
    to_warehouse_id: args.toWarehouseId,
    status: "draft",
    expected_end_on: args.expectedEndOn || null,
  });
  for (const line of args.lines) {
    const lineId = await insertReturningId("store_transfer_line", {
      transfer_id: id,
      product_id: line.productId,
      quantity: line.quantity,
    });
    if (line.allocated > 0) {
      await insertRows("store_transfer_allocation", {
        line_id: lineId,
        customer_order_id: line.customerOrderId,
        customer_order_line_id: line.customerOrderLineId,
        quantity: line.allocated,
      });
    }
  }
  if (args.send !== false) {
    await sendTransfer(id);
  }
  return id;
};
export const sendTransfer = (id: string) => rpc("store_send_transfer", { p_id: id });
export const completeTransfer = (id: string) => rpc("store_complete_transfer", { p_id: id });
export const closeCustomerOrder = (id: string) => rpc("store_close_customer_order", { p_id: id });
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
export const syncProductionStock = (id: string) => rpc("store_sync_production_activation", { p_id: id });
export const cancelDocument = (kind: string, id: string) => {
  assertDocumentCanBeCancelled(kind);
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
