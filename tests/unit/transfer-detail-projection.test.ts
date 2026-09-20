import { describe, expect, it } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import { computeStockBalances } from "@/features/logistics/logistics-balances";
import {
  projectTransferDetail,
  transferOwnerRef,
} from "@/features/logistics/transfer-detail-projection";
import type {
  LogisticsSnapshot,
  StockBalance,
  StockTransaction,
  Transfer,
  TransferAllocation,
  TransferLine,
} from "@/features/logistics/logistics-types";

const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [
      {
        id: "22",
        code: "PRD-22",
        sku: "ENDURO-250",
        name: "Enduro 250",
        unit: "pcs",
        manufacturerId: "6",
      },
      {
        id: "30",
        code: "PRD-30",
        sku: "FORCE-1100",
        name: "Force 1100 EFI",
        unit: "pcs",
        manufacturerId: "6",
      },
    ],
    manufacturers: [{ id: "6", code: "PLT-6", name: "Shineray", warehouseId: "7" }],
    warehouses: [
      { id: "7", code: "WH-7", name: "Plant", manufacturerId: "6" },
      { id: "11", code: "WH-11", name: "Hub", manufacturerId: null },
    ],
    regions: [{ id: "1", code: "REG-1", name: "North" }],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "901",
        number: "OMS-901",
        status: "open",
        createdAt: "",
        closedAt: null,
        expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [{ id: "901", orderId: "901", productId: "22", quantity: 4 }],
    productionOrders: [],
    productionOrderLines: [],
    reservations: [],
    reservationLines: [],
    transfers: [
      {
        id: "tr-1",
        number: "TR-901",
        fromWarehouseId: "7",
        toWarehouseId: "11",
        status: "sent",
        createdAt: "2026-09-06T09:42:00Z",
        sentAt: "2026-09-06T09:42:00Z",
        cancelledAt: null,
        expectedEndOn: "2026-09-08",
      },
    ],
    transferLines: [
      { id: "trl-1", transferId: "tr-1", productId: "22", quantity: 4 },
      { id: "trl-2", transferId: "tr-1", productId: "30", quantity: 12 },
    ],
    transferAllocations: [],
    shipments: [],
    shipmentLines: [],
    outputs: [],
    outputLines: [],
    outputAllocations: [],
    returns: [],
    returnLines: [],
    transactions: [],
    ...partial,
  }) as LogisticsSnapshot;

const transferOf = (data: LogisticsSnapshot, status: Transfer["status"] = "sent"): Transfer => ({
  ...data.transfers[0]!,
  status,
});

const tx = (
  partial: Partial<StockTransaction> & Pick<StockTransaction, "transactionId" | "productId" | "quantity" | "stockState">,
): StockTransaction => ({
  occurredAt: "2026-09-06T09:42:00Z",
  postedAt: "2026-09-06T09:42:00Z",
  unit: "pcs",
  locationType: "transfer",
  locationId: "tr-1",
  ownerType: null,
  ownerId: null,
  sourceType: "transfer_send",
  sourceId: "tr-1",
  sourceLineId: null,
  operationId: `op-${partial.transactionId}`,
  idempotencyKey: partial.transactionId,
  reversesTransactionId: null,
  ...partial,
});

const liveBalances = (): StockBalance[] => [
  {
    productId: "22",
    locationType: "transfer",
    locationId: "tr-1",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "901",
    quantity: 4,
  },
  {
    productId: "30",
    locationType: "transfer",
    locationId: "tr-1",
    stockState: "free",
    ownerType: null,
    ownerId: null,
    quantity: 8,
  },
  {
    productId: "30",
    locationType: "transfer",
    locationId: "tr-1",
    stockState: "reserved",
    ownerType: "region",
    ownerId: "1",
    quantity: 4,
  },
  {
    productId: "30",
    locationType: "transfer",
    locationId: "tr-1",
    stockState: "free",
    ownerType: null,
    ownerId: null,
    quantity: 0,
  },
];

describe("transferOwnerRef", () => {
  it("formats Free, order number, and region code plus name", () => {
    const data = snapshot();
    expect(transferOwnerRef(data, null, null)).toMatchObject({
      kind: "free",
      title: "Free",
      breakdownLabel: "Free",
    });
    expect(transferOwnerRef(data, "order", "901")).toMatchObject({
      kind: "order",
      title: "Order OMS-901",
      breakdownLabel: "OMS-901",
    });
    expect(transferOwnerRef(data, "region", "1")).toMatchObject({
      kind: "region",
      title: "Region REG-1 · North",
      breakdownLabel: "REG-1 · North",
    });
  });
});

