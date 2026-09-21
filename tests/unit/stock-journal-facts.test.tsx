import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  derivedStockState,
  documentKey,
  documentKeysForAssignedEntity,
  STORE_CURRENT_USER_ID,
} from "@/features/logistics/logistics-types";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import {
  DocumentLedger,
  LEDGER_PAGE_SIZE,
  documentLedgerRows,
  paginateLedgerRows,
} from "@/features/logistics/ui/document-ledger";
import {
  assertDocumentCanBeCancelled,
  POSTED_DOCUMENT_CANCEL_FORBIDDEN,
} from "@/features/logistics/logistics-rules";
import { mapTransaction } from "@/features/logistics/logistics-api";
import { LOGISTICS_MORE_NAV_ITEMS } from "@/features/logistics/logistics-nav";
import { customerOrder, reservation, snapshot, tx } from "./logistics-test-fixtures";

const FACTS_MIGRATION = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260921120000_store_stock_transaction_facts.sql"),
  "utf8",
);

afterEach(() => {
  cleanup();
});

const reserveLegs = () => [
  tx({
    id: "tx-rsv-free",
    quantity: -10,
    locationType: "warehouse",
    locationId: "wh-1",
    assignedToType: null,
    assignedToId: null,
    documentType: "reservation",
    documentId: "rsv-10",
  }),
  tx({
    id: "tx-rsv-order",
    quantity: 10,
    locationType: "warehouse",
    locationId: "wh-1",
    assignedToType: "order",
    assignedToId: "12",
    documentType: "reservation",
    documentId: "rsv-10",
  }),
];

const shipLegs = () => [
  tx({
    id: "tx-shp-wh",
    quantity: -4,
    locationType: "warehouse",
    locationId: "wh-1",
    assignedToType: "order",
    assignedToId: "12",
    documentType: "shipment",
    documentId: "shp-1",
  }),
  tx({
    id: "tx-shp-co",
    quantity: 4,
    locationType: "customer_order",
    locationId: "12",
    assignedToType: "order",
    assignedToId: "12",
    documentType: "shipment",
    documentId: "shp-1",
  }),
];

