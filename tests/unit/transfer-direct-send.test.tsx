import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import { TRANSFER_STATUS_LABELS } from "@/features/logistics/logistics-labels";
import { TRANSFER_STATUSES, type LogisticsSnapshot, type StockBalance } from "@/features/logistics/logistics-types";
import { TransferReservedForm } from "@/features/logistics/order-action-forms";
import { TransferDetailPage, TransfersPage } from "@/features/logistics/transfers-page";
import {
  freeTransferPayload,
  openSentTransfer,
  orderOwnedTransferPayload,
  transferCreateRpcArgs,
} from "@/features/logistics/transfer-direct-send";

const read = (relative: string) => readFileSync(resolve(process.cwd(), relative), "utf8");

const supabaseMock = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
}));

const paramsMock = vi.hoisted(() => ({
  id: "tr-1",
}));

const storeMock = vi.hoisted(() => {
  let snapshot: LogisticsSnapshot | null = null;
  let balances: StockBalance[] = [];
  return {
    use: (next: LogisticsSnapshot, nextBalances: StockBalance[] = []) => {
      snapshot = next;
      balances = nextBalances;
    },
    reset: () => {
      snapshot = null;
      balances = [];
    },
    current: () => ({
      snapshot: snapshot as LogisticsSnapshot,
      balances,
      isLoading: false,
      error: null,
      reload: vi.fn(async () => undefined),
      configured: true,
    }),
  };
});

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ rpc: supabaseMock.rpc }),
  isSupabaseConfigured: () => true,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useParams: () => paramsMock,
}));

vi.mock("@/features/logistics/use-logistics-store", () => ({
  useLogisticsStore: () => storeMock.current(),
}));

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
    ],
    manufacturers: [{ id: "6", code: "PLT-6", name: "Shineray", warehouseId: "7" }],
    warehouses: [
      { id: "7", code: "WH-7", name: "Plant", manufacturerId: "6" },
      { id: "11", code: "WH-11", name: "Hub", manufacturerId: null },
    ],
    regions: [],
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
        number: "TR-1",
        fromWarehouseId: "7",
        toWarehouseId: "11",
        status: "sent",
        createdAt: "",
        sentAt: "2026-09-20T10:00:00Z",
        cancelledAt: null,
        expectedEndOn: "2026-09-22",
      },
    ],
    transferLines: [{ id: "trl-1", transferId: "tr-1", productId: "22", quantity: 2 }],
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

const freeBalances: StockBalance[] = [
  {
    productId: "22",
    locationType: "warehouse",
    locationId: "7",
    stockState: "free",
    ownerType: null,
    ownerId: null,
    quantity: 8,
  },
];

const reservedBalances: StockBalance[] = [
  {
    productId: "22",
    locationType: "warehouse",
    locationId: "7",
    stockState: "reserved",
    ownerType: "order",
    ownerId: "901",
    quantity: 4,
  },
];

const chooseOption = async (
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string | RegExp,
) => {
  await user.click(screen.getByRole("combobox", { name: label }));
  await user.click(await screen.findByRole("option", { name: option }));
};

afterEach(() => {
  storeMock.reset();
  cleanup();
  supabaseMock.rpc.mockReset();
  routerMock.push.mockReset();
});

describe("transfer status contract", () => {
  it("keeps Draft out of the public transfer vocabulary", () => {
    expect(TRANSFER_STATUSES).toEqual(["sent", "delivered", "cancelled"]);
    expect(TRANSFER_STATUSES).not.toContain("draft");
    expect(TRANSFER_STATUS_LABELS).not.toHaveProperty("draft");
    expect(Object.keys(TRANSFER_STATUS_LABELS)).toEqual(["sent", "delivered", "cancelled"]);
  });
});

