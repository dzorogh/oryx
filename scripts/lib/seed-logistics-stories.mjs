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

  return { orders: 6 };
};