describe("projectTransferDetail live balances", () => {
  it("groups positive Free, Order, and Region buckets from live transfer stock", () => {
    const data = snapshot();
    const projected = projectTransferDetail(data, liveBalances(), transferOf(data));

    expect(projected.source).toBe("live");
    expect(projected.route.currentKind).toBe("transfer");
    expect(projected.route.current.value).toBe("Transfer TR-901");
    expect(projected.route.origin.current).toBe(false);
    expect(projected.route.current.current).toBe(true);
    expect(projected.route.destination.current).toBe(false);
    expect(projected.groups.map((group) => [group.title, group.total])).toEqual([
      ["Free", 8],
      ["Order OMS-901", 4],
      ["Region REG-1 · North", 4],
    ]);
    expect(projected.groups[0]?.lines).toEqual([{ productId: "30", quantity: 8 }]);
    expect(projected.groups[1]?.lines).toEqual([{ productId: "22", quantity: 4 }]);
    expect(projected.groups[2]?.lines).toEqual([{ productId: "30", quantity: 4 }]);
    expect(projected.freeTotal).toBe(8);
    expect(projected.canReserveInTransit).toBe(true);
  });

  it("keeps ungrouped product totals equal to owner breakdowns and omits zero buckets", () => {
    const data = snapshot();
    const projected = projectTransferDetail(data, liveBalances(), transferOf(data));
    const force = projected.products.find((row) => row.productId === "30");
    const enduro = projected.products.find((row) => row.productId === "22");

    expect(enduro?.total).toBe(4);
    expect(enduro?.breakdown.map((item) => [item.breakdownLabel, item.quantity])).toEqual([["OMS-901", 4]]);
    expect(enduro?.breakdown.reduce((sum, item) => sum + item.quantity, 0)).toBe(enduro?.total);

    expect(force?.total).toBe(12);
    expect(force?.breakdown.map((item) => [item.breakdownLabel, item.quantity])).toEqual([
      ["Free", 8],
      ["REG-1 · North", 4],
    ]);
    expect(force?.breakdown.reduce((sum, item) => sum + item.quantity, 0)).toBe(force?.total);
  });

  it("does not infer an owner split from sent status when only free stock is present", () => {
    const data = snapshot();
    const balances: StockBalance[] = [
      {
        productId: "22",
        locationType: "transfer",
        locationId: "tr-1",
        stockState: "free",
        ownerType: null,
        ownerId: null,
        quantity: 4,
      },
    ];
    const projected = projectTransferDetail(data, balances, transferOf(data));
    expect(projected.groups.map((group) => group.kind)).toEqual(["free"]);
    expect(projected.groups[0]?.total).toBe(4);
  });
});

