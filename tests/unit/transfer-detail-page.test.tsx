import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import { TransferDetailPage } from "@/features/logistics/transfers-page";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { tx as fixtureTx } from "./logistics-test-fixtures";

const paramsMock = vi.hoisted(() => ({ id: "tr-1" }));

const storeMock = vi.hoisted(() => {
  let snapshot: LogisticsSnapshot | null = null;
  let balances: StockBalance[] = [];
  let isLoading = false;
  let error: string | null = null;
  const reload = vi.fn(async () => undefined);
  return {
    reload,
    use: (
      next: LogisticsSnapshot,
      nextBalances: StockBalance[] = [],
      state: { isLoading?: boolean; error?: string | null } = {},
    ) => {
      snapshot = next;
      balances = nextBalances;
      isLoading = state.isLoading ?? false;
      error = state.error ?? null;
    },
    reset: () => {
      snapshot = null;
      balances = [];
      isLoading = false;
      error = null;
      reload.mockReset();
      reload.mockResolvedValue(undefined);
    },
    current: () => ({
      snapshot: snapshot as LogisticsSnapshot,
      balances,
      isLoading,
      error,
      reload,
      configured: true,
    }),
  };
});

const apiMock = vi.hoisted(() => ({
  completeTransfer: vi.fn(async () => undefined),
  cancelDocument: vi.fn(async () => undefined),
  updateExpectedEnd: vi.fn(async () => undefined),
  createAndPostReservation: vi.fn(async () => undefined),
  createReservationDraft: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  useParams: () => paramsMock,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/logistics/use-logistics-store", () => ({
  useLogisticsStore: () => storeMock.current(),
}));

vi.mock("@/features/logistics/logistics-api", async () => {
  const actual = await vi.importActual<typeof import("@/features/logistics/logistics-api")>(
    "@/features/logistics/logistics-api",
  );
  return {
    ...actual,
    completeTransfer: apiMock.completeTransfer,
    cancelDocument: apiMock.cancelDocument,
    updateExpectedEnd: apiMock.updateExpectedEnd,
    createAndPostReservation: apiMock.createAndPostReservation,
    createReservationDraft: apiMock.createReservationDraft,
  };
});

const tx = (
  partial: Parameters<typeof fixtureTx>[0] & { transactionId?: string; sourceType?: string; sourceId?: string },
) =>
  fixtureTx({
    locationType: "transfer",
    locationId: "tr-1",
    createdAt: "2026-09-06T09:42:00Z",
    documentType: partial.documentType ?? (partial.sourceType ? undefined : "transfer"),
    documentId: partial.documentId ?? partial.sourceId ?? "tr-1",
    ...partial,
  });

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
        createdBy: "1",
      expectedEndOn: null,
        description: "",
      },
    ],
    customerOrderLines: [{ id: "901", orderId: "901", productId: "22", quantity: 4 }],
    productionOrders: [],
    productionOrderLines: [],
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
      createdBy: "1",
      },
    ],
    reservationLines: [
      { id: "rsvl-1", reservationId: "rsv-1", productId: "22", quantity: 4, fromOwnerType: null, fromOwnerId: null },
    ],
    transfers: [
      {
        id: "tr-1",
        number: "TR-901",
        fromWarehouseId: "7",
        toWarehouseId: "11",
        status: "sent",
        createdAt: "2026-09-06T09:42:00Z",
        createdBy: "1",
      expectedEndOn: "2026-09-08",
      },
    ],
    transferLines: [
      { id: "trl-1", transferId: "tr-1", productId: "22", quantity: 4 },
      { id: "trl-2", transferId: "tr-1", productId: "30", quantity: 8 },
    ],
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
      tx({ transactionId: "tx-send-22", productId: "22", quantity: 4, stockState: "free" }),
      tx({ transactionId: "tx-send-30", productId: "30", quantity: 8, stockState: "free" }),
      tx({
        transactionId: "tx-rsv-out",
        productId: "22",
        quantity: -4,
        stockState: "free",
        sourceType: "reservation",
        sourceId: "rsv-1",
        createdAt: "2026-09-06T09:43:00Z",
      }),
      tx({
        transactionId: "tx-rsv-in",
        productId: "22",
        quantity: 4,
        stockState: "reserved",
        ownerType: "order",
        ownerId: "901",
        sourceType: "reservation",
        sourceId: "rsv-1",
        createdAt: "2026-09-06T09:43:00Z",
      }),
    ],
    ...partial,
  }) as LogisticsSnapshot;

