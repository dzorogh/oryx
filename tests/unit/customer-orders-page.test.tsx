import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerOrdersPage } from "@/features/logistics/customer-orders-page";
import { mergeLogisticsCodePrefixes } from "@/features/logistics/logistics-codes";
import type { CustomerOrder, LogisticsSnapshot } from "@/features/logistics/logistics-types";

const emptySnapshot = (): LogisticsSnapshot => ({
  products: [],
  manufacturers: [],
  warehouses: [],
  regions: [],
  settings: { id: "1", codePrefixes: mergeLogisticsCodePrefixes() },
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
  returns: [],
  returnLines: [],
  transactions: [],
  users: [],
  documentHistory: [],
});

const storeMock = vi.hoisted(() => {
  let snapshot: LogisticsSnapshot | null = null;

  return {
    use: (next: LogisticsSnapshot) => {
      snapshot = next;
    },
    reset: () => {
      snapshot = null;
    },
    current: () => ({
      snapshot: snapshot as LogisticsSnapshot,
      balances: [],
      isLoading: false,
      error: null,
      reload: vi.fn(),
      configured: true,
    }),
  };
});

vi.mock("@/features/logistics/use-logistics-store", () => ({
  useLogisticsStore: () => storeMock.current(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ orderId: "" }),
}));

afterEach(() => {
  storeMock.reset();
  cleanup();
});

const order = (
  id: string,
  createdAt: string,
  status: CustomerOrder["status"] = "open",
): CustomerOrder => ({
  id,
  number: `OMS-${id}`,
  status,
  createdAt,
  createdBy: "1",
  expectedEndOn: null,
  description: "",
});

const orderCodes = () => {
  const table = screen.getByRole("table");
  return within(table)
    .getAllByRole("link")
    .map((link) => link.textContent ?? "")
    .filter((text) => text.startsWith("OMS-"));
};

describe("CustomerOrdersPage newest-first list", () => {
  const mixedOrders = [
    order("70", "2026-09-17T07:55:55+00:00", "closed"),
    order("903", "2026-09-05T10:15:00+00:00"),
    order("1", "2025-11-14T15:45:26+00:00", "closed"),
    order("906", "2026-09-18T16:00:00+00:00"),
    order("999", "2026-01-01T00:00:00+00:00"),
  ];

  it("renders OMS-906 first even though snapshot rows arrive in id order", () => {
    storeMock.use({ ...emptySnapshot(), customerOrders: mixedOrders });
    render(<CustomerOrdersPage />);
    expect(orderCodes()).toEqual(["OMS-906", "OMS-70", "OMS-903", "OMS-999", "OMS-1"]);
  });

  it("keeps newest-first order after the Open status chip", async () => {
    const user = userEvent.setup();
    storeMock.use({ ...emptySnapshot(), customerOrders: mixedOrders });
    render(<CustomerOrdersPage />);
    await user.click(screen.getByRole("tab", { name: "Открыт" }));
    expect(orderCodes()).toEqual(["OMS-906", "OMS-903", "OMS-999"]);
  });

  it("keeps newest-first order after the Closed status chip", async () => {
    const user = userEvent.setup();
    storeMock.use({ ...emptySnapshot(), customerOrders: mixedOrders });
    render(<CustomerOrdersPage />);
    await user.click(screen.getByRole("tab", { name: "Закрыт" }));
    expect(orderCodes()).toEqual(["OMS-70", "OMS-1"]);
  });

  it("shows the empty table copy when there are no orders", () => {
    storeMock.use(emptySnapshot());
    render(<CustomerOrdersPage />);
    expect(screen.getByText("No records yet.")).toBeVisible();
  });
});
