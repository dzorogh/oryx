import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { CustomerOrderLine, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { CustomerOrderLinesTable } from "@/features/logistics/ui/customer-order-lines-table";
import { tx } from "./logistics-test-fixtures";

afterEach(() => {
  cleanup();
});

const snapshot = (partial: Partial<LogisticsSnapshot> = {}): LogisticsSnapshot =>
  ({
    products: [
      {
        id: "p-enduro",
        code: "PRD-1",
        sku: "EN125-GR",
        name: "Enduro 125",
        unit: "pcs",
        manufacturerId: null,
      },
      {
        id: "p-cruiser",
        code: "PRD-2",
        sku: "CR300-FJ",
        name: "Cruiser 300 FJ",
        unit: "pcs",
        manufacturerId: null,
      },
    ],
    manufacturers: [{ id: "m-1", code: "PLT-1", name: "Plant One", warehouseId: "wh-2" }],
    warehouses: [
      { id: "wh-10", code: "WH-10", name: "Ten", manufacturerId: null },
      { id: "wh-2", code: "WH-2", name: "Two", manufacturerId: "m-1" },
      { id: "wh-1", code: "WH-1", name: "One", manufacturerId: null },
    ],
    regions: [],
    settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
    customerOrders: [
      {
        id: "co-1",
        number: "OMS-184",
        status: "open",
        createdAt: "",
        createdBy: "1",
      expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [
      { id: "col-complete", orderId: "co-1", productId: "p-enduro", quantity: 10 },
      { id: "col-open", orderId: "co-1", productId: "p-cruiser", quantity: 12 },
    ],
    productionOrders: [
      {
        id: "po-1",
        number: "PO-1",
        manufacturerId: "m-1",
        status: "in_progress",
        createdAt: "",
        createdBy: "1",
      expectedEndOn: null,
      },
    ],
    productionOrderLines: [
      { id: "pol-1", orderId: "po-1", productId: "p-cruiser", quantity: 4, activatedQuantity: 4 },
    ],
    reservations: [],
    reservationLines: [],
    transfers: [{ id: "tr-1", number: "TR-1", fromWarehouseId: "wh-1", toWarehouseId: "wh-2", status: "sent", createdAt: "", createdBy: "1", expectedEndOn: null }],
    transferLines: [],
    transferAllocations: [],
    shipments: [],
    shipmentLines: [],
    outputs: [],
    outputLines: [],
    outputAllocations: [],
    returns: [],
    returnLines: [],
    users: [],
    documentHistory: [],
    transactions: [
      tx({
        transactionId: "tx-out-open",
        productId: "p-cruiser",
        quantity: 7,
        locationType: "warehouse",
        locationId: "wh-2",
        stockState: "reserved",
        ownerType: "order",
        ownerId: "co-1",
        sourceType: "production_output",
        sourceId: "out-1",
      }),
    ],
    ...partial,
  }) as LogisticsSnapshot;

const balances: StockBalance[] = [
  {
    productId: "p-enduro",
    locationType: "customer_order",
    locationId: "co-1",
    stockState: "shipped",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 10,
  },
  {
    productId: "p-cruiser",
    locationType: "warehouse",
    locationId: "wh-2",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 2,
  },
  {
    productId: "p-cruiser",
    locationType: "warehouse",
    locationId: "wh-10",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 4,
  },
  {
    productId: "p-cruiser",
    locationType: "transfer",
    locationId: "tr-1",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 1,
  },
  {
    productId: "p-cruiser",
    locationType: "production_order",
    locationId: "pol-1",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "co-1",
    quantity: 3,
  },
  {
    productId: "p-cruiser",
    locationType: "warehouse",
    locationId: "wh-1",
    stockState: "free",
    ownerType: null,
    ownerId: null,
    quantity: 8,
  },
];

const renderTable = (
  overrides: {
    canAct?: boolean;
    extraBalances?: StockBalance[];
    snapshot?: LogisticsSnapshot;
    lines?: CustomerOrderLine[];
  } = {},
) => {
  const onReserve = vi.fn();
  const onShip = vi.fn();
  const onRelease = vi.fn();
  const data = overrides.snapshot ?? snapshot();
  render(
    <CustomerOrderLinesTable
      snapshot={data}
      balances={[...balances, ...(overrides.extraBalances ?? [])]}
      lines={overrides.lines ?? data.customerOrderLines}
      canAct={overrides.canAct ?? true}
      onReserve={onReserve}
      onShip={onShip}
      onRelease={onRelease}
    />,
  );
  return { onReserve, onShip, onRelease };
};

describe("CustomerOrderLinesTable", () => {
  const expectShippedLast = () => {
    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers.at(-1)).toBe("Shipped");
    expect(headers).not.toContain("Actions");
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  };

  it("renders English matrix headers ending with Shipped and warehouse codes without wrapping labels", () => {
    renderTable();

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual([
      "Product",
      "Ordered",
      "In production",
      "Produced",
      "In transit",
      "WH-2",
      "WH-10",
      "Shipped",
    ]);
    expectShippedLast();
    expect(screen.queryByRole("columnheader", { name: "WH-1" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WH-2" })).toHaveAttribute("href", "/store/logistics/warehouses/wh-2");
    expect(screen.getByRole("link", { name: "WH-10" })).toHaveAttribute("href", "/store/logistics/warehouses/wh-10");
    expect(
      screen.getAllByText(/In production is current WIP reserved for this order line/).length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      screen.getAllByText(/Produced is cumulative completed output for this line/).length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Do not add Produced to current location columns/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("columnheader", { name: "In production" })).toHaveAttribute(
      "title",
      "Current WIP reserved for this order line. Do not add to Produced.",
    );
    expect(screen.getByRole("columnheader", { name: "Produced" })).toHaveAttribute(
      "title",
      "Cumulative completed output for this line. Do not add to current location columns.",
    );
    expect(screen.queryByText("Нехватка")).not.toBeInTheDocument();
    expect(screen.queryByText("To reserve")).not.toBeInTheDocument();

    const openRow = screen.getByRole("link", { name: "Cruiser 300 FJ" }).closest("tr");
    expect(openRow).not.toBeNull();
    const cells = within(openRow!).getAllByRole("cell");
    expect(cells).toHaveLength(8);
    expect(cells[1]).toHaveTextContent("12");
    expect(cells[2]).toHaveTextContent("3");
    expect(cells[3]).toHaveTextContent("7");
    expect(cells[4]).toHaveTextContent("1");
    expect(cells[5]).toHaveTextContent("2");
    expect(cells[6]).toHaveTextContent("4");
    expect(cells[7]).toHaveTextContent("—");
    expect(within(cells[0]).getByRole("button", { name: "Actions for Cruiser 300 FJ" })).toBeInTheDocument();
  });

  it("keeps Shipped as the last column when canAct is false", () => {
    renderTable({ canAct: false });
    expectShippedLast();
    expect(screen.queryByRole("button", { name: /Actions for/ })).not.toBeInTheDocument();
  });

  it("marks a fully shipped line complete with a check in Shipped", () => {
    renderTable({ canAct: false });
    expectShippedLast();

    const completeLink = screen.getByRole("link", { name: "Enduro 125" });
    const row = completeLink.closest("tr");
    expect(row).not.toBeNull();
    expect(within(row!).getByLabelText("Complete")).toBeInTheDocument();
    expect(within(row!).getAllByText("10")).toHaveLength(2);

    const openLink = screen.getByRole("link", { name: "Cruiser 300 FJ" });
    const openRow = openLink.closest("tr");
    expect(openRow).not.toBeNull();
    expect(within(openRow!).queryByLabelText("Complete")).not.toBeInTheDocument();
  });

  it("keeps Reserve, Ship, and Release including production and transfer places in the Product cell menu", async () => {
    const user = userEvent.setup();
    const { onReserve, onShip, onRelease } = renderTable();
    expectShippedLast();

    const openRow = screen.getByRole("link", { name: "Cruiser 300 FJ" }).closest("tr");
    expect(openRow).not.toBeNull();
    const productCell = within(openRow!).getAllByRole("cell")[0];
    const actions = within(productCell).getByRole("button", { name: "Actions for Cruiser 300 FJ" });

    expect(screen.queryByRole("button", { name: "Reserve" })).not.toBeInTheDocument();
    await user.click(actions);

    await user.click(await screen.findByRole("menuitem", { name: "Reserve" }));
    expect(onReserve).toHaveBeenCalledTimes(1);

    await user.click(within(productCell).getByRole("button", { name: "Actions for Cruiser 300 FJ" }));
    await user.click(await screen.findByRole("menuitem", { name: "Ship" }));
    expect(onShip).toHaveBeenCalledTimes(1);

    await user.click(within(productCell).getByRole("button", { name: "Actions for Cruiser 300 FJ" }));
    expect(await screen.findByRole("menuitem", { name: "Release WH-2 · 2 · PLT-1" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Release TR-1 · 1 · WH-1 → WH-2" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Release PO-1 · 3 · PLT-1" }));
    expect(onRelease).toHaveBeenCalledWith({
      line: expect.objectContaining({ id: "col-open" }),
      locationType: "production_order",
      locationId: "pol-1",
    });
  });

  it("does not render a menu trigger on a line with no available actions", () => {
    renderTable();
    expectShippedLast();
    expect(screen.queryByRole("button", { name: "Actions for Enduro 125" })).not.toBeInTheDocument();
  });

  it("shows empty-order copy spanning the fixed matrix columns", () => {
    renderTable({ lines: [] });

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(headers).toEqual(["Product", "Ordered", "In production", "Produced", "In transit", "Shipped"]);
    expectShippedLast();
    const empty = screen.getByText("This customer order has no products.");
    expect(empty).toBeInTheDocument();
    expect(empty.closest("td")).toHaveAttribute("colspan", "6");
    expect(screen.getByRole("heading", { name: "Products" })).toBeInTheDocument();
  });
});
