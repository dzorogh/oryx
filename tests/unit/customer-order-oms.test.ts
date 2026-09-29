import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOrderSystemNotices,
  documentFileSizeError,
  documentFileStoragePath,
  fileExtension,
  lineAmount,
  mapCustomerOrderOmsContext,
  orderPackingItems,
  tenantLabel,
  type StoreTenant,
} from "@/features/logistics/customer-order-oms";
import {
  convert,
  estimatedCost,
  summarizePayments,
  type OrderPayment,
} from "@/features/logistics/order-money";

const payment = (overrides: Partial<OrderPayment>): OrderPayment => ({
  id: "1",
  documentId: "10",
  dueOn: "2026-09-28",
  amount: 0,
  status: "planned",
  ...overrides,
});

describe("tenantLabel", () => {
  const tenants: StoreTenant[] = [
    { id: "b", name: "Sharmax UAE", regionId: "1", sortOrder: 20 },
    { id: "a", name: "Globaldrive", regionId: "2", sortOrder: 10 },
    { id: "c", name: "Dubai Partner", regionId: "1", sortOrder: 5 },
  ];

  it("shows «—», one name or names joined by a comma", () => {
    assert.equal(tenantLabel(tenants, "9"), "—");
    assert.equal(tenantLabel(tenants, "2"), "Globaldrive");
    assert.equal(tenantLabel(tenants, "1"), "Dubai Partner, Sharmax UAE");
  });

  it("follows the tenant region, not the order", () => {
    const moved = tenants.map((tenant) => (tenant.id === "a" ? { ...tenant, regionId: "1" } : tenant));
    assert.equal(tenantLabel(moved, "2"), "—");
    assert.equal(tenantLabel(moved, "1"), "Dubai Partner, Globaldrive, Sharmax UAE");
  });
});

describe("summarizePayments", () => {
  it("counts paid payments, the nearest unpaid due date and overdue", () => {
    const summary = summarizePayments(
      [
        payment({ id: "1", amount: 30, status: "paid", dueOn: "2026-09-01" }),
        payment({ id: "2", amount: 70, status: "planned", dueOn: "2026-09-28" }),
      ],
      100,
      "CNY",
      "2026-09-29",
    );
    assert.deepEqual(summary, { currencyCode: "CNY", paid: 30, total: 100, nextDueOn: "2026-09-28", overdue: true });
  });

  it("is not overdue when unpaid payments are due today or later", () => {
    const summary = summarizePayments(
      [
        payment({ id: "1", amount: 50, status: "invoiced", dueOn: "2026-10-05" }),
        payment({ id: "2", amount: 50, status: "planned", dueOn: "2026-09-29" }),
      ],
      100,
      "USD",
      "2026-09-29",
    );
    assert.equal(summary.paid, 0);
    assert.equal(summary.nextDueOn, "2026-09-29");
    assert.equal(summary.overdue, false);
  });

  it("has no due date once everything is paid", () => {
    const summary = summarizePayments([payment({ amount: 100, status: "paid" })], 100, "USD", "2026-09-29");
    assert.equal(summary.nextDueOn, null);
    assert.equal(summary.overdue, false);
  });
});

describe("lineAmount", () => {
  it("is price × quantity, empty without a price", () => {
    assert.equal(lineAmount(12.5, 4), 50);
    assert.equal(lineAmount(null, 4), null);
  });

  it("sums to the estimated cost by the order snapshot", () => {
    const rates = { USD: 1, CNY: 7.12, EUR: 0.86 };
    const lines = [
      { unitPrice: 100, quantity: 3, currencyCode: "CNY" },
      { unitPrice: 20, quantity: 2, currencyCode: "USD" },
      { unitPrice: null, quantity: 5, currencyCode: null },
    ];
    const summed = lines.reduce((sum, line) => {
      const amount = lineAmount(line.unitPrice, line.quantity);
      return amount == null ? sum : sum + (convert(amount, line.currencyCode ?? "CNY", "CNY", rates) ?? 0);
    }, 0);
    assert.ok(Math.abs(summed - estimatedCost(lines, "CNY", rates)) < 1e-9);
  });
});

describe("document files", () => {
  it("rejects files over 10 MB before upload", () => {
    assert.equal(documentFileSizeError(10 * 1024 * 1024), null);
    assert.match(documentFileSizeError(10 * 1024 * 1024 + 1) ?? "", /10 МБ/);
  });

  it("keeps the extension and an ASCII storage key under the order folder", () => {
    assert.equal(fileExtension("Счёт №5.PDF"), "PDF");
    assert.equal(fileExtension("README"), "");
    const path = documentFileStoragePath("89", "Счёт поставщика №5.pdf", "abc");
    assert.match(path, /^89\/abc-[A-Za-z0-9._-]+\.pdf$/);
    assert.equal(documentFileStoragePath("89", "packing list.xlsx", "u1"), "89/u1-packing_list.xlsx");
  });
});