describe("stock journal facts", () => {
  it("labels the journal Ledger", () => {
    expect(LOGISTICS_MORE_NAV_ITEMS.find((item) => item.href.includes("ledger"))?.label).toBe("Ledger");
  });

  it("derives free, reserved, and shipped from assigned_to and location", () => {
    expect(derivedStockState("warehouse", null, null)).toBe("free");
    expect(derivedStockState("warehouse", "order", "12")).toBe("reserved");
    expect(derivedStockState("production_order", "region", "3")).toBe("reserved");
    expect(derivedStockState("customer_order", "order", "12")).toBe("shipped");
  });

  it("posts a reservation as a free minus and an order plus on the same document", () => {
    const facts = reserveLegs();
    expect(facts.map((entry) => [entry.quantity, entry.assignedToType, entry.documentType])).toEqual([
      [-10, null, "reservation"],
      [10, "order", "reservation"],
    ]);
    expect(facts.every((entry) => entry.documentId === "rsv-10")).toBe(true);
    expect(facts.every((entry) => entry.locationType === "warehouse")).toBe(true);
    expect(computeStockBalances(facts)).toEqual([
      expect.objectContaining({
        productId: "p-chair",
        locationType: "warehouse",
        locationId: "wh-1",
        assignedToType: null,
        assignedToId: null,
        stockState: "free",
        quantity: -10,
      }),
      expect.objectContaining({
        productId: "p-chair",
        locationType: "warehouse",
        locationId: "wh-1",
        assignedToType: "order",
        assignedToId: "12",
        stockState: "reserved",
        quantity: 10,
      }),
    ]);
  });

  it("posts a shipment as reserved warehouse minus and customer-order plus", () => {
    const facts = shipLegs();
    expect(facts[0]).toMatchObject({
      quantity: -4,
      locationType: "warehouse",
      assignedToType: "order",
      documentType: "shipment",
      stockState: "reserved",
    });
    expect(facts[1]).toMatchObject({
      quantity: 4,
      locationType: "customer_order",
      locationId: "12",
      assignedToType: "order",
      assignedToId: "12",
      documentType: "shipment",
      stockState: "shipped",
    });
  });

  it("keeps reservation location on the production order, not a line", () => {
    const doc = reservation({
      id: "rsv-po",
      locationType: "production_order",
      locationId: "po-8",
      toOwnerType: "order",
      toOwnerId: "12",
    });
    const facts = [
      tx({
        quantity: -3,
        locationType: "production_order",
        locationId: "po-8",
        assignedToType: null,
        assignedToId: null,
        documentType: "reservation",
        documentId: doc.id,
      }),
      tx({
        quantity: 3,
        locationType: "production_order",
        locationId: "po-8",
        assignedToType: "order",
        assignedToId: "12",
        documentType: "reservation",
        documentId: doc.id,
      }),
    ];
    expect(doc.locationType).toBe("production_order");
    expect(facts.every((entry) => entry.locationType === "production_order" && entry.locationId === "po-8")).toBe(
      true,
    );
    expect(facts.some((entry) => entry.locationType === ("production_order_line" as typeof entry.locationType))).toBe(
      false,
    );
  });

  it("shows both legs of a document that touched an assigned entity", () => {
    const facts = [...reserveLegs(), ...shipLegs()];
    const keys = documentKeysForAssignedEntity(facts, "order", "12");
    expect(keys.has(documentKey("reservation", "rsv-10"))).toBe(true);
    expect(keys.has(documentKey("shipment", "shp-1"))).toBe(true);
    const orderCardRows = documentLedgerRows(facts, (entry) =>
      keys.has(documentKey(entry.documentType, entry.documentId)),
    );
    expect(orderCardRows.map((entry) => entry.id).sort()).toEqual(
      ["tx-rsv-free", "tx-rsv-order", "tx-shp-co", "tx-shp-wh"].sort(),
    );
    expect(orderCardRows.some((entry) => entry.assignedToType == null)).toBe(true);
  });

  it("corrects a posted document with a new document and leaves the original facts", () => {
    const original = reserveLegs();
    const correction = [
      tx({
        id: "tx-rel-order",
        quantity: -10,
        locationType: "warehouse",
        locationId: "wh-1",
        assignedToType: "order",
        assignedToId: "12",
        documentType: "reservation",
        documentId: "rsv-11",
      }),
      tx({
        id: "tx-rel-free",
        quantity: 10,
        locationType: "warehouse",
        locationId: "wh-1",
        assignedToType: null,
        assignedToId: null,
        documentType: "reservation",
        documentId: "rsv-11",
      }),
    ];
    const all = [...original, ...correction];
    expect(all.filter((entry) => entry.documentId === "rsv-10")).toEqual(original);
    expect(all.filter((entry) => entry.documentId === "rsv-11")).toHaveLength(2);
    expect(all.every((entry) => !("reversesTransactionId" in entry))).toBe(true);
    expect(computeStockBalances(all)).toEqual([]);
  });

  it("rejects posted cancel and keeps facts unchanged", () => {
    const facts = shipLegs();
    expect(() => assertDocumentCanBeCancelled("shipment", "posted")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("return", "posted")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("output", "done")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("transfer", "sent")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("production_output", "done")).toThrow(POSTED_DOCUMENT_CANCEL_FORBIDDEN);
    expect(() => assertDocumentCanBeCancelled("shipment")).not.toThrow();
    expect(() => assertDocumentCanBeCancelled("return")).not.toThrow();
    expect(() => assertDocumentCanBeCancelled("output")).not.toThrow();
    expect(facts).toHaveLength(2);
  });

  it("maps assigned_to and document columns from a raw journal row", () => {
    expect(
      mapTransaction({
        id: 7,
        created_at: "2026-09-21T10:00:00.000Z",
        product_id: 3,
        quantity: -2,
        location_type: "warehouse",
        location_id: 1,
        assigned_to_type: "order",
        assigned_to_id: 12,
        document_type: "shipment",
        document_id: 1,
      }),
    ).toMatchObject({
      id: "7",
      assignedToType: "order",
      assignedToId: "12",
      documentType: "shipment",
      documentId: "1",
      stockState: "reserved",
      ownerType: "order",
      ownerId: "12",
    });
  });

  it("keeps only the matching document class when two facts share id 1", () => {
    const facts = [
      tx({ id: "tx-shp", quantity: 1, documentType: "shipment", documentId: "1", createdAt: "2026-09-21T10:00:00.000Z" }),
      tx({ id: "tx-rsv", quantity: 1, documentType: "reservation", documentId: "1", createdAt: "2026-09-21T10:00:00.000Z" }),
    ];
    expect(
      documentLedgerRows(
        facts,
        (entry) => entry.documentType === "shipment" && entry.documentId === "1",
      ).map((entry) => entry.id),
    ).toEqual(["tx-shp"]);
  });

  it("does not keep reverse or source fields on a fact", () => {
    const fact = tx({ quantity: 2, documentType: "output", documentId: "out-1" });
    expect(fact).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        createdAt: expect.any(String),
        documentType: "output",
        documentId: "out-1",
      }),
    );
    expect(fact).not.toHaveProperty("reversesTransactionId");
    expect(fact).not.toHaveProperty("sourceType");
    expect(fact).not.toHaveProperty("transactionId");
    expect(fact).not.toHaveProperty("occurredAt");
    expect(fact).not.toHaveProperty("postedAt");
    expect(POSTED_DOCUMENT_CANCEL_FORBIDDEN).toMatch(/cannot be cancelled/);
  });

  it("snapshots document history with the hardcoded demo author", () => {
    const order = customerOrder({ id: "12", number: "OMS-12" });
    const history = snapshot({
      customerOrders: [order],
      users: [{ id: STORE_CURRENT_USER_ID, name: "Alexey Nazarov" }],
      documentHistory: [
        {
          id: "1",
          documentType: "customer_order",
          documentId: "12",
          eventType: "created",
          status: "open",
          expectedEndOn: null,
          createdAt: "2026-09-21T10:00:00.000Z",
          createdBy: STORE_CURRENT_USER_ID,
        },
        {
          id: "2",
          documentType: "customer_order",
          documentId: "12",
          eventType: "expected_end_changed",
          status: "open",
          expectedEndOn: "2026-10-01",
          createdAt: "2026-09-21T11:00:00.000Z",
          createdBy: STORE_CURRENT_USER_ID,
        },
      ],
    });
    expect(order.createdBy).toBe("1");
    expect(history.documentHistory.map((entry) => entry.eventType)).toEqual(["created", "expected_end_changed"]);
    expect(history.documentHistory.every((entry) => entry.createdBy === STORE_CURRENT_USER_ID)).toBe(true);
  });
});

