/**
 * Dedicated OMS-901..906 demo stories with a full logistics chain.
 * Uses existing logistics tables and post RPCs. Does not print secrets.
 */

export const STORY_LO = 901;
export const STORY_HI = 999;

const PRODUCT = {
  enduro250: 22,
  force1100: 1,
  cross180: 17,
  hummer320: 46,
  cruiser300: 36,
};

export const PLANT = {
  shineray: { id: 6, warehouseId: 7 },
  qianjiang: { id: 38, warehouseId: 41 },
  taotao: { id: 34, warehouseId: 40 },
  sunyee: { id: 12, warehouseId: 33 },
  koolcnchet: { id: 2, warehouseId: 3 },
  dayun: { id: 8, warehouseId: 9 },
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

export const MIXED_DEMO_ORDER = {
  id: 906,
  createdAt: "2026-09-18T16:00:00+00:00",
  expectedEndOn: "2026-10-10",
  description:
    "Twenty mixed SKUs for Allocation Atlas. Eighteen are reserved at the plant warehouse; two finished bikes sit free at their factories with no RSV on this order.",
  lines: [
    { id: 906, productId: 26, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 907, productId: 30, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 908, productId: 32, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 909, productId: 33, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 910, productId: 34, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 911, productId: 42, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 912, productId: 43, quantity: 2, plant: "qianjiang", reserve: true },
    { id: 913, productId: 44, quantity: 2, plant: "qianjiang", reserve: false },
    { id: 914, productId: 29, quantity: 2, plant: "taotao", reserve: true },
    { id: 915, productId: 207, quantity: 2, plant: "taotao", reserve: true },
    { id: 916, productId: 9, quantity: 2, plant: "taotao", reserve: true },
    { id: 917, productId: 10, quantity: 2, plant: "taotao", reserve: true },
    { id: 918, productId: 50, quantity: 2, plant: "taotao", reserve: false },
    { id: 919, productId: 12, quantity: 2, plant: "koolcnchet", reserve: true },
    { id: 920, productId: 14, quantity: 2, plant: "koolcnchet", reserve: true },
    { id: 921, productId: 129, quantity: 2, plant: "koolcnchet", reserve: true },
    { id: 922, productId: 130, quantity: 2, plant: "koolcnchet", reserve: true },
    { id: 923, productId: 47, quantity: 2, plant: "dayun", reserve: true },
    { id: 924, productId: 77, quantity: 2, plant: "dayun", reserve: true },
    { id: 925, productId: 89, quantity: 2, plant: "dayun", reserve: true },
  ],
};

export const mixedDemoLinesByWarehouse = (lines = MIXED_DEMO_ORDER.lines) => {
  const groups = new Map();
  for (const line of lines) {
    const plant = PLANT[line.plant];
    if (!plant) {
      throw new Error(`Unknown plant ${line.plant} for mixed demo line ${line.id}`);
    }
    const current = groups.get(plant.warehouseId) ?? {
      manufacturerId: plant.id,
      warehouseId: plant.warehouseId,
      plant: line.plant,
      lines: [],
    };
    current.lines.push(line);
    groups.set(plant.warehouseId, current);
  }
  return [...groups.values()];
};

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

const resetStories = async (client) => {
  await client.rpc("store_reset_logistics_stories", { p_lo: STORY_LO, p_hi: STORY_HI });
};

const insertCustomerOrderLines = async (client, story, lines) => {
  await client.insert("store_customer_order", {
    id: story.id,
    status: "open",
    created_at: story.createdAt,
    expected_end_on: story.expectedEndOn,
    description: story.description,
  });
  for (const line of lines) {
    await client.insert("store_customer_order_line", {
      id: line.id,
      order_id: story.id,
      product_id: line.productId,
      quantity: line.quantity,
    });
  }
};

const insertCustomerOrder = async (client, story, productId, quantity) => {
  await insertCustomerOrderLines(client, story, [{ id: story.id, productId, quantity }]);
};

const insertProduction = async (client, { id, manufacturerId, productId, quantity, lines, createdAt, expectedEndOn, status }) => {
  const resolvedLines = lines ?? [{ id, productId, quantity }];
  await client.insert("store_production_order", {
    id,
    manufacturer_id: manufacturerId,
    status: "draft",
    created_at: createdAt,
    expected_end_on: expectedEndOn,
  });
  for (const line of resolvedLines) {
    await client.insert("store_production_order_line", {
      id: line.id,
      order_id: id,
      product_id: line.productId,
      quantity: line.quantity,
      activated_quantity: 0,
    });
  }
  await client.rpc("store_sync_production_activation", { p_id: id });
  if (status && status !== "draft") {
    await client.rpc("store_set_production_status", { p_id: id, p_status: status });
  }
};

const completeOutput = async (client, { id, productionOrderId, productId, quantity, lines, createdAt, expectedEndOn }) => {
  const resolvedLines = lines ?? [{ id, productionOrderLineId: productionOrderId, productId, quantity }];
  await client.insert("store_output", {
    id,
    production_order_id: productionOrderId,
    status: "planned",
    created_at: createdAt,
    expected_end_on: expectedEndOn,
  });
  for (const line of resolvedLines) {
    await client.insert("store_output_line", {
      id: line.id,
      output_id: id,
      production_order_line_id: line.productionOrderLineId,
      product_id: line.productId,
      quantity: line.quantity,
    });
  }
  await client.rpc("store_complete_output", { p_id: id });
};

const postReservation = async (client, {
  id,
  orderId,
  productId,
  quantity,
  locationType,
  locationId,
  createdAt,
  operation = "reserve",
  toOwnerType,
  toOwnerId,
  fromOwnerType,
  fromOwnerId,
  note = "",
  lines,
}) => {
  const isRelease = operation === "release";
  const destType = toOwnerType !== undefined ? toOwnerType : isRelease ? null : "order";
  const destId = toOwnerId !== undefined ? toOwnerId : isRelease ? null : orderId;
  const sourceType = fromOwnerType !== undefined ? fromOwnerType : isRelease ? "order" : null;
  const sourceId = fromOwnerId !== undefined ? fromOwnerId : isRelease ? orderId : null;
  const resolvedLines = lines ?? [{ id, productId, quantity, fromOwnerType: sourceType, fromOwnerId: sourceId }];
  await client.insert("store_reservation", {
    id,
    location_type: locationType,
    location_id: locationId,
    to_owner_type: destType,
    to_owner_id: destId,
    origin: "manual",
    note,
    status: "draft",
    created_at: createdAt,
  });
  for (const line of resolvedLines) {
    await client.insert("store_reservation_line", {
      id: line.id,
      reservation_id: id,
      product_id: line.productId ?? productId,
      quantity: line.quantity,
      from_owner_type: line.fromOwnerType !== undefined ? line.fromOwnerType : sourceType,
      from_owner_id: line.fromOwnerId !== undefined ? line.fromOwnerId : sourceId,
    });
  }
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
  await client.rpc("store_create_and_send_transfer", {
    p_request_key: `seed:transfer:${id}`,
    p_from_warehouse_id: fromWarehouseId,
    p_to_warehouse_id: toWarehouseId,
    p_expected_end_on: expectedEndOn,
    p_id: id,
    p_created_at: createdAt,
    p_lines: [
      {
        product_id: productId,
        quantity,
        owner_type: "order",
        owner_id: orderId,
      },
    ],
  });
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
    id: 934,
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

export const seedMixedDemoOrder = async (client) => {
  const story = MIXED_DEMO_ORDER;
  await insertCustomerOrderLines(client, story, story.lines);
  const groups = mixedDemoLinesByWarehouse(story.lines);
  let documentId = story.id;
  for (const group of groups) {
    const poId = documentId;
    const outputId = documentId;
    const reservationId = documentId;
    documentId += 1;
    await insertProduction(client, {
      id: poId,
      manufacturerId: group.manufacturerId,
      lines: group.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
      })),
      createdAt: "2026-09-10T06:00:00+00:00",
      expectedEndOn: "2026-09-16",
      status: "in_progress",
    });
    await completeOutput(client, {
      id: outputId,
      productionOrderId: poId,
      lines: group.lines.map((line) => ({
        id: line.id,
        productionOrderLineId: line.id,
        productId: line.productId,
        quantity: line.quantity,
      })),
      createdAt: "2026-09-16T08:00:00+00:00",
      expectedEndOn: "2026-09-16",
    });
    await client.rpc("store_set_production_status", { p_id: poId, p_status: "done" });
    const reserved = group.lines.filter((line) => line.reserve);
    if (reserved.length === 0) {
      continue;
    }
    await postReservation(client, {
      id: reservationId,
      orderId: story.id,
      locationType: "warehouse",
      locationId: group.warehouseId,
      createdAt: "2026-09-18T16:30:00+00:00",
      lines: reserved.map((line) => ({
        id: line.id,
        productId: line.productId,
        quantity: line.quantity,
      })),
    });
  }
};

export const seedLogisticsStories = async ({ url, anon }) => {
  const client = createClient(url, anon);
  await resetStories(client);
  await seedSurplusThenReserve(client);
  await seedOrderThenProduce(client);
  await seedLeftoverAtPlant(client);
  await seedReleaseHeavy(client);
  await seedReturnHeavy(client);
  await seedMixedDemoOrder(client);
  await postReservation(client, {
    id: 930,
    productId: PRODUCT.enduro250,
    quantity: 2,
    locationType: "warehouse",
    locationId: PLANT.shineray.warehouseId,
    createdAt: "2026-09-18T18:00:00+00:00",
    toOwnerType: "region",
    toOwnerId: 1,
    fromOwnerType: null,
    fromOwnerId: null,
    note: "Regional pool for reassign demos",
  });
  const orders = await client.get(
    `store_customer_order?id=gte.${STORY_LO}&id=lte.${STORY_HI}&select=id&order=id.asc`,
  );
  return { orders: orders?.length ?? 0 };
};