describe("orderPackingItems", () => {
  it("packs lines with dimensions and lists the rest", () => {
    const logistics = mapCustomerOrderOmsContext({
      variant_logistics: [
        {
          product_variant_id: 1,
          quantity_per_unit: 2,
          length_cm: 230,
          width_cm: 130,
          height_cm: 126,
          weight_kg: 545,
          stacking: true,
          stacking_limit: null,
          rotate_length: false,
          rotate_width: true,
          max_per_container: 18,
        },
        { product_variant_id: 2, quantity_per_unit: 1, length_cm: null, max_per_container: null },
      ],
    }).variantLogistics;
    const { items, missing } = orderPackingItems(
      [
        { productId: "1", productName: "Кран", quantity: 4 },
        { productId: "2", productName: "Насос", quantity: 3 },
        { productId: "3", productName: "Фильтр", quantity: 1 },
      ],
      logistics,
    );
    assert.equal(items.length, 1);
    assert.deepEqual(
      { id: items[0].id, lengthMm: items[0].lengthMm, quantity: items[0].quantity, perUnit: items[0].quantityPerUnit },
      { id: 1, lengthMm: 2300, quantity: 4, perUnit: 2 },
    );
    assert.equal(items[0].maxPerContainer, 18);
    assert.equal(items[0].rotateWidth, true);
    assert.deepEqual(
      missing.map((line) => line.productName),
      ["Насос", "Фильтр"],
    );
  });
});

describe("buildOrderSystemNotices", () => {
  it("builds creation, status, date and payment status entries in time order", () => {
    const notices = buildOrderSystemNotices({
      documentId: "89",
      createdAt: "2026-09-20T10:00:00+00:00",
      currencyCode: "CNY",
      timeline: [
        { id: "h1", kind: "create", title: "Создан", at: "2026-09-20T10:00:00+00:00", by: "Анна" },
        {
          id: "h2",
          kind: "done",
          title: "Изменён статус",
          at: "2026-09-25T09:00:00+00:00",
          by: "Анна",
          changes: [{ label: "Статус", from: "Открыт", to: "Закрыт" }],
        },
        {
          id: "h3",
          kind: "edit",
          title: "Изменено ожидаемое окончание",
          at: "2026-09-22T09:00:00+00:00",
          by: "Анна",
          changes: [{ label: "Ожидаемое окончание", from: "—", to: "30.09.2026" }],
        },
      ],
      paymentEvents: [
        {
          id: "e1",
          paymentId: "5",
          status: "paid",
          amount: 1200,
          dueOn: "2026-09-28",
          changedAt: "2026-09-24T12:00:00.000Z",
        },
      ],
    });
    assert.deepEqual(
      notices.map((notice) => notice.title),
      ["Заказ создан", "Ожидаемое окончание — 30.09.2026", "Платёж — Оплачен", "Статус заказа — Закрыт"],
    );
    assert.equal(notices[0].createdAtIso, "2026-09-20T10:00:00.000Z");
    assert.equal(notices[3].tone, "success");
    assert.match(notices[2].description ?? "", /срок 28\.09\.2026/);
  });
});

describe("mapCustomerOrderOmsContext", () => {
  it("maps SQL rows of tenants, transfer money, payment events and files", () => {
    const mapped = mapCustomerOrderOmsContext({
      tenants: [
        { id: "tenant-sharmax-ae", name: "Sharmax UAE", region_id: 1, sort_order: 120 },
        { id: "tenant-oryxbms", name: "OryxBMS", region_id: null, sort_order: 40 },
      ],
      transfer_money: [
        {
          document_id: 213,
          currency_code: "CNY",
          rates: { USD: 1, CNY: "7.12" },
          payments: [
            { id: 105, document_id: 213, due_on: "2026-09-27", amount: "4200.0000", status: "paid" },
            { id: 107, document_id: 213, due_on: "2026-10-01", amount: 1, status: "lost" },
          ],
        },
        { document_id: 214, rates: {}, payments: [] },
      ],
      order_payment_events: [
        {
          id: 1,
          payment_id: 5,
          document_id: 84,
          status: "invoiced",
          amount: "300.5000",
          due_on: "2026-10-03T00:00:00",
          changed_at: "2026-09-29T09:00:00+00:00",
        },
        { id: 2, payment_id: 6, document_id: 84, status: "unknown", amount: 1, due_on: "2026-10-03", changed_at: "x" },
      ],
      document_files: [
        {
          id: 9,
          document_id: 84,
          storage_path: "84/u-invoice.pdf",
          name: "invoice.pdf",
          size_bytes: 2048,
          mime_type: "application/pdf",
          created_at: "2026-09-29T09:00:00+00:00",
        },
      ],
    });
    assert.deepEqual(
      mapped,
      {
        tenants: [
          { id: "tenant-sharmax-ae", name: "Sharmax UAE", regionId: "1", sortOrder: 120 },
          { id: "tenant-oryxbms", name: "OryxBMS", regionId: null, sortOrder: 40 },
        ],
        variantLogistics: [],
        containerTypes: [],
        transferMoney: [
          {
            documentId: "213",
            currencyCode: "CNY",
            rates: { USD: 1, CNY: 7.12 },
            payments: [{ id: "105", documentId: "213", dueOn: "2026-09-27", amount: 4200, status: "paid" }],
          },
          { documentId: "214", currencyCode: "USD", rates: {}, payments: [] },
        ],
        paymentEvents: [
          {
            id: "1",
            paymentId: "5",
            status: "invoiced",
            amount: 300.5,
            dueOn: "2026-10-03",
            changedAt: "2026-09-29T09:00:00+00:00",
          },
        ],
        files: [
          {
            id: "9",
            documentId: "84",
            storagePath: "84/u-invoice.pdf",
            name: "invoice.pdf",
            sizeBytes: 2048,
            mimeType: "application/pdf",
            createdAt: "2026-09-29T09:00:00+00:00",
          },
        ],
      },
    );
  });
});