describe("transfer payload adapters", () => {
  it("builds a free-only generic payload", () => {
    const payload = freeTransferPayload({
      requestKey: "req-free",
      fromWarehouseId: "7",
      toWarehouseId: "11",
      expectedEndOn: "2026-09-22",
      lines: [
        { productId: "22", quantity: 3 },
        { productId: "1", quantity: 1 },
      ],
    });

    expect(payload.lines.every((line) => line.ownerType == null && line.ownerId == null)).toBe(true);
    expect(transferCreateRpcArgs(payload)).toEqual({
      p_request_key: "req-free",
      p_from_warehouse_id: 7,
      p_to_warehouse_id: 11,
      p_expected_end_on: "2026-09-22",
      p_id: null,
      p_created_at: null,
      p_lines: [
        { product_id: 22, quantity: 3, owner_type: null, owner_id: null },
        { product_id: 1, quantity: 1, owner_type: null, owner_id: null },
      ],
    });
  });

  it("keeps the order owner on the reserved payload", () => {
    const payload = orderOwnedTransferPayload({
      requestKey: "req-order",
      fromWarehouseId: "7",
      toWarehouseId: "11",
      customerOrderId: "901",
      lines: [{ productId: "22", quantity: 4 }],
    });

    expect(payload.lines).toEqual([
      { productId: "22", quantity: 4, ownerType: "order", ownerId: "901" },
    ]);
    expect(transferCreateRpcArgs(payload).p_lines).toEqual([
      { product_id: 22, quantity: 4, owner_type: "order", owner_id: 901 },
    ]);
  });
});

describe("createAndSendTransfer client", () => {
  it("returns the sent id from one RPC and reuses the same request key on retry", async () => {
    const { createAndSendTransfer } = await import("@/features/logistics/logistics-api");
    const payload = freeTransferPayload({
      requestKey: "req-retry",
      fromWarehouseId: "7",
      toWarehouseId: "11",
      lines: [{ productId: "22", quantity: 2 }],
    });
    supabaseMock.rpc.mockResolvedValue({ data: { id: 17, status: "sent" }, error: null });

    await expect(createAndSendTransfer(payload)).resolves.toEqual({ id: "17", status: "sent" });
    await expect(createAndSendTransfer(payload)).resolves.toEqual({ id: "17", status: "sent" });

    expect(supabaseMock.rpc).toHaveBeenCalledTimes(2);
    expect(supabaseMock.rpc.mock.calls[0]?.[0]).toBe("store_create_and_send_transfer");
    expect(supabaseMock.rpc.mock.calls[0]?.[1]).toEqual(transferCreateRpcArgs(payload));
    expect(supabaseMock.rpc.mock.calls[1]?.[1]).toEqual(supabaseMock.rpc.mock.calls[0]?.[1]);
  });

  it("does not invent a document when stock is stale", async () => {
    const { createAndSendTransfer } = await import("@/features/logistics/logistics-api");
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: "Not enough stock for free 22" },
    });

    await expect(
      createAndSendTransfer(
        freeTransferPayload({
          requestKey: "req-stale",
          fromWarehouseId: "7",
          toWarehouseId: "11",
          lines: [{ productId: "22", quantity: 99 }],
        }),
      ),
    ).rejects.toThrow("Not enough stock for free 22");
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid order owner or quantity without inventing a document", async () => {
    const { createAndSendTransfer } = await import("@/features/logistics/logistics-api");
    supabaseMock.rpc.mockResolvedValue({
      data: null,
      error: { message: "Unknown owner" },
    });

    await expect(
      createAndSendTransfer(
        orderOwnedTransferPayload({
          requestKey: "req-bad-owner",
          fromWarehouseId: "7",
          toWarehouseId: "11",
          customerOrderId: "999999",
          lines: [{ productId: "22", quantity: 99 }],
        }),
      ),
    ).rejects.toThrow("Unknown owner");
    expect(supabaseMock.rpc).toHaveBeenCalledTimes(1);
    expect(supabaseMock.rpc.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        p_lines: [{ product_id: 22, quantity: 99, owner_type: "order", owner_id: 999999 }],
      }),
    );
  });
});

describe("sent transfer navigation", () => {
  it("opens the sent detail path", () => {
    const navigate = vi.fn();
    openSentTransfer({ id: "42", status: "sent" }, navigate);
    expect(navigate).toHaveBeenCalledWith("/store/logistics/transfers/42");
  });
});

