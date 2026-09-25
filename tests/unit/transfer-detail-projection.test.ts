import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LOGISTICS_CODE_PREFIXES } from "@/features/logistics/logistics-codes";
import { projectTransferDetail } from "@/features/logistics/transfer-detail-projection";
import type { LogisticsSnapshot, Transfer } from "@/features/logistics/logistics-types";

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
    settings: { id: "1", codePrefixes: { ...LOGISTICS_CODE_PREFIXES } },
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
