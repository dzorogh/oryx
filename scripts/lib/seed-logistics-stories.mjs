/**
 * Dedicated OMS-901..905 demo stories with a full logistics chain.
 * Uses existing logistics tables and post RPCs. Does not print secrets.
 */

const STORY_LO = 901;
const STORY_HI = 999;

const PRODUCT = {
  enduro250: 22,
  force1100: 1,
  cross180: 17,
  hummer320: 46,
  cruiser300: 36,
};

const PLANT = {
  shineray: { id: 6, warehouseId: 7 },
  qianjiang: { id: 38, warehouseId: 41 },
  taotao: { id: 34, warehouseId: 40 },
  sunyee: { id: 12, warehouseId: 33 },
};

const DUBAI_HUB = 11;

export const STORY_ORDERS = [
  {
    id: 901,
    createdAt: "2026-09-02T08:10:00+00:00",
    expectedEndOn: "2026-09-15",
    description:
      "We built extra Enduro stock last month. This order took 4 of the leftover bikes; 8 stay free at the plant.",
  },
  {
    id: 902,
    createdAt: "2026-09-01T09:00:00+00:00",
    expectedEndOn: "2026-09-20",
    description:
      "The dealer signed first. We opened a build for these 3 Force 1100s, reserved them on the line, then shipped after they reached the plant.",
  },
  {
    id: 903,
    createdAt: "2026-09-05T10:15:00+00:00",
    expectedEndOn: "2026-09-18",
    description:
      "Ten Cross 180s were already finished and sitting at the plant. We reserved 6 for this dealer and shipped them from there; 4 are still free.",
  },
  {
    id: 904,
    createdAt: "2026-09-02T11:40:00+00:00",
    expectedEndOn: "2026-09-22",
    description:
      "We reserved all 8 Hummers the dealer asked for. They cut the deal to 5, so we released 3 back to free stock and shipped the rest.",
  },
  {
    id: 905,
    createdAt: "2026-08-20T07:30:00+00:00",
    expectedEndOn: "2026-09-16",
    description:
      "All 6 Cruisers went out to the dealer. They sent 2 back the next week; those two are free again at the plant.",
  },
];

const createClient = (url, anon) => {
  const jsonHeaders = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    "Content-Type": "application/json",
  };

  const request = async (method, path, { body, prefer } = {}) => {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: {
        ...jsonHeaders,
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`${method} ${path} failed: ${res.status} (${text.length} bytes)`);
    }
    return text ? JSON.parse(text) : null;
  };

  return {
    get: (path) => request("GET", path),
    insert: (table, row) =>
      request("POST", table, { body: row, prefer: "return=minimal" }),
    rpc: (name, args) => request("POST", `rpc/${name}`, { body: args, prefer: "return=representation" }),
    remove: (path) => request("DELETE", path, { prefer: "return=minimal" }),
  };
};

const rangeFilter = `id=gte.${STORY_LO}&id=lte.${STORY_HI}`;

const resetStories = async (client) => {
  await client.remove(
    `store_stock_transaction?or=(and(customer_order_id.gte.${STORY_LO},customer_order_id.lte.905),and(source_id.gte.${STORY_LO},source_id.lte.${STORY_HI}))`,
  );
  const tables = [
    "store_return_line",
    "store_return",
    "store_shipment_line",
    "store_shipment",
    "store_output_allocation",
    "store_output_line",
    "store_output",
    "store_transfer_allocation",
    "store_transfer_line",
    "store_transfer",
    "store_reservation_line",
    "store_reservation",
    "store_production_order_line",
    "store_production_order",
    "store_customer_order_line",
    "store_customer_order",
  ];
  for (const table of tables) {
    await client.remove(`${table}?${rangeFilter}`);
  }
};

const insertCustomerOrder = async (client, story, productId, quantity) => {
  await client.insert("store_customer_order", {
    id: story.id,
    status: "open",
    created_at: story.createdAt,
    expected_end_on: story.expectedEndOn,
    description: story.description,
  });
  await client.insert("store_customer_order_line", {
    id: story.id,
    order_id: story.id,
    product_id: productId,
    quantity,
  });
};