const sentBalances: StockBalance[] = [
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
];

const emptySnapshot = (): LogisticsSnapshot => snapshot({ transfers: [], transferLines: [], transactions: [] });

afterEach(() => {
  storeMock.reset();
  cleanup();
  apiMock.completeTransfer.mockReset();
  apiMock.cancelDocument.mockReset();
  apiMock.updateExpectedEnd.mockReset();
  apiMock.createAndPostReservation.mockReset();
  apiMock.createReservationDraft.mockReset();
  paramsMock.id = "tr-1";
});

const chooseOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string | RegExp,
) => {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(await screen.findByRole("option", { name: option }));
};

describe("TransferDetailPage header and route", () => {
  it("shows one English status, one expected date, and one origin-current-destination route", () => {
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    expect(screen.getByRole("heading", { level: 1, name: "TR-901" })).toBeTruthy();
    expect(screen.getByText("In transit")).toBeTruthy();
    expect(screen.getAllByText("In transit")).toHaveLength(1);
    expect(screen.getByLabelText("Expected")).toBeTruthy();
    expect(screen.getAllByLabelText("Expected")).toHaveLength(1);

    const route = screen.getByLabelText("Transfer route");
    expect(within(route).getByText("Origin")).toBeTruthy();
    expect(within(route).getByText("Current location")).toBeTruthy();
    expect(within(route).getByText("Destination")).toBeTruthy();
    expect(within(route).getByText("Transfer TR-901")).toBeTruthy();
    const currentNode = route.querySelector('[data-current="true"]');
    expect(currentNode).toHaveTextContent("Current location");
    expect(currentNode).toHaveTextContent("Transfer TR-901");
    expect(currentNode).toHaveAttribute("aria-current", "location");
    expect(route.querySelectorAll('[data-current="true"]')).toHaveLength(1);
    expect(screen.queryByText("Товары")).toBeNull();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Добавить товар" })).toBeNull();
  });
});