describe("TransfersPage", () => {
  it("has no Draft filter and sends free stock to the sent detail", async () => {
    const user = userEvent.setup();
    storeMock.use(snapshot(), freeBalances);
    supabaseMock.rpc.mockResolvedValue({ data: { id: 42, status: "sent" }, error: null });

    render(<TransfersPage />);

    expect(screen.queryByRole("tab", { name: "Черновик" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Draft" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Отправлено" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "New transfer" }));
    expect(screen.getByRole("heading", { name: "Create transfer" })).toBeTruthy();
    expect(screen.getAllByText("On hand").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Available").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Move").length).toBeGreaterThan(0);
    expect(screen.getByText(/Free stock only/)).toBeTruthy();
    await chooseOption(user, "From warehouse", /WH-7/);
    expect(screen.getByRole("combobox", { name: "From warehouse" })).toHaveTextContent("WH-7");
    expect(screen.getByRole("combobox", { name: "From warehouse" })).not.toHaveTextContent("Plant");
    await chooseOption(user, "To warehouse", /WH-11/);
    await chooseOption(user, "Product", /Enduro 250/);
    await user.click(screen.getByRole("button", { name: "Create and send transfer" }));

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "store_create_and_send_transfer",
      expect.objectContaining({
        p_from_warehouse_id: 7,
        p_to_warehouse_id: 11,
        p_lines: [{ product_id: 22, quantity: 1, owner_type: null, owner_id: null }],
      }),
    );
    expect(routerMock.push).toHaveBeenCalledWith("/store/logistics/transfers/42");
  });

  it("keeps the dialog input after a stale-stock error and retries with the same key", async () => {
    const user = userEvent.setup();
    storeMock.use(snapshot(), freeBalances);
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: null, error: { message: "Not enough stock for free 22" } })
      .mockResolvedValueOnce({ data: { id: 42, status: "sent" }, error: null });

    render(<TransfersPage />);
    await user.click(screen.getByRole("button", { name: "New transfer" }));
    await chooseOption(user, "From warehouse", /WH-7/);
    await chooseOption(user, "To warehouse", /WH-11/);
    await chooseOption(user, "Product", /Enduro 250/);
    await user.click(screen.getByRole("button", { name: "Create and send transfer" }));

    expect(screen.getByRole("heading", { name: "Create transfer" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "From warehouse" })).toHaveTextContent("WH-7");
    expect(routerMock.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create and send transfer" }));
    expect(supabaseMock.rpc.mock.calls[0]?.[1].p_request_key).toBe(
      supabaseMock.rpc.mock.calls[1]?.[1].p_request_key,
    );
    expect(routerMock.push).toHaveBeenCalledWith("/store/logistics/transfers/42");
  });

  it("blocks send when Move exceeds available and shows the surplus inline", async () => {
    const user = userEvent.setup();
    storeMock.use(snapshot(), freeBalances);

    render(<TransfersPage />);
    await user.click(screen.getByRole("button", { name: "New transfer" }));
    await chooseOption(user, "From warehouse", /WH-7/);
    await chooseOption(user, "To warehouse", /WH-11/);
    await chooseOption(user, "Product", /Enduro 250/);

    const move = screen.getByRole("spinbutton", { name: "Move Enduro 250" });
    await user.clear(move);
    await user.type(move, "99");

    expect(screen.getByText(/over available/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create and send transfer" })).toBeDisabled();
    expect(supabaseMock.rpc).not.toHaveBeenCalled();
  });
});

describe("TransferDetailPage", () => {
  it("makes sent lines read-only and hides Draft actions", () => {
    storeMock.use(snapshot(), freeBalances);
    paramsMock.id = "tr-1";
    render(<TransferDetailPage />);

    expect(screen.getByRole("heading", { name: "TR-1" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Отправить" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Send" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Добавить товар" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Изменить" })).toBeNull();
    expect(screen.getByRole("button", { name: "Mark delivered" })).toBeTruthy();
  });
});

