import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ENTITY_CODE_DEFAULTS } from "@/lib/entity-codes";
import { projectTransferDetail, transferHasMixedOwners } from "@/features/logistics/transfer-detail-projection";
import type { LogisticsSnapshot, StockBalance, Transfer } from "@/features/logistics/logistics-types";

const emptySnapshot = (overrides: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [],
    dealerPrices: [],
    plants: [],
    stockLocations: [],
    stockOwners: [],
    freeOwnerId: "1",
    warehouses: [
      { id: "w1", code: "WH-1", name: "A", stockLocationId: "l1", kind: "customer" as const, plantId: null },
      { id: "w2", code: "WH-2", name: "B", stockLocationId: "l2", kind: "customer" as const, plantId: null },
    ],
    regions: [],
    settings: { id: "1", codePrefixes: { ...ENTITY_CODE_DEFAULTS } },
    documentProductLines: [],
    customerOrders: [],
    customerOrderLines: [],
    productionOrders: [],
    productionOrderLines: [],
    reservations: [],
    reservationLines: [],
    transfers: [],
    transferLines: [],
    transferAllocations: [],
    shipments: [],
    shipmentLines: [],
    outputs: [],
    outputLines: [],
    outputAllocations: [],
    adjustments: [],
    adjustmentLines: [],
    transactions: [],
    users: [],
    documentHistory: [],
    ...overrides,
  }) as LogisticsSnapshot;

const transfer = (overrides: Partial<Transfer> & Pick<Transfer, "id" | "status">): Transfer => ({
  series: "TR",
  sequenceNumber: overrides.id,
  number: `TR-${overrides.id}`,
  fromWarehouseId: "w1",
  toWarehouseId: "w2",
  stockLocationId: "1",
  createdAt: "2026-09-22T00:00:00Z",
  createdBy: "1",
  expectedEndOn: null,
  ...overrides,
});

describe("projectTransferDetail", () => {
  it("status done → route.currentKind destination", () => {
    const snapshot = emptySnapshot();
    const doc = transfer({ id: "t1", status: "done" });
    const projection = projectTransferDetail(snapshot, [], doc);
    assert.equal(projection.route.currentKind, "destination");
  });
});

const inTransit = (
  productId: string,
  quantity: number,
  owner: { type: "order" | "region"; id: string } | null,
): StockBalance => ({
  productId,
  locationType: "transfer",
  locationId: "t1",
  stockState: owner ? "reserved" : "free",
  quantity,
  ownerType: owner?.type ?? null,
  ownerId: owner?.id ?? null,
});

describe("transferHasMixedOwners", () => {
  const sent = transfer({ id: "t1", status: "sent" });

  it("is true when the transfer carries an order's goods and free stock", () => {
    const balances = [inTransit("p1", 2, { type: "order", id: "o1" }), inTransit("p2", 4, null)];
    assert.equal(transferHasMixedOwners(projectTransferDetail(emptySnapshot(), balances, sent)), true);
  });

  it("is true for two different orders", () => {
    const balances = [inTransit("p1", 2, { type: "order", id: "o1" }), inTransit("p1", 1, { type: "order", id: "o2" })];
    assert.equal(transferHasMixedOwners(projectTransferDetail(emptySnapshot(), balances, sent)), true);
  });

  it("is false when every product belongs to one order", () => {
    const balances = [inTransit("p1", 2, { type: "order", id: "o1" }), inTransit("p2", 3, { type: "order", id: "o1" })];
    assert.equal(transferHasMixedOwners(projectTransferDetail(emptySnapshot(), balances, sent)), false);
  });
});