describe("TransferDetailPage manifest", () => {
  it("defaults to grouped owner sections with exact product and group quantities", () => {
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    expect(screen.getByRole("heading", { level: 2, name: "Products and reservations" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Group by reservation" })).toBeChecked();
    expect(screen.getByRole("rowheader", { name: "Free" })).toBeTruthy();
    expect(screen.getByRole("rowheader", { name: /Order OMS-901/ })).toBeTruthy();
    expect(screen.getAllByText("8").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Enduro 250").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Force 1100 EFI").length).toBeGreaterThan(0);
  });

  it("reveals Free, order number, and region labels in an ungrouped disclosure whose quantities sum to the total", async () => {
    const user = userEvent.setup();
    storeMock.use(
      snapshot({
        regions: [{ id: "1", code: "REG-1", name: "North · Coast" }],
      }),
      [
        ...sentBalances,
        {
          productId: "30",
          locationType: "transfer",
          locationId: "tr-1",
          stockState: "reserved",
          ownerType: "region",
          ownerId: "1",
          quantity: 4,
        },
      ],
    );
    render(<TransferDetailPage />);

    await user.click(screen.getByRole("switch", { name: "Group by reservation" }));
    expect(screen.getByRole("switch", { name: "Group by reservation" })).not.toBeChecked();

    const disclosure = screen.getByRole("button", { name: /Force 1100 EFI, 12/ });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(within(disclosure).queryByRole("link")).toBeNull();
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(disclosure).toHaveAttribute("aria-controls");

    const panel = document.getElementById(disclosure.getAttribute("aria-controls") ?? "");
    expect(panel).toBeTruthy();
    expect(within(panel as HTMLElement).getByText("Free")).toBeTruthy();
    expect(within(panel as HTMLElement).getByText("REG-1 · North · Coast")).toBeTruthy();
    expect(within(panel as HTMLElement).getByText("8")).toBeTruthy();
    expect(within(panel as HTMLElement).getByText("4")).toBeTruthy();
  });
});

describe("TransferDetailPage actions", () => {
  it("opens ReservationForm preset to this transfer when Free stock is in transit", async () => {
    const user = userEvent.setup();
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    await user.click(screen.getByRole("button", { name: "Reserve in transit" }));
    expect(screen.getByRole("heading", { name: "Reservation" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Place" })).toHaveTextContent(/TR-901/);
    await chooseOption(user, "Order", "OMS-901");
    await chooseOption(user, "Place", /TR-901/);
    await chooseOption(user, "Product 1", /Force 1100 EFI/);
    await user.click(screen.getByRole("button", { name: /^Reserve$/ }));
    expect(apiMock.createAndPostReservation).toHaveBeenCalledWith(
      expect.objectContaining({
        locationType: "transfer",
        locationId: "tr-1",
      }),
    );
    expect(storeMock.reload).toHaveBeenCalledTimes(1);
  });

  it("hides Reserve in transit without positive Free and hides lifecycle actions after delivery", () => {
    storeMock.use(snapshot(), [
      {
        productId: "22",
        locationType: "transfer",
        locationId: "tr-1",
        stockState: "reserved",
        ownerType: "order",
        ownerId: "901",
        quantity: 4,
      },
    ]);
    const { rerender } = render(<TransferDetailPage />);
    expect(screen.queryByRole("button", { name: "Reserve in transit" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark delivered" })).toBeTruthy();

    storeMock.use(
      snapshot({
        transfers: [
          {
            ...snapshot().transfers[0]!,
            status: "delivered",
          },
        ],
      }),
      [],
    );
    rerender(<TransferDetailPage />);
    expect(screen.queryByRole("button", { name: "Reserve in transit" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Mark delivered" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel transfer" })).toBeNull();
    expect(screen.getByText("Delivered")).toBeTruthy();

    const route = screen.getByLabelText("Transfer route");
    const currentNode = route.querySelector('[data-current="true"]');
    expect(currentNode).toHaveTextContent("Destination");
    expect(currentNode).toHaveTextContent("WH-11");
    expect(currentNode).toHaveAttribute("aria-current", "location");
    expect(currentNode).not.toHaveTextContent("Current location");
    expect(route.querySelectorAll('[data-current="true"]')).toHaveLength(1);
  });

  it("marks origin as the current route node after a completed cancellation", () => {
    storeMock.use(
      snapshot({
        transfers: [
          {
            ...snapshot().transfers[0]!,
            status: "cancelled",
          },
        ],
      }),
      [],
    );
    render(<TransferDetailPage />);

    const route = screen.getByLabelText("Transfer route");
    const currentNode = route.querySelector('[data-current="true"]');
    expect(screen.getByText("Cancelled")).toBeTruthy();
    expect(currentNode).toHaveTextContent("Origin");
    expect(currentNode).toHaveTextContent("WH-7");
    expect(currentNode).toHaveAttribute("aria-current", "location");
    expect(currentNode).not.toHaveTextContent("Current location");
  });

  it("keeps the current projection when reservation posting fails", async () => {
    const user = userEvent.setup();
    apiMock.createAndPostReservation.mockRejectedValueOnce(new Error("Not enough stock"));
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    await user.click(screen.getByRole("button", { name: "Reserve in transit" }));
    await chooseOption(user, "Order", "OMS-901");
    await chooseOption(user, "Place", /TR-901/);
    await chooseOption(user, "Product 1", /Force 1100 EFI/);
    await user.click(screen.getByRole("button", { name: /^Reserve$/ }));

    expect(apiMock.createAndPostReservation).toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Reservation" })).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.getByRole("rowheader", { name: "Free" })).toBeTruthy();
    expect(screen.getAllByText("8").length).toBeGreaterThan(0);
  });

  it("blocks a second lifecycle submit while the first action is pending", async () => {
    const user = userEvent.setup();
    let finish: (() => void) | undefined;
    apiMock.completeTransfer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(undefined);
        }),
    );
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    await user.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(apiMock.completeTransfer).toHaveBeenCalledWith("tr-1");
    expect(screen.getByRole("button", { name: "Mark delivered" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Cancel transfer" })).toBeNull();
    expect(storeMock.reload).not.toHaveBeenCalled();
    finish?.();
    await waitFor(() => expect(storeMock.reload).toHaveBeenCalledTimes(1));
  });

  it("delivers and updates expected date with the transfer id then reloads", async () => {
    const user = userEvent.setup();
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    expect(screen.queryByRole("button", { name: "Cancel transfer" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Mark delivered" }));
    expect(apiMock.completeTransfer).toHaveBeenCalledWith("tr-1");
    await waitFor(() => expect(storeMock.reload).toHaveBeenCalledTimes(1));
    expect(apiMock.cancelDocument).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Expected"), { target: { value: "2026-09-12" } });
    expect(apiMock.updateExpectedEnd).toHaveBeenCalledWith("store_transfer", "tr-1", "2026-09-12");
    await waitFor(() => expect(storeMock.reload).toHaveBeenCalledTimes(2));
  });

  it("lists chronological activity links without a cancellation event", () => {
    storeMock.use(snapshot(), sentBalances);
    render(<TransferDetailPage />);

    const activity = screen.getByRole("heading", { name: "Document activity" }).closest("section");
    expect(activity).toBeTruthy();
    const titles = within(activity as HTMLElement)
      .getAllByRole("listitem")
      .map((item) => item.querySelector("p")?.textContent);
    expect(titles).toEqual(["Transfer sent", "Order reservation created"]);
    const transferLinks = within(activity as HTMLElement).getAllByRole("link", { name: "TR-901" });
    expect(transferLinks).toHaveLength(1);
    expect(transferLinks[0]).toHaveAttribute("href", "/store/logistics/transfers/tr-1");
    expect(within(activity as HTMLElement).getByRole("link", { name: "RSV-1" })).toHaveAttribute(
      "href",
      "/store/logistics/reservations/rsv-1",
    );
  });
});

describe("TransferDetailPage async states", () => {
  it("marks the shell busy and repeats the page frame while loading", () => {
    storeMock.use(emptySnapshot(), [], { isLoading: true });
    render(<TransferDetailPage />);
    expect(screen.getByText("Loading transfer…")).toBeTruthy();
    expect(screen.getByText("Loading transfer…").parentElement).toHaveAttribute("aria-busy", "true");
  });

  it("keeps the existing detail visible during refresh", () => {
    storeMock.use(snapshot(), sentBalances, { isLoading: true });
    render(<TransferDetailPage />);
    expect(screen.getByRole("heading", { level: 1, name: "TR-901" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Products and reservations" })).toBeTruthy();
    expect(screen.queryByText("Loading transfer…")).toBeNull();
  });

  it("shows the English load error and retry instead of stale success", async () => {
    const user = userEvent.setup();
    storeMock.use(emptySnapshot(), [], { error: "network" });
    render(<TransferDetailPage />);
    expect(screen.getByText("Transfer could not be loaded.")).toBeTruthy();
    expect(screen.queryByRole("heading", { level: 1, name: "TR-901" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(storeMock.reload).toHaveBeenCalledTimes(1);
  });

  it("shows not found with a link back to Transfers", () => {
    storeMock.use(snapshot({ transfers: [] }), []);
    render(<TransferDetailPage />);
    expect(screen.getByText("Transfer not found.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Transfers" })).toHaveAttribute(
      "href",
      "/store/logistics/transfers",
    );
  });

  it("shows empty copy for products and activity", () => {
    storeMock.use(
      snapshot({
        transferLines: [],
        transactions: [],
        reservations: [],
        reservationLines: [],
      }),
      [],
    );
    render(<TransferDetailPage />);
    expect(screen.getByText("No products in this transfer.")).toBeTruthy();
    expect(screen.getByText("No activity yet.")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Document activity" })).toBeTruthy();
  });
});