describe("TransferReservedForm", () => {
  it("sends order-owned stock and opens the sent detail", async () => {
    const user = userEvent.setup();
    const data = snapshot();
    storeMock.use(data, reservedBalances);
    supabaseMock.rpc.mockResolvedValue({ data: { id: 88, status: "sent" }, error: null });

    render(
      <TransferReservedForm
        snapshot={data}
        balances={reservedBalances}
        open
        onOpenChange={() => undefined}
        reload={async () => undefined}
        customerOrderId="901"
        lines={data.customerOrderLines}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create transfer" })).toBeTruthy();
    expect(screen.getByText(/Customer order OMS-901/)).toBeTruthy();
    await chooseOption(user, "From warehouse", /WH-7/);
    await chooseOption(user, "To warehouse", /WH-11|Hub/);
    await chooseOption(user, "Product", /Enduro 250/);
    await user.click(screen.getByRole("button", { name: "Create and send for OMS-901" }));

    expect(supabaseMock.rpc).toHaveBeenCalledWith(
      "store_create_and_send_transfer",
      expect.objectContaining({
        p_from_warehouse_id: 7,
        p_to_warehouse_id: 11,
        p_lines: [{ product_id: 22, quantity: 4, owner_type: "order", owner_id: 901 }],
      }),
    );
    expect(routerMock.push).toHaveBeenCalledWith("/store/logistics/transfers/88");
  });

  it("keeps the dialog input after a stale-stock error and retries with the same key", async () => {
    const user = userEvent.setup();
    const data = snapshot();
    storeMock.use(data, reservedBalances);
    supabaseMock.rpc
      .mockResolvedValueOnce({ data: null, error: { message: "Not enough stock for reserved 22" } })
      .mockResolvedValueOnce({ data: { id: 88, status: "sent" }, error: null });

    render(
      <TransferReservedForm
        snapshot={data}
        balances={reservedBalances}
        open
        onOpenChange={() => undefined}
        reload={async () => undefined}
        customerOrderId="901"
        lines={data.customerOrderLines}
      />,
    );

    await chooseOption(user, "From warehouse", /WH-7/);
    await chooseOption(user, "To warehouse", /WH-11|Hub/);
    await chooseOption(user, "Product", /Enduro 250/);
    await user.click(screen.getByRole("button", { name: "Create and send for OMS-901" }));

    expect(screen.getByRole("heading", { name: "Create transfer" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "From warehouse" })).toHaveTextContent("WH-7");
    expect(routerMock.push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create and send for OMS-901" }));
    expect(supabaseMock.rpc.mock.calls[0]?.[1].p_request_key).toBe(
      supabaseMock.rpc.mock.calls[1]?.[1].p_request_key,
    );
    expect(routerMock.push).toHaveBeenCalledWith("/store/logistics/transfers/88");
  });
});

describe("direct-send migration and seed", () => {
  it("backfills Draft through store_send_transfer and never writes status directly", () => {
    const sql = read("supabase/migrations/20260920122000_store_transfer_direct_send.sql");
    expect(sql).toContain("store_create_and_send_transfer");
    expect(sql).toContain("store_send_transfer(v_id)");
    expect(sql).toContain("from public.store_transfer_request");
    expect(sql).toContain("insert into public.store_transfer_request");
    expect(sql).toContain("perform public.store_send_transfer(v_doc.id)");
    expect(sql).toContain("where status = 'draft'");
    expect(sql).toContain("order by id");
    expect(sql).not.toMatch(/update\s+public\.store_transfer\s+set\s+status\s*=\s*'sent'/i);
    expect(sql).toContain("store_transfer_line_product_uidx");
    expect(sql).toContain("delete from public.store_transfer_request");
    expect(sql.indexOf("delete from public.store_transfer_request")).toBeLessThan(
      sql.search(/delete from public.store_transfer\s+where/),
    );
  });

  it("seeds story transfers through the create-and-send RPC", () => {
    const stories = read("scripts/lib/seed-logistics-stories.mjs");
    expect(stories).toContain("store_create_and_send_transfer");
    expect(stories).toContain("store_complete_transfer");
    expect(stories).not.toMatch(/insert\("store_transfer"/);
    expect(stories).not.toMatch(/insert\("store_transfer_line"/);
  });
});
