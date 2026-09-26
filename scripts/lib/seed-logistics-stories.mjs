/**
 * Rich demo logistics stories for the clean Store baseline.
 * Privileged service_role client only. Uses command RPCs; balances stay non-negative.
 */

export const STORY_LO = 901;
export const STORY_HI = 999;

const PRODUCT = {
  enduro250: "22",
  force1100: "1",
  cross180: "17",
  hummer320: "46",
  cruiser300: "36",
  fx350: "26",
  rst240: "30",
  rst322: "32",
  rst422: "33",
  rst750: "34",
  gp401: "42",
  gp881: "43",
  gp1100: "44",
  activator280: "29",
  crossE200: "207",
  seater2: "9",
  seater4: "10",
  cross130: "50",
  powerMax250: "12",
  powerMax320: "14",
  powerMax145: "129",
  powerMax190: "130",
  gl300: "47",
  enduro351: "77",
  rst501: "89",
};

const PLANT = {
  shineray: { id: "6", warehouseId: "7" },
  qianjiang: { id: "38", warehouseId: "41" },
  taotao: { id: "34", warehouseId: "40" },
  sunyee: { id: "12", warehouseId: "33" },
  koolcnchet: { id: "2", warehouseId: "3" },
  dayun: { id: "8", warehouseId: "9" },
};

const DUBAI_HUB = "11";