describe("document ledger hide and pager", () => {
  const manyFacts = Array.from({ length: 25 }, (_, index) =>
    tx({
      id: `tx-${String(index + 1).padStart(2, "0")}`,
      createdAt: `2026-09-21T10:${String(index).padStart(2, "0")}:00.000Z`,
      quantity: 1,
      productId: "p-chair",
      locationType: "warehouse",
      locationId: "wh-1",
      documentType: "reservation",
      documentId: `rsv-${index + 1}`,
    }),
  );

  it("breaks createdAt ties with id descending", () => {
    const facts = [
      tx({ id: "2", quantity: 1, createdAt: "2026-09-21T10:00:00.000Z" }),
      tx({ id: "10", quantity: 1, createdAt: "2026-09-21T10:00:00.000Z" }),
      tx({ id: "3", quantity: 1, createdAt: "2026-09-21T11:00:00.000Z" }),
    ];
    expect(documentLedgerRows(facts, () => true).map((entry) => entry.id)).toEqual(["3", "2", "10"]);
  });

  it("does not toggle raw ids when a document link is clicked", async () => {
    const user = userEvent.setup();
    const facts = reserveLegs();
    const data = snapshot({
      products: [{ id: "p-chair", code: "PRD-1", sku: "CHAIR", name: "Chair", unit: "pcs", manufacturerId: null }],
      warehouses: [{ id: "wh-1", code: "WH-1", name: "One", manufacturerId: null }],
      reservations: [reservation({ id: "rsv-10" })],
      transactions: facts,
    });
    render(<DocumentLedger snapshot={data} filter={() => true} />);
    await user.click(screen.getAllByRole("link")[0]!);
    expect(screen.queryByText(/id tx-/)).toBeNull();
  });

  it("pages newest facts first and keeps the rest reachable", () => {
    const rows = documentLedgerRows(manyFacts, () => true);
    expect(rows[0]?.id).toBe("tx-25");
    const first = paginateLedgerRows(rows, 1);
    expect(first.pageRows).toHaveLength(LEDGER_PAGE_SIZE);
    expect(first.total).toBe(25);
    expect(first.pageRows[0]?.id).toBe("tx-25");
    expect(first.pageRows.at(-1)?.id).toBe("tx-06");
    const second = paginateLedgerRows(rows, 2);
    expect(second.pageRows.map((entry) => entry.id)).toEqual(["tx-05", "tx-04", "tx-03", "tx-02", "tx-01"]);
    expect(second.shownCount).toBe(5);
  });

  it("hides the parent column and shows total plus the next page", async () => {
    const user = userEvent.setup();
    const data = snapshot({
      products: [{ id: "p-chair", code: "PRD-1", sku: "CHAIR", name: "Chair", unit: "pcs", manufacturerId: null }],
      warehouses: [{ id: "wh-1", code: "WH-1", name: "One", manufacturerId: null }],
      transactions: manyFacts,
    });
    render(<DocumentLedger snapshot={data} hide="product" filter={() => true} />);

    expect(screen.getByRole("columnheader", { name: "Time" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Change" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Product" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Location" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Assigned to" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Document" })).toBeTruthy();
    expect(screen.getByText("Showing 20 of 25")).toBeTruthy();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(20);

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    expect(screen.getByText("Showing 5 of 25")).toBeTruthy();
  });

  it("hides Assigned to on an order card without dropping the free leg", () => {
    const facts = reserveLegs();
    const data = snapshot({
      products: [{ id: "p-chair", code: "PRD-1", sku: "CHAIR", name: "Chair", unit: "pcs", manufacturerId: null }],
      warehouses: [{ id: "wh-1", code: "WH-1", name: "One", manufacturerId: null }],
      customerOrders: [customerOrder({ id: "12", number: "OMS-12" })],
      reservations: [reservation({ id: "rsv-10", toOwnerType: "order", toOwnerId: "12" })],
      transactions: facts,
    });
    const keys = documentKeysForAssignedEntity(data.transactions, "order", "12");
    render(
      <DocumentLedger
        snapshot={data}
        hide="assignedTo"
        filter={(entry) => keys.has(documentKey(entry.documentType, entry.documentId))}
      />,
    );
    expect(screen.queryByRole("columnheader", { name: "Assigned to" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Product" })).toBeTruthy();
    expect(screen.getAllByRole("row").length).toBeGreaterThan(2);
  });

  it("hides Location on a place card and Document on a document card", () => {
    const data = snapshot({
      products: [{ id: "p-chair", code: "PRD-1", sku: "CHAIR", name: "Chair", unit: "pcs", manufacturerId: null }],
      warehouses: [{ id: "wh-1", code: "WH-1", name: "One", manufacturerId: null }],
      reservations: [reservation({ id: "rsv-10" })],
      transactions: reserveLegs(),
    });
    const { rerender } = render(<DocumentLedger snapshot={data} hide="location" filter={() => true} />);
    expect(screen.queryByRole("columnheader", { name: "Location" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Document" })).toBeTruthy();
    rerender(<DocumentLedger snapshot={data} hide="document" filter={() => true} />);
    expect(screen.queryByRole("columnheader", { name: "Document" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Location" })).toBeTruthy();
  });
});

describe("stock journal migration contract", () => {
  it("forbids zero quantity and a split assigned_to pair", () => {
    expect(FACTS_MIGRATION).toContain("constraint store_stock_transaction_qty_chk check (quantity <> 0)");
    expect(FACTS_MIGRATION).toContain("assigned_to_type is null and assigned_to_id is null");
    expect(FACTS_MIGRATION).toContain("assigned_to_type in ('order', 'region') and assigned_to_id is not null");
  });

  it("drops reverse, writes history atomically, and stops if balances diverge", () => {
    expect(FACTS_MIGRATION).toContain("drop function if exists public.store_reverse_source");
    expect(FACTS_MIGRATION).toContain("create or replace function public.store_document_history_trigger()");
    expect(FACTS_MIGRATION).toContain("'status_changed'");
    expect(FACTS_MIGRATION).toContain("'expected_end_changed'");
    expect(FACTS_MIGRATION).not.toMatch(/v_event := 'status_changed';\s+elsif/);
    expect(FACTS_MIGRATION).toContain("insert into public.store_document_history");
    expect(FACTS_MIGRATION).toContain("store_fact_balance_before");
    expect(FACTS_MIGRATION).toContain("raise exception 'Fact journal migration changed product+location+assigned_to totals'");
    expect(FACTS_MIGRATION).toContain("Posted warehouse documents cannot be cancelled");
  });
});