const insertProduction = async (client, { id, manufacturerId, productId, quantity, createdAt, expectedEndOn, status }) => {
  await client.insert("store_production_order", {
    id,
    manufacturer_id: manufacturerId,
    status: "draft",
    created_at: createdAt,
    expected_end_on: expectedEndOn,
  });
  await client.insert("store_production_order_line", {
    id,
    order_id: id,
    product_id: productId,
    quantity,
    activated_quantity: 0,
  });
  await client.rpc("store_sync_production_activation", { p_id: id });
  if (status && status !== "draft") {
    await client.rpc("store_set_production_status", { p_id: id, p_status: status });
  }
};

const completeOutput = async (client, { id, productionOrderId, productId, quantity, createdAt, expectedEndOn }) => {
  await client.insert("store_output", {
    id,
    production_order_id: productionOrderId,
    status: "planned",
    created_at: createdAt,
    expected_end_on: expectedEndOn,
  });
  await client.insert("store_output_line", {
    id,
    output_id: id,
    production_order_line_id: productionOrderId,
    product_id: productId,
    quantity,
  });
  await client.rpc("store_complete_output", { p_id: id });
};

const postReservation = async (client, { id, orderId, productId, quantity, locationType, locationId, createdAt, operation = "reserve", note = "" }) => {
  await client.insert("store_reservation", {
    id,
    customer_order_id: orderId,
    location_type: locationType,
    location_id: locationId,
    operation,
    origin: "manual",
    note,
    status: "draft",
    created_at: createdAt,
  });
  await client.insert("store_reservation_line", {
    id,
    reservation_id: id,
    customer_order_line_id: orderId,
    quantity,
  });
  await client.rpc("store_post_reservation", { p_id: id });
};

const postRelease = async (client, { id, orderId, productId, quantity, locationType, locationId, reason, createdAt }) => {
  await postReservation(client, {
    id,
    orderId,
    productId,
    quantity,
    locationType,
    locationId,
    createdAt,
    operation: "release",
    note: reason ?? "",
  });
};

const deliverTransfer = async (client, { id, fromWarehouseId, toWarehouseId, orderId, productId, quantity, createdAt, expectedEndOn }) => {
  await client.insert("store_transfer", {
    id,
    from_warehouse_id: fromWarehouseId,
    to_warehouse_id: toWarehouseId,
    status: "draft",
    created_at: createdAt,
    expected_end_on: expectedEndOn,
  });
  await client.insert("store_transfer_line", {
    id,
    transfer_id: id,
    product_id: productId,
    quantity,
  });
  await client.insert("store_transfer_allocation", {
    id,
    line_id: id,
    customer_order_id: orderId,
    customer_order_line_id: orderId,
    quantity,
  });
  await client.rpc("store_send_transfer", { p_id: id });
  await client.rpc("store_complete_transfer", { p_id: id });
};

const postShipment = async (client, { id, orderId, warehouseId, productId, quantity, createdAt }) => {
  await client.insert("store_shipment", {
    id,
    customer_order_id: orderId,
    warehouse_id: warehouseId,
    status: "draft",
    created_at: createdAt,
  });
  await client.insert("store_shipment_line", {
    id,
    shipment_id: id,
    customer_order_line_id: orderId,
    product_id: productId,
    quantity,
  });
  await client.rpc("store_post_shipment", { p_id: id });
};

const postReturn = async (client, { id, shipmentId, shipmentLineId, quantity, createdAt }) => {
  await client.insert("store_return", {
    id,
    shipment_id: shipmentId,
    status: "draft",
    created_at: createdAt,
  });
  await client.insert("store_return_line", {
    id,
    return_id: id,
    shipment_line_id: shipmentLineId,
    quantity,
  });
  await client.rpc("store_post_return", { p_id: id });
};