describe("projectTransferDetail terminal history", () => {
  const historyTransactions = (): StockTransaction[] => [
    tx({ transactionId: "tx-send-22", productId: "22", quantity: 4, stockState: "free", postedAt: "2026-09-06T09:42:00Z" }),
    tx({ transactionId: "tx-send-30", productId: "30", quantity: 12, stockState: "free", postedAt: "2026-09-06T09:42:00Z" }),
    tx({
      transactionId: "tx-rsv-22-out",
      productId: "22",
      quantity: -4,
      stockState: "free",
      sourceType: "reservation",
      sourceId: "rsv-1",
      postedAt: "2026-09-06T09:43:00Z",
    }),
    tx({
      transactionId: "tx-rsv-22-in",
      productId: "22",
      quantity: 4,
      stockState: "reserved",
      ownerType: "order",
      ownerId: "901",
      sourceType: "reservation",
      sourceId: "rsv-1",
      postedAt: "2026-09-06T09:43:00Z",
    }),
    tx({
      transactionId: "tx-rsv-30-out",
      productId: "30",
      quantity: -4,
      stockState: "free",
      sourceType: "reservation",
      sourceId: "rsv-2",
      postedAt: "2026-09-06T10:12:00Z",
    }),
    tx({
      transactionId: "tx-rsv-30-in",
      productId: "30",
      quantity: 4,
      stockState: "reserved",
      ownerType: "region",
      ownerId: "1",
      sourceType: "reservation",
      sourceId: "rsv-2",
      postedAt: "2026-09-06T10:12:00Z",
    }),
    tx({
      transactionId: "tx-complete-22",
      productId: "22",
      quantity: -4,
      stockState: "reserved",
      ownerType: "order",
      ownerId: "901",
      sourceType: "transfer_complete",
      postedAt: "2026-09-08T12:00:00Z",
    }),
    tx({
      transactionId: "tx-complete-30-free",
      productId: "30",
      quantity: -8,
      stockState: "free",
      sourceType: "transfer_complete",
      postedAt: "2026-09-08T12:00:00Z",
    }),
    tx({
      transactionId: "tx-complete-30-region",
      productId: "30",
      quantity: -4,
      stockState: "reserved",
      ownerType: "region",
      ownerId: "1",
      sourceType: "transfer_complete",
      postedAt: "2026-09-08T12:00:00Z",
    }),
  ];

  it("reconstructs the last in-transit owner snapshot after delivery empties live balances", () => {
    const data = snapshot({
      reservations: [
        {
          id: "rsv-1",
          number: "RSV-1",
          locationType: "transfer",
          locationId: "tr-1",
          toOwnerType: "order",
          toOwnerId: "901",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "2026-09-06T09:43:00Z",
          postedAt: "2026-09-06T09:43:00Z",
        },
        {
          id: "rsv-2",
          number: "RSV-2",
          locationType: "transfer",
          locationId: "tr-1",
          toOwnerType: "region",
          toOwnerId: "1",
          status: "posted",
          origin: "manual",
          note: "",
          createdAt: "2026-09-06T10:12:00Z",
          postedAt: "2026-09-06T10:12:00Z",
        },
      ],
      reservationLines: [
        { id: "rsvl-1", reservationId: "rsv-1", productId: "22", quantity: 4, fromOwnerType: null, fromOwnerId: null },
        { id: "rsvl-2", reservationId: "rsv-2", productId: "30", quantity: 4, fromOwnerType: null, fromOwnerId: null },
      ],
      transactions: historyTransactions(),
    });
    const live = computeStockBalances(data.transactions).filter(
      (entry) => entry.locationType === "transfer" && entry.locationId === "tr-1",
    );
    expect(live.every((entry) => entry.quantity <= 1e-9)).toBe(true);

    const projected = projectTransferDetail(data, live, transferOf(data, "delivered"));
    expect(projected.source).toBe("history");
    expect(projected.route.currentKind).toBe("destination");
    expect(projected.route.current.value).toBe("WH-11");
    expect(projected.route.origin.current).toBe(false);
    expect(projected.route.current.current).toBe(false);
    expect(projected.route.destination.current).toBe(true);
    expect(projected.groups.map((group) => [group.title, group.total])).toEqual([
      ["Free", 8],
      ["Order OMS-901", 4],
      ["Region REG-1 · North", 4],
    ]);
    expect(projected.canReserveInTransit).toBe(false);
    expect(projected.activity.map((event) => event.title)).toEqual([
      "Transfer sent",
      "Order reservation created",
      "Region reservation created",
      "Transfer delivered",
    ]);
    expect(projected.activity.map((event) => event.href)).toEqual([
      "/store/logistics/transfers/tr-1",
      "/store/logistics/reservations/rsv-1",
      "/store/logistics/reservations/rsv-2",
      "/store/logistics/transfers/tr-1",
    ]);
  });

  it("uses residual cancelled live balances instead of reconstructed history", () => {
    const data = snapshot({
      transactions: historyTransactions().map((entry) =>
        entry.sourceType === "transfer_complete"
          ? { ...entry, sourceType: "transfer_send", reversesTransactionId: `rev-${entry.transactionId}` }
          : entry,
      ),
    });
    const residual: StockBalance[] = [
      {
        productId: "30",
        locationType: "transfer",
        locationId: "tr-1",
        stockState: "free",
        ownerType: null,
        ownerId: null,
        quantity: 2,
      },
    ];
    const projected = projectTransferDetail(data, residual, transferOf(data, "cancelled"));
    expect(projected.source).toBe("live");
    expect(projected.route.currentKind).toBe("transfer");
    expect(projected.route.current.current).toBe(true);
    expect(projected.route.origin.current).toBe(false);
    expect(projected.route.destination.current).toBe(false);
    expect(projected.groups.map((group) => [group.kind, group.total])).toEqual([["free", 2]]);
    expect(projected.canReserveInTransit).toBe(false);
  });

  it("reconstructs cancelled history and points current location at origin when no residual remains", () => {
    const data = snapshot({
      transactions: [
        ...historyTransactions().filter((entry) => entry.sourceType !== "transfer_complete"),
        tx({
          transactionId: "tx-cancel-22",
          productId: "22",
          quantity: -4,
          stockState: "reserved",
          ownerType: "order",
          ownerId: "901",
          reversesTransactionId: "tx-rsv-22-in",
          postedAt: "2026-09-07T08:00:00Z",
        }),
        tx({
          transactionId: "tx-cancel-30",
          productId: "30",
          quantity: -12,
          stockState: "free",
          reversesTransactionId: "tx-send-30",
          postedAt: "2026-09-07T08:00:00Z",
        }),
      ],
    });
    const projected = projectTransferDetail(data, [], transferOf(data, "cancelled"));
    expect(projected.source).toBe("history");
    expect(projected.route.currentKind).toBe("origin");
    expect(projected.route.current.value).toBe("WH-7");
    expect(projected.route.origin.current).toBe(true);
    expect(projected.route.current.current).toBe(false);
    expect(projected.route.destination.current).toBe(false);
    expect(projected.groups.some((group) => group.kind === "order")).toBe(true);
    expect(projected.groups.some((group) => group.kind === "free")).toBe(true);
    expect(projected.activity.map((event) => event.title)).toEqual([
      "Transfer sent",
      "Reservation posted",
      "Reservation posted",
      "Transfer cancelled",
    ]);
    expect(projected.activity.at(-1)).toMatchObject({
      title: "Transfer cancelled",
      occurredAt: "2026-09-07T08:00:00Z",
      href: "/store/logistics/transfers/tr-1",
    });
  });

  it("does not treat an unrelated same-id reservation as transfer activity", () => {
    const data = snapshot({
      transactions: [
        tx({ transactionId: "tx-send-22", productId: "22", quantity: 4, stockState: "free" }),
        tx({
          transactionId: "tx-other-rsv",
          productId: "22",
          quantity: 4,
          stockState: "reserved",
          locationType: "warehouse",
          locationId: "7",
          sourceType: "reservation",
          sourceId: "tr-1",
          ownerType: "order",
          ownerId: "901",
          postedAt: "2026-09-06T11:00:00Z",
        }),
      ],
    });
    const projected = projectTransferDetail(data, [], transferOf(data));
    expect(projected.activity.map((event) => event.title)).toEqual(["Transfer sent"]);
  });
});