const rpc = async (url, key, name, args) => {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`rpc ${name} failed: ${res.status} (${body.slice(0, 240)})`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const restGet = async (url, key, path) => {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return res.json();
};

const restPatch = async (url, key, path, body) => {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed: ${res.status} (${text.slice(0, 240)})`);
  }
};

/**
 * @param {{
 *   url: string,
 *   serviceKey: string,
 *   regionId: string,
 *   variantIdByOldProduct: Map<string, string>,
 *   plantIdByOld: Map<string, string>,
 *   warehouseIdByOld: Map<string, string>,
 * }} args
 */
export const seedLogisticsStories = async (args) => {
  const { url, serviceKey, regionId, variantIdByOldProduct, plantIdByOld, warehouseIdByOld } = args;
  const call = (name, body) => rpc(url, serviceKey, name, body);
  const get = (path) => restGet(url, serviceKey, path);
  const patch = (path, body) => restPatch(url, serviceKey, path, body);

  const v = (key) => {
    const id = variantIdByOldProduct.get(PRODUCT[key] ?? key);
    if (!id) throw new Error(`variant missing for ${key}`);
    return Number(id);
  };
  const plant = (key) => {
    const cfg = PLANT[key];
    const id = plantIdByOld.get(cfg.id);
    if (!id) throw new Error(`plant missing for ${key}`);
    return Number(id);
  };
  const wh = (keyOrOldId) => {
    const oldId = PLANT[keyOrOldId]?.warehouseId ?? String(keyOrOldId);
    const id = warehouseIdByOld.get(oldId);
    if (!id) throw new Error(`warehouse missing for ${keyOrOldId}`);
    return Number(id);
  };
  const whLoc = async (warehouseId) => {
    const rows = await get(`store_warehouse?id=eq.${warehouseId}&select=stock_location_id`);
    const loc = rows?.[0]?.stock_location_id;
    if (!loc) throw new Error(`warehouse location missing for ${warehouseId}`);
    return Number(loc);
  };
  const orderMeta = async (orderId) => {
    const rows = await get(
      `store_customer_order?id=eq.${orderId}&select=stock_owner_id,stock_location_id`,
    );
    if (!rows?.[0]) throw new Error(`customer order ${orderId} missing`);
    return {
      ownerId: Number(rows[0].stock_owner_id),
      locationId: Number(rows[0].stock_location_id),
    };
  };

  const required = [
    "enduro250",
    "force1100",
    "cross180",
    "hummer320",
    "cruiser300",
    "fx350",
    "rst240",
    "powerMax250",
    "gl300",
  ];
  for (const key of required) {
    if (!variantIdByOldProduct.get(PRODUCT[key])) {
      console.log(`story_skip missing_variant ${key}`);
      return { orders: 0 };
    }
  }
  for (const key of Object.keys(PLANT)) {
    if (!plantIdByOld.get(PLANT[key].id) || !warehouseIdByOld.get(PLANT[key].warehouseId)) {
      console.log(`story_skip missing_plant ${key}`);
      return { orders: 0 };
    }
  }
  if (!warehouseIdByOld.get(DUBAI_HUB)) {
    console.log("story_skip missing_dubai_hub");
    return { orders: 0 };
  }

  const shinerayWh = wh("shineray");
  const qianjiangWh = wh("qianjiang");
  const taotaoWh = wh("taotao");
  const sunyeeWh = wh("sunyee");
  const koolWh = wh("koolcnchet");
  const dayunWh = wh("dayun");
  const dubaiWh = wh(DUBAI_HUB);

  const shinerayLoc = await whLoc(shinerayWh);
  const qianjiangLoc = await whLoc(qianjiangWh);
  const taotaoLoc = await whLoc(taotaoWh);
  const sunyeeLoc = await whLoc(sunyeeWh);
  const koolLoc = await whLoc(koolWh);
  const dayunLoc = await whLoc(dayunWh);
  const dubaiLoc = await whLoc(dubaiWh);

  // ---------------------------------------------------------------------------
  // Bootstrap free stock (signed adjustment can mix +/−; opener is all positive)
  // ---------------------------------------------------------------------------
  await call("store_create_and_post_adjustment", {
    p_location_id: shinerayLoc,
    p_description: "Начальный остаток Shineray для демо-историй",
    p_sequence_number: 901,
    p_lines: [
      { product_variant_id: v("enduro250"), quantity: 40 },
      { product_variant_id: v("force1100"), quantity: 8 },
    ],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: qianjiangLoc,
    p_description: "Начальный остаток Qianjiang",
    p_sequence_number: 902,
    p_lines: [
      { product_variant_id: v("force1100"), quantity: 30 },
      { product_variant_id: v("fx350"), quantity: 20 },
      { product_variant_id: v("rst240"), quantity: 20 },
      { product_variant_id: v("rst322"), quantity: 16 },
      { product_variant_id: v("rst422"), quantity: 16 },
      { product_variant_id: v("rst750"), quantity: 12 },
      { product_variant_id: v("gp401"), quantity: 12 },
      { product_variant_id: v("gp881"), quantity: 10 },
      { product_variant_id: v("gp1100"), quantity: 8 },
    ],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: taotaoLoc,
    p_description: "Начальный остаток Taotao",
    p_sequence_number: 903,
    p_lines: [
      { product_variant_id: v("cross180"), quantity: 24 },
      { product_variant_id: v("cruiser300"), quantity: 18 },
      { product_variant_id: v("activator280"), quantity: 16 },
      { product_variant_id: v("crossE200"), quantity: 14 },
      { product_variant_id: v("seater2"), quantity: 12 },
      { product_variant_id: v("seater4"), quantity: 12 },
      { product_variant_id: v("cross130"), quantity: 10 },
    ],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: sunyeeLoc,
    p_description: "Начальный остаток Sunyee",
    p_sequence_number: 904,
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 20 }],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: koolLoc,
    p_description: "Начальный остаток Koolcnchet",
    p_sequence_number: 905,
    p_lines: [
      { product_variant_id: v("powerMax250"), quantity: 16 },
      { product_variant_id: v("powerMax320"), quantity: 14 },
      { product_variant_id: v("powerMax145"), quantity: 12 },
      { product_variant_id: v("powerMax190"), quantity: 12 },
    ],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: dayunLoc,
    p_description: "Начальный остаток Dayun",
    p_sequence_number: 906,
    p_lines: [
      { product_variant_id: v("gl300"), quantity: 14 },
      { product_variant_id: v("enduro351"), quantity: 12 },
      { product_variant_id: v("rst501"), quantity: 10 },
    ],
  });
  // Positive stock at Dubai hub, then a separate signed write-off
  await call("store_create_and_post_adjustment", {
    p_location_id: dubaiLoc,
    p_description: "Начальный остаток Dubai Hub",
    p_sequence_number: 910,
    p_lines: [
      { product_variant_id: v("enduro250"), quantity: 10 },
      { product_variant_id: v("cross180"), quantity: 8 },
      { product_variant_id: v("force1100"), quantity: 6 },
    ],
  });
  await call("store_create_and_post_adjustment", {
    p_location_id: dubaiLoc,
    p_description: "Инвентаризация Dubai Hub: списание Enduro",
    p_sequence_number: 911,
    p_lines: [{ product_variant_id: v("enduro250"), quantity: -2 }],
  });

  const regions = await get(`store_region?id=eq.${regionId}&select=stock_owner_id`);
  const regionOwner = Number(regions?.[0]?.stock_owner_id);

  // ---------------------------------------------------------------------------
  // Customer story orders OMS-901..906
  // ---------------------------------------------------------------------------
  const order901 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: Enduro со склада завода — 4 из свободного остатка",
    p_expected_end_on: "2026-09-15",
    p_sequence_number: 901,
    p_created_at: "2026-09-02T08:10:00+00:00",
    p_lines: [{ product_variant_id: v("enduro250"), quantity: 4 }],
  });
  const order902 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: производство Force 1100 под заказ дилера",
    p_expected_end_on: "2026-09-20",
    p_sequence_number: 902,
    p_created_at: "2026-09-01T09:00:00+00:00",
    p_lines: [{ product_variant_id: v("force1100"), quantity: 3 }],
  });
  const order903 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: Cross 180 со склада Taotao",
    p_expected_end_on: "2026-09-18",
    p_sequence_number: 903,
    p_created_at: "2026-09-05T10:15:00+00:00",
    p_lines: [{ product_variant_id: v("cross180"), quantity: 6 }],
  });
  const order904 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: Hummer — резерв, частичный отпуск, отгрузка",
    p_expected_end_on: "2026-09-22",
    p_sequence_number: 904,
    p_created_at: "2026-09-02T11:40:00+00:00",
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 8 }],
  });
  const order905 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: Cruiser с возвратом двух единиц",
    p_expected_end_on: "2026-09-16",
    p_sequence_number: 905,
    p_created_at: "2026-08-20T07:30:00+00:00",
    p_lines: [{ product_variant_id: v("cruiser300"), quantity: 6 }],
  });
  const order906 = await call("store_create_customer_order", {
    p_region_id: Number(regionId),
    p_description: "Демо: смешанный заказ для атласа аллокаций",
    p_expected_end_on: "2026-10-10",
    p_sequence_number: 906,
    p_created_at: "2026-09-18T16:00:00+00:00",
    p_lines: [
      { product_variant_id: v("fx350"), quantity: 2 },
      { product_variant_id: v("rst240"), quantity: 2 },
      { product_variant_id: v("rst322"), quantity: 2 },
      { product_variant_id: v("rst422"), quantity: 2 },
      { product_variant_id: v("rst750"), quantity: 2 },
      { product_variant_id: v("gp401"), quantity: 2 },
      { product_variant_id: v("gp881"), quantity: 2 },
      { product_variant_id: v("gp1100"), quantity: 2 },
      { product_variant_id: v("activator280"), quantity: 2 },
      { product_variant_id: v("crossE200"), quantity: 2 },
      { product_variant_id: v("seater2"), quantity: 2 },
      { product_variant_id: v("seater4"), quantity: 2 },
      { product_variant_id: v("cross130"), quantity: 2 },
      { product_variant_id: v("powerMax250"), quantity: 2 },
      { product_variant_id: v("powerMax320"), quantity: 2 },
      { product_variant_id: v("powerMax145"), quantity: 2 },
      { product_variant_id: v("powerMax190"), quantity: 2 },
      { product_variant_id: v("gl300"), quantity: 2 },
      { product_variant_id: v("enduro351"), quantity: 2 },
      { product_variant_id: v("rst501"), quantity: 2 },
    ],
  });

  // Mixed orders OMS-907..910: 1–4 plants and 5–20 lines each, 5–20 pcs, no stock movements.
  // Keys are snapshot product ids (scripts/data/logistics-demo.json).
  const bulkOrders = [
    {
      sequence: 907,
      regionCode: "ru",
      description: "Демо: сборный заказ дилера с двух заводов",
      createdAt: "2026-09-19T08:20:00+00:00",
      expectedEndOn: "2026-11-20",
      lines: [
        ["1", 8], ["26", 12], ["30", 15], ["32", 10], ["42", 6], ["43", 9], ["90", 14],
        ["17", 10], ["29", 7], ["36", 12], ["207", 16], ["50", 20],
      ],
    },
    {
      sequence: 908,
      regionCode: "kz",
      description: "Демо: поставка для сети салонов к Новому году",
      createdAt: "2026-09-21T11:05:00+00:00",
      expectedEndOn: "2026-12-05",
      lines: [
        ["44", 5], ["49", 7], ["62", 6], ["109", 5], ["52", 9], ["54", 8], ["99", 11], ["19", 6],
      ],
    },
    {
      sequence: 909,
      regionCode: "mx",
      description: "Демо: первый заказ нового дистрибьютора",
      createdAt: "2026-09-23T14:40:00+00:00",
      expectedEndOn: "2026-12-15",
      lines: [
        ["24", 20], ["25", 15], ["78", 12], ["80", 18], ["83", 9], ["84", 10],
        ["47", 7], ["77", 11], ["89", 8], ["95", 13], ["134", 6],
        ["11", 14], ["57", 9], ["58", 12], ["150", 5],
      ],
    },
    {
      sequence: 910,
      regionCode: "de",
      description: "Демо: пополнение ассортимента к сезону",
      createdAt: "2026-09-24T09:30:00+00:00",
      expectedEndOn: "2027-01-20",
      lines: [
        ["12", 10], ["14", 8], ["129", 15], ["130", 12], ["60", 6], ["61", 9],
        ["9", 5], ["10", 7], ["142", 5], ["38", 11],
        ["85", 8], ["91", 6], ["92", 14], ["158", 10], ["180", 9],
        ["53", 7], ["39", 12], ["174", 6], ["175", 8], ["189", 5],
      ],
    },
  ];
  for (const order of bulkOrders) {
    const regionRows = await get(`store_region?code=eq.${order.regionCode}&select=id`);
    const bulkRegionId = Number(regionRows?.[0]?.id ?? regionId);
    await call("store_create_customer_order", {
      p_region_id: bulkRegionId,
      p_description: order.description,
      p_expected_end_on: order.expectedEndOn,
      p_sequence_number: order.sequence,
      p_created_at: order.createdAt,
      p_lines: order.lines.map(([key, quantity]) => ({ product_variant_id: v(key), quantity })),
    });
  }

  // Hub orders OMS-921..930 from Dubai Hub: 5–10 lines from 3–5 plants each, no stock movements.
  // Keys are snapshot product ids; the hub limit is soft, so quantities may exceed hub stock.
  const hubOrders = [
    {
      sequence: 921,
      regionCode: "ae",
      description: "Демо: дилер Дубая, пополнение витрины",
      createdAt: "2026-09-19T07:45:00+00:00",
      expectedEndOn: "2026-10-20",
      lines: [["1", 4], ["30", 6], ["17", 8], ["36", 5], ["47", 10], ["77", 6]],
    },
    {
      sequence: 922,
      regionCode: "om",
      description: "Демо: Маскат, квадроциклы и багги к сезону",
      createdAt: "2026-09-19T13:20:00+00:00",
      expectedEndOn: "2026-10-25",
      lines: [["12", 6], ["130", 8], ["9", 3], ["10", 4], ["78", 10], ["53", 5], ["174", 4]],
    },
    {
      sequence: 923,
      regionCode: "in",
      description: "Демо: Мумбаи, скутеры и лёгкие мотоциклы",
      createdAt: "2026-09-20T09:10:00+00:00",
      expectedEndOn: "2026-11-05",
      lines: [["24", 12], ["25", 10], ["80", 8], ["95", 6], ["134", 6], ["11", 5], ["57", 7], ["58", 4]],
    },
    {
      sequence: 924,
      regionCode: "ru",
      description: "Демо: сборный заказ через Dubai Hub",
      createdAt: "2026-09-21T06:30:00+00:00",
      expectedEndOn: "2026-11-10",
      lines: [
        ["42", 3], ["43", 3], ["44", 2], ["22", 6], ["29", 4], ["207", 5], ["39", 4], ["31", 8], ["128", 6],
      ],
    },
    {
      sequence: 925,
      regionCode: "kz",
      description: "Демо: Алматы, срочная догрузка",
      createdAt: "2026-09-22T10:00:00+00:00",
      expectedEndOn: "2026-10-15",
      lines: [["14", 6], ["61", 5], ["92", 7], ["89", 4], ["156", 5]],
    },
    {
      sequence: 926,
      regionCode: "uz",
      description: "Демо: Ташкент, мопеды и детская техника",
      createdAt: "2026-09-22T15:40:00+00:00",
      expectedEndOn: "2026-11-20",
      lines: [
        ["37", 10], ["79", 12], ["181", 15], ["76", 4], ["150", 3], ["187", 5],
        ["141", 2], ["155", 2], ["50", 8], ["74", 10],
      ],
    },
    {
      sequence: 927,
      regionCode: "by",
      description: "Демо: Минск, эндуро и спорт",
      createdAt: "2026-09-23T08:15:00+00:00",
      expectedEndOn: "2026-11-15",
      lines: [["26", 5], ["32", 4], ["23", 6], ["118", 3], ["46", 4], ["51", 3]],
    },
    {
      sequence: 928,
      regionCode: "de",
      description: "Демо: гольф-кары и квадроциклы для прокатов",
      createdAt: "2026-09-24T07:05:00+00:00",
      expectedEndOn: "2026-12-01",
      lines: [["144", 2], ["146", 3], ["142", 2], ["129", 6], ["85", 4], ["158", 3], ["173", 5], ["175", 3]],
    },
    {
      sequence: 929,
      regionCode: "mx",
      description: "Демо: Монтеррей, мотоциклы Latina",
      createdAt: "2026-09-24T16:50:00+00:00",
      expectedEndOn: "2026-12-10",
      lines: [["98", 8], ["107", 3], ["88", 10], ["137", 6], ["83", 6], ["179", 4], ["15", 3]],
    },
    {
      sequence: 930,
      regionCode: "ae",
      description: "Демо: Абу-Даби, флагманские модели",
      createdAt: "2026-09-25T09:25:00+00:00",
      expectedEndOn: "2026-11-30",
      lines: [["33", 3], ["34", 2], ["49", 4], ["62", 3], ["38", 5], ["133", 3], ["48", 4], ["147", 1], ["60", 5]],
    },
  ];
  for (const order of hubOrders) {
    const regionRows = await get(`store_region?code=eq.${order.regionCode}&select=id`);
    await call("store_create_customer_order", {
      p_region_id: Number(regionRows?.[0]?.id ?? regionId),
      p_description: order.description,
      p_expected_end_on: order.expectedEndOn,
      p_sequence_number: order.sequence,
      p_created_at: order.createdAt,
      p_source_kind: "hub",
      p_source_id: dubaiWh,
      p_lines: order.lines.map(([key, quantity]) => ({ product_variant_id: v(key), quantity })),
    });
  }

  const meta901 = await orderMeta(order901.id);
  const meta902 = await orderMeta(order902.id);
  const meta903 = await orderMeta(order903.id);
  const meta904 = await orderMeta(order904.id);
  const meta905 = await orderMeta(order905.id);
  const meta906 = await orderMeta(order906.id);

  // ---------------------------------------------------------------------------
  // Production orders (~13) in draft / in_progress / done + outputs (~10)
  // ---------------------------------------------------------------------------
  const poDraft1 = await call("store_create_production_order", {
    p_plant_id: plant("shineray"),
    p_status: "draft",
    p_expected_end_on: "2026-10-05",
    p_sequence_number: 901,
    p_description: "Черновик: Enduro на Shineray",
    p_lines: [{ product_variant_id: v("enduro250"), quantity: 5 }],
  });
  const poDraft2 = await call("store_create_production_order", {
    p_plant_id: plant("taotao"),
    p_status: "in_progress",
    p_expected_end_on: "2026-10-08",
    p_sequence_number: 902,
    p_description: "В работе: Cross 180",
    p_lines: [{ product_variant_id: v("cross180"), quantity: 4 }],
  });
  const poDraft3 = await call("store_create_production_order", {
    p_plant_id: plant("koolcnchet"),
    p_status: "draft",
    p_expected_end_on: "2026-10-12",
    p_sequence_number: 903,
    p_description: "Черновик: Power Max",
    p_lines: [
      { product_variant_id: v("powerMax250"), quantity: 3 },
      { product_variant_id: v("powerMax320"), quantity: 2 },
    ],
  });

  const poOpen1 = await call("store_create_production_order", {
    p_plant_id: plant("qianjiang"),
    p_status: "in_progress",
    p_expected_end_on: "2026-09-25",
    p_sequence_number: 904,
    p_description: "В работе: Force под OMS-902",
    p_lines: [{ product_variant_id: v("force1100"), quantity: 6 }],
  });
  const poOpen2 = await call("store_create_production_order", {
    p_plant_id: plant("taotao"),
    p_status: "in_progress",
    p_expected_end_on: "2026-09-28",
    p_sequence_number: 905,
    p_description: "В работе: Cruiser",
    p_lines: [{ product_variant_id: v("cruiser300"), quantity: 5 }],
  });
  const poOpen3 = await call("store_create_production_order", {
    p_plant_id: plant("sunyee"),
    p_status: "in_progress",
    p_expected_end_on: "2026-09-30",
    p_sequence_number: 906,
    p_description: "В работе: Hummer",
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 4 }],
  });
  const poOpen4 = await call("store_create_production_order", {
    p_plant_id: plant("dayun"),
    p_status: "in_progress",
    p_expected_end_on: "2026-10-02",
    p_sequence_number: 907,
    p_description: "В работе: Dayun mix",
    p_lines: [
      { product_variant_id: v("gl300"), quantity: 3 },
      { product_variant_id: v("enduro351"), quantity: 2 },
    ],
  });

  // Partial output on open PO (leaves PO in_progress)
  await call("store_create_production_output", {
    p_production_order_id: Number(poOpen1.id),
    p_complete: true,
    p_sequence_number: 901,
    p_description: "Частичный выпуск Force",
    p_lines: [{ product_variant_id: v("force1100"), quantity: 3, allocation_owner_id: 1 }],
  });
  await call("store_create_production_output", {
    p_production_order_id: Number(poOpen2.id),
    p_complete: true,
    p_sequence_number: 902,
    p_description: "Частичный выпуск Cruiser",
    p_lines: [{ product_variant_id: v("cruiser300"), quantity: 2, allocation_owner_id: 1 }],
  });
  await call("store_create_production_output", {
    p_production_order_id: Number(poOpen3.id),
    p_complete: true,
    p_sequence_number: 903,
    p_description: "Частичный выпуск Hummer",
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 2, allocation_owner_id: 1 }],
  });
  await call("store_create_production_output", {
    p_production_order_id: Number(poOpen4.id),
    p_complete: true,
    p_sequence_number: 904,
    p_description: "Частичный выпуск Dayun mix",
    p_lines: [
      { product_variant_id: v("gl300"), quantity: 1, allocation_owner_id: 1 },
      { product_variant_id: v("enduro351"), quantity: 1, allocation_owner_id: 1 },
    ],
  });

  const doneSpecs = [
    {
      seq: 910,
      plant: "shineray",
      desc: "Закрыт: Enduro batch",
      lines: [{ product_variant_id: v("enduro250"), quantity: 8 }],
      outSeq: 910,
      outQty: 8,
    },
    {
      seq: 911,
      plant: "qianjiang",
      desc: "Закрыт: FX/RST batch",
      lines: [
        { product_variant_id: v("fx350"), quantity: 4 },
        { product_variant_id: v("rst240"), quantity: 4 },
      ],
      outSeq: 911,
      multiOut: true,
    },
    {
      seq: 912,
      plant: "taotao",
      desc: "Закрыт: Cross batch",
      lines: [{ product_variant_id: v("cross180"), quantity: 6 }],
      outSeq: 912,
      outQty: 6,
      variant: "cross180",
    },
    {
      seq: 913,
      plant: "sunyee",
      desc: "Закрыт: Hummer batch",
      lines: [{ product_variant_id: v("hummer320"), quantity: 5 }],
      outSeq: 913,
      outQty: 5,
      variant: "hummer320",
    },
    {
      seq: 914,
      plant: "koolcnchet",
      desc: "Закрыт: Power Max batch",
      lines: [
        { product_variant_id: v("powerMax145"), quantity: 3 },
        { product_variant_id: v("powerMax190"), quantity: 3 },
      ],
      outSeq: 914,
      multiOut: true,
    },
    {
      seq: 915,
      plant: "dayun",
      desc: "Закрыт: RST-501",
      lines: [{ product_variant_id: v("rst501"), quantity: 4 }],
      outSeq: 915,
      outQty: 4,
      variant: "rst501",
    },
  ];

  for (const spec of doneSpecs) {
    const po = await call("store_create_production_order", {
      p_plant_id: plant(spec.plant),
      p_status: "in_progress",
      p_expected_end_on: "2026-09-12",
      p_sequence_number: spec.seq,
      p_description: spec.desc,
      p_lines: spec.lines,
    });
    await call("store_create_production_output", {
      p_production_order_id: Number(po.id),
      p_complete: true,
      p_sequence_number: spec.outSeq,
      p_description: `Выпуск ${spec.desc}`,
      p_lines: spec.lines.map((line) => ({
        product_variant_id: line.product_variant_id,
        quantity: line.quantity,
        allocation_owner_id: 1,
      })),
    });
    await call("store_close_production_order", { p_id: Number(po.id) });
  }

  // Extra open PO without output yet
  const poGpOpen = await call("store_create_production_order", {
    p_plant_id: plant("qianjiang"),
    p_status: "in_progress",
    p_expected_end_on: "2026-10-15",
    p_sequence_number: 920,
    p_description: "В работе: GP серия без выпуска",
    p_lines: [
      { product_variant_id: v("gp401"), quantity: 5 },
      { product_variant_id: v("gp881"), quantity: 4 },
    ],
  });

  // Cancelled in seedOrderMoney after its payments are recorded: payments stay in the card, not in the calendar.
  await call("store_create_production_order", {
    p_plant_id: plant("sunyee"),
    p_status: "in_progress",
    p_expected_end_on: "2026-10-30",
    p_sequence_number: 908,
    p_description: "Отменён: Hummer — платежи остались в карточке",
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 2 }],
  });

  // ---------------------------------------------------------------------------
  // Calendar demo: open outputs on existing POs (for /store/logistics/calendar)
  // Sequences 930+ — live DB already has OUT-917…921 from earlier stories.
  // ---------------------------------------------------------------------------
  const calOut = async ({
    poId,
    seq,
    description,
    expectedEndOn,
    lines,
  }) => {
    const created = await call("store_create_production_output", {
      p_production_order_id: Number(poId),
      p_complete: false,
      p_expected_end_on: expectedEndOn,
      p_sequence_number: seq,
      p_description: description,
      p_lines: lines,
    });
    return created;
  };

  // Overdue in_progress (Aug 2026) — Cross on PO-902
  await calOut({
    poId: poDraft2.id,
    seq: 930,
    description: "Календарь: просрочка Cross август",
    expectedEndOn: "2026-08-18",
    lines: [{ product_variant_id: v("cross180"), quantity: 2, allocation_owner_id: 1 }],
  });

  // Force 1100 to November with region reserve on part of qty — PO-904 remaining 3
  await calOut({
    poId: poOpen1.id,
    seq: 931,
    description: "Календарь: Force к ноябрю с резервом региона",
    expectedEndOn: "2026-11-20",
    lines: [
      {
        product_variant_id: v("force1100"),
        quantity: 3,
        allocation_owner_id: regionOwner,
        allocation_quantity: 2,
      },
    ],
  });

  // Draft without deadline — Enduro on PO-901
  await calOut({
    poId: poDraft1.id,
    seq: 932,
    description: "Календарь: Enduro без срока",
    expectedEndOn: null,
    lines: [{ product_variant_id: v("enduro250"), quantity: 2, allocation_owner_id: 1 }],
  });

  // December — Cruiser on PO-905
  await calOut({
    poId: poOpen2.id,
    seq: 933,
    description: "Календарь: Cruiser декабрь",
    expectedEndOn: "2026-12-15",
    lines: [{ product_variant_id: v("cruiser300"), quantity: 2, allocation_owner_id: 1 }],
  });

  // January — Hummer on PO-906 (other plant)
  await calOut({
    poId: poOpen3.id,
    seq: 934,
    description: "Календарь: Hummer январь",
    expectedEndOn: "2027-01-20",
    lines: [{ product_variant_id: v("hummer320"), quantity: 1, allocation_owner_id: 1 }],
  });

  // December — GP-401 on PO-920
  await calOut({
    poId: poGpOpen.id,
    seq: 935,
    description: "Календарь: GP401 декабрь",
    expectedEndOn: "2026-12-28",
    lines: [{ product_variant_id: v("gp401"), quantity: 2, allocation_owner_id: 1 }],
  });

  // November — Power Max on PO-903 (another plant)
  await calOut({
    poId: poDraft3.id,
    seq: 936,
    description: "Календарь: Power Max ноябрь",
    expectedEndOn: "2026-11-10",
    lines: [{ product_variant_id: v("powerMax250"), quantity: 2, allocation_owner_id: 1 }],
  });

  void poOpen4;

  // ---------------------------------------------------------------------------
  // Reservations (~26): free→order, free→region, release back to free
  // ---------------------------------------------------------------------------
  let rsvSeq = 901;
  const reserve = async ({ locationId, ownerId, description, lines }) => {
    const seq = rsvSeq;
    rsvSeq += 1;
    return call("store_create_and_post_reservation", {
      p_location_id: locationId,
      p_owner_id: ownerId,
      p_description: description,
      p_creation_source: "manual",
      p_sequence_number: seq,
      p_lines: lines,
    });
  };

  // OMS-901: reserve then ship Enduro
  await reserve({
    locationId: shinerayLoc,
    ownerId: meta901.ownerId,
    description: "Резерв Enduro для OMS-901",
    lines: [{ product_variant_id: v("enduro250"), quantity: 4, from_owner_id: 1 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: shinerayLoc,
    p_to_location_id: meta901.locationId,
    p_description: "Отгрузка OMS-901",
    p_sequence_number: 901,
    p_lines: [{ product_variant_id: v("enduro250"), quantity: 4 }],
  });

  // OMS-902: reserve Force after production output, ship
  await reserve({
    locationId: qianjiangLoc,
    ownerId: meta902.ownerId,
    description: "Резерв Force для OMS-902",
    lines: [{ product_variant_id: v("force1100"), quantity: 3, from_owner_id: 1 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: qianjiangLoc,
    p_to_location_id: meta902.locationId,
    p_description: "Отгрузка OMS-902",
    p_sequence_number: 902,
    p_lines: [{ product_variant_id: v("force1100"), quantity: 3 }],
  });

  // OMS-903
  await reserve({
    locationId: taotaoLoc,
    ownerId: meta903.ownerId,
    description: "Резерв Cross для OMS-903",
    lines: [{ product_variant_id: v("cross180"), quantity: 6, from_owner_id: 1 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: taotaoLoc,
    p_to_location_id: meta903.locationId,
    p_description: "Отгрузка OMS-903",
    p_sequence_number: 903,
    p_lines: [{ product_variant_id: v("cross180"), quantity: 6 }],
  });

  // OMS-904: reserve 8, release 3 back to free, ship 5
  await reserve({
    locationId: sunyeeLoc,
    ownerId: meta904.ownerId,
    description: "Резерв Hummer для OMS-904 (8)",
    lines: [{ product_variant_id: v("hummer320"), quantity: 8, from_owner_id: 1 }],
  });
  await reserve({
    locationId: sunyeeLoc,
    ownerId: 1,
    description: "Снятие 3 Hummer с OMS-904 обратно в свободный",
    lines: [{ product_variant_id: v("hummer320"), quantity: 3, from_owner_id: meta904.ownerId }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: sunyeeLoc,
    p_to_location_id: meta904.locationId,
    p_description: "Отгрузка OMS-904 (5 из 8)",
    p_sequence_number: 904,
    p_lines: [{ product_variant_id: v("hummer320"), quantity: 5 }],
  });

  // OMS-905: ship 6, return 2
  await reserve({
    locationId: taotaoLoc,
    ownerId: meta905.ownerId,
    description: "Резерв Cruiser для OMS-905",
    lines: [{ product_variant_id: v("cruiser300"), quantity: 6, from_owner_id: 1 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: taotaoLoc,
    p_to_location_id: meta905.locationId,
    p_description: "Отгрузка OMS-905",
    p_sequence_number: 905,
    p_lines: [{ product_variant_id: v("cruiser300"), quantity: 6 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: meta905.locationId,
    p_to_location_id: taotaoLoc,
    p_description: "Возврат 2 Cruiser по OMS-905",
    p_sequence_number: 906,
    p_lines: [{ product_variant_id: v("cruiser300"), quantity: 2, to_owner_id: 1 }],
  });

  // Region reservations
  await reserve({
    locationId: shinerayLoc,
    ownerId: regionOwner,
    description: "Региональный резерв Enduro",
    lines: [{ product_variant_id: v("enduro250"), quantity: 5, from_owner_id: 1 }],
  });
  await reserve({
    locationId: dubaiLoc,
    ownerId: regionOwner,
    description: "Региональный резерв Cross на Dubai Hub",
    lines: [{ product_variant_id: v("cross180"), quantity: 3, from_owner_id: 1 }],
  });
  await reserve({
    locationId: qianjiangLoc,
    ownerId: regionOwner,
    description: "Региональный резерв Force",
    lines: [{ product_variant_id: v("force1100"), quantity: 4, from_owner_id: 1 }],
  });

  // OMS-906 mixed reserves across plants (18 of 20 lines)
  const mixedReserves = [
    { loc: qianjiangLoc, lines: [
      { product_variant_id: v("fx350"), quantity: 2 },
      { product_variant_id: v("rst240"), quantity: 2 },
      { product_variant_id: v("rst322"), quantity: 2 },
      { product_variant_id: v("rst422"), quantity: 2 },
      { product_variant_id: v("rst750"), quantity: 2 },
      { product_variant_id: v("gp401"), quantity: 2 },
      { product_variant_id: v("gp881"), quantity: 2 },
    ]},
    { loc: taotaoLoc, lines: [
      { product_variant_id: v("activator280"), quantity: 2 },
      { product_variant_id: v("crossE200"), quantity: 2 },
      { product_variant_id: v("seater2"), quantity: 2 },
      { product_variant_id: v("seater4"), quantity: 2 },
    ]},
    { loc: koolLoc, lines: [
      { product_variant_id: v("powerMax250"), quantity: 2 },
      { product_variant_id: v("powerMax320"), quantity: 2 },
      { product_variant_id: v("powerMax145"), quantity: 2 },
      { product_variant_id: v("powerMax190"), quantity: 2 },
    ]},
    { loc: dayunLoc, lines: [
      { product_variant_id: v("gl300"), quantity: 2 },
      { product_variant_id: v("enduro351"), quantity: 2 },
      { product_variant_id: v("rst501"), quantity: 2 },
    ]},
  ];
  for (const group of mixedReserves) {
    await reserve({
      locationId: group.loc,
      ownerId: meta906.ownerId,
      description: "Резерв строк OMS-906",
      lines: group.lines.map((line) => ({ ...line, from_owner_id: 1 })),
    });
  }

  // Extra reservations on open JSON-ish story stock for list density
  await reserve({
    locationId: dubaiLoc,
    ownerId: meta901.ownerId,
    description: "Доп. резерв Enduro на Dubai для OMS-901",
    lines: [{ product_variant_id: v("enduro250"), quantity: 2, from_owner_id: 1 }],
  });
  await reserve({
    locationId: taotaoLoc,
    ownerId: meta903.ownerId,
    description: "Доп. резерв Cross на Taotao",
    lines: [{ product_variant_id: v("cross180"), quantity: 2, from_owner_id: 1 }],
  });
  await reserve({
    locationId: koolLoc,
    ownerId: regionOwner,
    description: "Региональный резерв Power Max",
    lines: [{ product_variant_id: v("powerMax250"), quantity: 2, from_owner_id: 1 }],
  });
  await reserve({
    locationId: dayunLoc,
    ownerId: regionOwner,
    description: "Региональный резерв GL-300",
    lines: [{ product_variant_id: v("gl300"), quantity: 2, from_owner_id: 1 }],
  });
  await reserve({
    locationId: shinerayLoc,
    ownerId: meta902.ownerId,
    description: "Резерв Force на Shineray для OMS-902",
    lines: [{ product_variant_id: v("force1100"), quantity: 2, from_owner_id: 1 }],
  });
  await reserve({
    locationId: sunyeeLoc,
    ownerId: meta904.ownerId,
    description: "Доп. резерв Hummer для OMS-904",
    lines: [{ product_variant_id: v("hummer320"), quantity: 1, from_owner_id: 1 }],
  });
  await reserve({
    locationId: taotaoLoc,
    ownerId: meta905.ownerId,
    description: "Доп. резерв Cruiser для OMS-905",
    lines: [{ product_variant_id: v("cruiser300"), quantity: 1, from_owner_id: 1 }],
  });
  await reserve({
    locationId: dubaiLoc,
    ownerId: meta906.ownerId,
    description: "Резерв Force на Dubai для OMS-906",
    lines: [{ product_variant_id: v("force1100"), quantity: 1, from_owner_id: 1 }],
  });
  await reserve({
    locationId: qianjiangLoc,
    ownerId: meta906.ownerId,
    description: "Доп. резерв GP-1100 для OMS-906",
    lines: [{ product_variant_id: v("gp1100"), quantity: 1, from_owner_id: 1 }],
  });
  await reserve({
    locationId: dayunLoc,
    ownerId: meta906.ownerId,
    description: "Доп. резерв Enduro-351 для OMS-906",
    lines: [{ product_variant_id: v("enduro351"), quantity: 1, from_owner_id: 1 }],
  });
  await reserve({
    locationId: koolLoc,
    ownerId: meta901.ownerId,
    description: "Резерв Power Max для OMS-901",
    lines: [{ product_variant_id: v("powerMax320"), quantity: 1, from_owner_id: 1 }],
  });

  // ---------------------------------------------------------------------------
  // Transfers: 2 done, 1 in progress
  // ---------------------------------------------------------------------------
  const tr1 = await call("store_create_and_send_transfer", {
    p_from_warehouse_id: shinerayWh,
    p_to_warehouse_id: dubaiWh,
    p_expected_end_on: "2026-09-10",
    p_description: "Shineray → Dubai Hub (доставлено)",
    p_sequence_number: 901,
    p_lines: [{ product_variant_id: v("enduro250"), quantity: 6, owner_id: 1 }],
  });
  await call("store_complete_transfer", { p_id: Number(tr1.id) });

  const tr2 = await call("store_create_and_send_transfer", {
    p_from_warehouse_id: taotaoWh,
    p_to_warehouse_id: dubaiWh,
    p_expected_end_on: "2026-09-12",
    p_description: "Taotao → Dubai Hub (доставлено)",
    p_sequence_number: 902,
    p_lines: [{ product_variant_id: v("cross180"), quantity: 4, owner_id: 1 }],
  });
  await call("store_complete_transfer", { p_id: Number(tr2.id) });

  await call("store_create_and_send_transfer", {
    p_from_warehouse_id: qianjiangWh,
    p_to_warehouse_id: dubaiWh,
    p_expected_end_on: "2026-09-28",
    p_description: "Qianjiang → Dubai Hub (в пути)",
    p_sequence_number: 903,
    p_lines: [{ product_variant_id: v("force1100"), quantity: 3, owner_id: 1 }],
  });

  // Extra shipment Dubai → order for density
  await reserve({
    locationId: dubaiLoc,
    ownerId: meta903.ownerId,
    description: "Резерв Cross на Dubai под OMS-903",
    lines: [{ product_variant_id: v("cross180"), quantity: 2, from_owner_id: 1 }],
  });
  await call("store_create_and_post_shipment", {
    p_from_location_id: dubaiLoc,
    p_to_location_id: meta903.locationId,
    p_description: "Доп. отгрузка OMS-903 с Dubai Hub",
    p_sequence_number: 910,
    p_lines: [{ product_variant_id: v("cross180"), quantity: 2 }],
  });

  // Mark one story order done for lifecycle variety
  await patch(`store_document?id=eq.${order901.id}`, { status: "done" });

  return { orders: 6 + bulkOrders.length + hubOrders.length };
};

const round2 = (value) => Math.round(value * 100) / 100;

/** Mirrors `estimatedCost` of src/features/logistics/order-money.ts for seeding. */
const estimated = (lines, orderCurrency, rates) =>
  lines.reduce((sum, line) => {
    const from = line.currencyCode ?? orderCurrency;
    const total = Number(line.unit_price) * Number(line.quantity);
    if (from === orderCurrency) return sum + total;
    const rf = Number(rates[from]);
    const rt = Number(rates[orderCurrency]);
    return rf > 0 && rt > 0 ? sum + (total / rf) * rt : sum;
  }, 0);

const getAll = async (url, key, path) => {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const page = await restGet(url, key, `${path}&limit=${pageSize}&offset=${offset}`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
};

/**
 * Money demo (CAP-10): currencies, amounts and payment schedules on story orders; closed and JSON orders
 * get one paid payment for the whole amount. Production currency CNY; today in the demo is late Sep 2026.
 * @param {{ url: string, serviceKey: string }} args
 */
export const seedOrderMoney = async ({ url, serviceKey }) => {
  const call = (name, body) => rpc(url, serviceKey, name, body);
  const docs = await getAll(
    url,
    serviceKey,
    "store_document?select=id,kind,sequence_number,status,created_at,expected_end_on&kind=in.(production_order,customer_order)&order=id",
  );
  const currencies = await restGet(url, serviceKey, "store_currency?select=id,code");
  const codeById = new Map(currencies.map((row) => [String(row.id), row.code]));
  const lines = await getAll(
    url,
    serviceKey,
    "store_document_product_line?select=document_id,unit_price,quantity,currency_id&unit_price=not.is.null&order=id",
  );
  const linesByDoc = new Map();
  for (const line of lines) {
    const key = String(line.document_id);
    linesByDoc.set(key, [
      ...(linesByDoc.get(key) ?? []),
      { ...line, currencyCode: line.currency_id == null ? null : codeById.get(String(line.currency_id)) ?? null },
    ]);
  }
  const moneyRows = await getAll(url, serviceKey, "store_order_money?select=document_id,currency_id,amount,rates&order=document_id");
  const moneyByDoc = new Map(moneyRows.map((row) => [String(row.document_id), row]));

  const doc = (kind, seq) => {
    const found = docs.find((row) => row.kind === kind && Number(row.sequence_number) === seq);
    if (!found) throw new Error(`money seed: ${kind} ${seq} missing`);
    return found;
  };
  const currencyOf = (id) => codeById.get(String(moneyByDoc.get(String(id))?.currency_id)) ?? "USD";
  const totalOf = (id, currencyCode = currencyOf(id), amount = null) => {
    if (amount != null) return amount;
    const money = moneyByDoc.get(String(id));
    return round2(estimated(linesByDoc.get(String(id)) ?? [], currencyCode, money?.rates ?? {}));
  };

  let orders = 0;
  let payments = 0;
  /**
   * @param {{ kind: string, seq: number, currency?: string, amount?: (estimate: number) => number,
   *   schedule?: Array<{ dueOn: string, share: number, status: string }> }} plan
   */
  const apply = async ({ kind, seq, currency, amount, schedule = [] }) => {
    const row = doc(kind, seq);
    const code = currency ?? currencyOf(row.id);
    if (currency) await call("store_set_order_currency", { p_document_id: Number(row.id), p_currency_code: currency });
    const estimate = totalOf(row.id, code);
    let total = estimate;
    if (amount) {
      total = round2(amount(estimate));
      await call("store_set_order_amount", { p_document_id: Number(row.id), p_amount: total });
    }
    let used = 0;
    for (const [index, part] of schedule.entries()) {
      const last = index === schedule.length - 1 && schedule.reduce((sum, item) => sum + item.share, 0) >= 0.999;
      const value = last ? round2(total - used) : round2(total * part.share);
      used = round2(used + value);
      if (value <= 0) continue;
      await call("store_save_order_payment", {
        p_document_id: Number(row.id),
        p_due_on: part.dueOn,
        p_amount: value,
        p_status: part.status,
      });
      payments += 1;
    }
    orders += 1;
  };
  const paidInFull = (kind, row) =>
    apply({
      kind,
      seq: Number(row.sequence_number),
      schedule: [
        { dueOn: String(row.expected_end_on ?? row.created_at).slice(0, 10), share: 1, status: "paid" },
      ],
    });

  // Payments to plants (PO). PO-906 at PLT-2 has the overdue invoice.
  const PO = "production_order";
  await apply({
    kind: PO,
    seq: 901,
    schedule: [
      { dueOn: "2026-10-05", share: 0.3, status: "invoiced" },
      { dueOn: "2026-11-16", share: 0.7, status: "planned" },
    ],
  });
  await apply({
    kind: PO,
    seq: 902,
    currency: "USD",
    schedule: [
      { dueOn: "2026-09-01", share: 0.4, status: "paid" },
      { dueOn: "2026-10-12", share: 0.6, status: "planned" },
    ],
  });
  await apply({ kind: PO, seq: 903, amount: (estimate) => Math.round(estimate * 1.05) });
  await apply({
    kind: PO,
    seq: 904,
    schedule: [
      { dueOn: "2026-08-20", share: 0.5, status: "paid" },
      { dueOn: "2026-10-20", share: 0.5, status: "invoiced" },
    ],
  });
  await apply({ kind: PO, seq: 905, currency: "EUR", schedule: [{ dueOn: "2026-10-08", share: 0.5, status: "planned" }] });
  await apply({
    kind: PO,
    seq: 906,
    schedule: [
      { dueOn: "2026-09-10", share: 0.4, status: "invoiced" },
      { dueOn: "2026-10-26", share: 0.6, status: "planned" },
    ],
  });
  await apply({ kind: PO, seq: 907, schedule: [{ dueOn: "2026-10-15", share: 1, status: "planned" }] });
  await apply({
    kind: PO,
    seq: 920,
    schedule: [
      { dueOn: "2026-10-01", share: 0.3, status: "invoiced" },
      { dueOn: "2026-12-10", share: 0.7, status: "planned" },
    ],
  });
  await apply({ kind: PO, seq: 908, schedule: [{ dueOn: "2026-10-18", share: 1, status: "planned" }] });
  await call("store_cancel_document", { p_kind: PO, p_id: Number(doc(PO, 908).id) });

  // Incoming from customers (OMS). OMS-907 (ru) is overdue.
  const CO = "customer_order";
  await apply({
    kind: CO,
    seq: 902,
    schedule: [
      { dueOn: "2026-09-05", share: 0.5, status: "paid" },
      { dueOn: "2026-10-10", share: 0.5, status: "invoiced" },
    ],
  });
  await apply({ kind: CO, seq: 904, schedule: [{ dueOn: "2026-10-20", share: 1, status: "planned" }] });
  await apply({
    kind: CO,
    seq: 906,
    currency: "USD",
    schedule: [
      { dueOn: "2026-10-03", share: 0.4, status: "invoiced" },
      { dueOn: "2026-11-05", share: 0.6, status: "planned" },
    ],
  });
  await apply({
    kind: CO,
    seq: 907,
    schedule: [
      { dueOn: "2026-09-15", share: 0.3, status: "planned" },
      { dueOn: "2026-10-30", share: 0.7, status: "planned" },
    ],
  });
  await apply({
    kind: CO,
    seq: 908,
    amount: (estimate) => Math.round(estimate * 0.97),
    schedule: [{ dueOn: "2026-11-25", share: 0.5, status: "planned" }],
  });
  await apply({ kind: CO, seq: 909, schedule: [{ dueOn: "2026-12-10", share: 1, status: "planned" }] });
  await apply({ kind: CO, seq: 910, currency: "EUR", schedule: [{ dueOn: "2026-10-15", share: 0.2, status: "invoiced" }] });

  // Closed orders and every JSON customer order: one paid payment for the full amount.
  for (const row of docs) {
    const seq = Number(row.sequence_number);
    const isStory = seq >= STORY_LO && seq <= STORY_HI;
    if (row.kind === PO && row.status === "done") await paidInFull(PO, row);
    else if (row.kind === CO && (!isStory || row.status === "done" || seq === 903 || seq === 905)) {
      await paidInFull(CO, row);
    }
  }

  return { orders, payments };
};