const seedSurplusThenReserve = async (client) => {
  const story = STORY_ORDERS[0];
  await insertProduction(client, {
    id: 901,
    manufacturerId: PLANT.shineray.id,
    productId: PRODUCT.enduro250,
    quantity: 12,
    createdAt: "2026-08-12T06:00:00+00:00",
    expectedEndOn: "2026-08-28",
    status: "in_progress",
  });
  await completeOutput(client, {
    id: 901,
    productionOrderId: 901,
    productId: PRODUCT.enduro250,
    quantity: 12,
    createdAt: "2026-08-20T08:00:00+00:00",
    expectedEndOn: "2026-08-20",
  });
  await client.rpc("store_set_production_status", { p_id: 901, p_status: "done" });
  await insertCustomerOrder(client, story, PRODUCT.enduro250, 4);
  await postReservation(client, {
    id: 901,
    orderId: 901,
    productId: PRODUCT.enduro250,
    quantity: 4,
    locationType: "warehouse",
    locationId: PLANT.shineray.warehouseId,
    createdAt: "2026-09-03T08:30:00+00:00",
  });
  await deliverTransfer(client, {
    id: 901,
    fromWarehouseId: PLANT.shineray.warehouseId,
    toWarehouseId: DUBAI_HUB,
    orderId: 901,
    productId: PRODUCT.enduro250,
    quantity: 4,
    createdAt: "2026-09-05T07:00:00+00:00",
    expectedEndOn: "2026-09-08",
  });
  await postShipment(client, {
    id: 901,
    orderId: 901,
    warehouseId: DUBAI_HUB,
    productId: PRODUCT.enduro250,
    quantity: 4,
    createdAt: "2026-09-08T10:00:00+00:00",
  });
};

const seedOrderThenProduce = async (client) => {
  const story = STORY_ORDERS[1];
  await insertCustomerOrder(client, story, PRODUCT.force1100, 3);
  await insertProduction(client, {
    id: 902,
    manufacturerId: PLANT.qianjiang.id,
    productId: PRODUCT.force1100,
    quantity: 3,
    createdAt: "2026-09-02T06:20:00+00:00",
    expectedEndOn: "2026-09-12",
    status: "in_progress",
  });
  await postReservation(client, {
    id: 902,
    orderId: 902,
    productId: PRODUCT.force1100,
    quantity: 3,
    locationType: "production_order_line",
    locationId: 902,
    createdAt: "2026-09-02T06:25:00+00:00",
  });
  await completeOutput(client, {
    id: 902,
    productionOrderId: 902,
    productId: PRODUCT.force1100,
    quantity: 3,
    createdAt: "2026-09-10T09:00:00+00:00",
    expectedEndOn: "2026-09-10",
  });
  await client.rpc("store_set_production_status", { p_id: 902, p_status: "done" });
  await deliverTransfer(client, {
    id: 902,
    fromWarehouseId: PLANT.qianjiang.warehouseId,
    toWarehouseId: DUBAI_HUB,
    orderId: 902,
    productId: PRODUCT.force1100,
    quantity: 3,
    createdAt: "2026-09-11T07:30:00+00:00",
    expectedEndOn: "2026-09-14",
  });
  await postShipment(client, {
    id: 902,
    orderId: 902,
    warehouseId: DUBAI_HUB,
    productId: PRODUCT.force1100,
    quantity: 3,
    createdAt: "2026-09-14T11:00:00+00:00",
  });
};

const seedLeftoverAtPlant = async (client) => {
  const story = STORY_ORDERS[2];
  await insertProduction(client, {
    id: 903,
    manufacturerId: PLANT.taotao.id,
    productId: PRODUCT.cross180,
    quantity: 10,
    createdAt: "2026-07-15T05:00:00+00:00",
    expectedEndOn: "2026-08-01",
    status: "in_progress",
  });
  await completeOutput(client, {
    id: 903,
    productionOrderId: 903,
    productId: PRODUCT.cross180,
    quantity: 10,
    createdAt: "2026-08-01T08:00:00+00:00",
    expectedEndOn: "2026-08-01",
  });
  await client.rpc("store_set_production_status", { p_id: 903, p_status: "done" });
  await insertCustomerOrder(client, story, PRODUCT.cross180, 6);
  await postReservation(client, {
    id: 903,
    orderId: 903,
    productId: PRODUCT.cross180,
    quantity: 6,
    locationType: "warehouse",
    locationId: PLANT.taotao.warehouseId,
    createdAt: "2026-09-06T08:00:00+00:00",
  });
  await postShipment(client, {
    id: 903,
    orderId: 903,
    warehouseId: PLANT.taotao.warehouseId,
    productId: PRODUCT.cross180,
    quantity: 6,
    createdAt: "2026-09-09T09:20:00+00:00",
  });
};