describe("projectTransferDetail document fallback", () => {
  it("uses transfer lines and saved allocations when ledger evidence is unusable", () => {
    const lines: TransferLine[] = [
      { id: "trl-1", transferId: "tr-1", productId: "22", quantity: 4 },
      { id: "trl-2", transferId: "tr-1", productId: "30", quantity: 12 },
    ];
    const allocations: TransferAllocation[] = [
      { id: "tra-1", lineId: "trl-1", ownerType: "order", ownerId: "901", quantity: 4 },
      { id: "tra-2", lineId: "trl-2", ownerType: "region", ownerId: "1", quantity: 5 },
    ];
    const data = snapshot({
      transferLines: lines,
      transferAllocations: allocations,
      transactions: [
        tx({
          transactionId: "tx-unusable",
          productId: "22",
          quantity: 4,
          stockState: "free",
          sourceType: "transfer_complete",
        }),
      ],
    });
    const projected = projectTransferDetail(data, [], transferOf(data, "delivered"));
    expect(projected.source).toBe("document");
    expect(projected.groups.map((group) => [group.title, group.total])).toEqual([
      ["Free", 7],
      ["Order OMS-901", 4],
      ["Region REG-1 · North", 5],
    ]);
    const force = projected.products.find((row) => row.productId === "30");
    expect(force?.total).toBe(12);
    expect(force?.breakdown.reduce((sum, item) => sum + item.quantity, 0)).toBe(12);
  });

  it("fills products missing or incomplete in reconstructed history from the document", () => {
    const data = snapshot({
      transferAllocations: [
        { id: "tra-1", lineId: "trl-1", ownerType: "order", ownerId: "901", quantity: 4 },
        { id: "tra-2", lineId: "trl-2", ownerType: "region", ownerId: "1", quantity: 5 },
      ],
      transactions: [
        tx({ transactionId: "tx-send-22", productId: "22", quantity: 4, stockState: "free" }),
        tx({
          transactionId: "tx-partial-30",
          productId: "30",
          quantity: 3,
          stockState: "free",
        }),
      ],
    });
    const projected = projectTransferDetail(data, [], transferOf(data, "delivered"));
    expect(projected.source).toBe("history");
    expect(projected.products.find((row) => row.productId === "22")?.total).toBe(4);
    expect(projected.products.find((row) => row.productId === "22")?.breakdown.map((item) => item.kind)).toEqual([
      "free",
    ]);
    const force = projected.products.find((row) => row.productId === "30");
    expect(force?.total).toBe(12);
    expect(force?.breakdown.map((item) => [item.breakdownLabel, item.quantity])).toEqual([
      ["Free", 7],
      ["REG-1 · North", 5],
    ]);
  });
});