const seedReleaseHeavy = async (client) => {
  const story = STORY_ORDERS[3];
  await insertProduction(client, {
    id: 904,
    manufacturerId: PLANT.sunyee.id,
    productId: PRODUCT.hummer320,
    quantity: 8,
    createdAt: "2026-08-25T06:00:00+00:00",
    expectedEndOn: "2026-09-02",
    status: "in_progress",
  });
  await completeOutput(client, {
    id: 904,
    productionOrderId: 904,
    productId: PRODUCT.hummer320,
    quantity: 8,
    createdAt: "2026-09-01T08:00:00+00:00",
    expectedEndOn: "2026-09-01",
  });
  await client.rpc("store_set_production_status", { p_id: 904, p_status: "done" });
  await insertCustomerOrder(client, story, PRODUCT.hummer320, 8);
  await postReservation(client, {
    id: 904,
    orderId: 904,
    productId: PRODUCT.hummer320,
    quantity: 8,
    locationType: "warehouse",
    locationId: PLANT.sunyee.warehouseId,
    createdAt: "2026-09-03T09:00:00+00:00",
  });
  await postRelease(client, {
    id: 904,
    orderId: 904,
    productId: PRODUCT.hummer320,
    quantity: 3,
    locationType: "warehouse",
    locationId: PLANT.sunyee.warehouseId,
    reason: "Dealer cut the order to five this month.",
    createdAt: "2026-09-07T10:00:00+00:00",
  });
  await deliverTransfer(client, {
    id: 904,
    fromWarehouseId: PLANT.sunyee.warehouseId,
    toWarehouseId: DUBAI_HUB,
    orderId: 904,
    productId: PRODUCT.hummer320,
    quantity: 5,
    createdAt: "2026-09-08T07:00:00+00:00",
    expectedEndOn: "2026-09-10",
  });
  await postShipment(client, {
    id: 904,
    orderId: 904,
    warehouseId: DUBAI_HUB,
    productId: PRODUCT.hummer320,
    quantity: 5,
    createdAt: "2026-09-10T12:00:00+00:00",
  });
};

const seedReturnHeavy = async (client) => {
  const story = STORY_ORDERS[4];
  await insertCustomerOrder(client, story, PRODUCT.cruiser300, 6);
  await insertProduction(client, {
    id: 905,
    manufacturerId: PLANT.taotao.id,
    productId: PRODUCT.cruiser300,
    quantity: 6,
    createdAt: "2026-08-21T06:00:00+00:00",
    expectedEndOn: "2026-09-04",
    status: "in_progress",
  });
  await postReservation(client, {
    id: 905,
    orderId: 905,
    productId: PRODUCT.cruiser300,
    quantity: 6,
    locationType: "production_order_line",
    locationId: 905,
    createdAt: "2026-08-21T06:10:00+00:00",
  });
  await completeOutput(client, {
    id: 905,
    productionOrderId: 905,
    productId: PRODUCT.cruiser300,
    quantity: 6,
    createdAt: "2026-09-04T08:30:00+00:00",
    expectedEndOn: "2026-09-04",
  });
  await client.rpc("store_set_production_status", { p_id: 905, p_status: "done" });
  await postShipment(client, {
    id: 905,
    orderId: 905,
    warehouseId: PLANT.taotao.warehouseId,
    productId: PRODUCT.cruiser300,
    quantity: 6,
    createdAt: "2026-09-06T09:00:00+00:00",
  });
  await postReturn(client, {
    id: 905,
    shipmentId: 905,
    shipmentLineId: 905,
    quantity: 2,
    createdAt: "2026-09-13T08:45:00+00:00",
  });
};

export const seedLogisticsStories = async ({ url, anon }) => {
  const client = createClient(url, anon);
  await resetStories(client);
  await seedSurplusThenReserve(client);
  await seedOrderThenProduce(client);
  await seedLeftoverAtPlant(client);
  await seedReleaseHeavy(client);
  await seedReturnHeavy(client);
  const orders = await client.get(
    `store_customer_order?id=gte.${STORY_LO}&id=lte.905&select=id&order=id.asc`,
  );
  return { orders: orders?.length ?? 0 };
};
