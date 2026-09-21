import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StockPage } from "@/features/logistics/stock-page";
import type { LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";

const navigationMock = vi.hoisted(() => {
  let searchParams = new URLSearchParams();

  return {
    getSearchParams: () => searchParams,
    replace: (href: string) => {
      searchParams = new URL(href, "http://localhost").searchParams;
    },
    reset: (query = "") => {
      searchParams = new URLSearchParams(query);
    },
  };
});

const storeMock = vi.hoisted(() => {
  const snapshot: LogisticsSnapshot = {
    products: [
      {
        id: "p-chair",
        code: "PRD-1",
        sku: "CHR-01",
        name: "Nordic Chair",
        unit: "pcs",
        manufacturerId: null,
      },
      {
        id: "p-desk",
        code: "PRD-2",
        sku: "DSK-01",
        name: "Oak Desk",
        unit: "pcs",
        manufacturerId: null,
      },
    ],
    manufacturers: [],
    warehouses: [
      { id: "wh-2", code: "WH-2", name: "Plant warehouse", manufacturerId: null },
      { id: "wh-3", code: "WH-3", name: "City warehouse", manufacturerId: null },
    ],
    regions: [],
    settings: { id: "1", codePrefixes: {} as LogisticsSnapshot["settings"]["codePrefixes"] },
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
  };

  const balances: StockBalance[] = [
    {
      productId: "p-chair",
      locationType: "warehouse",
      locationId: "wh-2",
      stockState: "free",
      ownerType: null,
      ownerId: null,
      quantity: 6,
    },
    {
      productId: "p-desk",
      locationType: "warehouse",
      locationId: "wh-3",
      stockState: "free",
      ownerType: null,
      ownerId: null,
      quantity: 2,
    },
  ];

  return {
    isLoading: false,
    error: null as string | null,
    current: () => ({
      snapshot,
      balances,
      isLoading: storeMock.isLoading,
      error: storeMock.error,
      reload: vi.fn(),
      configured: true,
    }),
  };
});

vi.mock("@/features/logistics/use-logistics-store", () => ({
  useLogisticsStore: () => storeMock.current(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMock.getSearchParams(),
  useRouter: () => ({
    replace: navigationMock.replace,
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  storeMock.isLoading = false;
  storeMock.error = null;
  navigationMock.reset();
});

afterEach(() => {
  cleanup();
});

describe("stock page", () => {
  it("hides nonmatching product rows and empty warehouse sections for a search query", () => {
    navigationMock.reset("group=warehouses&q=desk");
    render(<StockPage />);

    expect(screen.getByText("Oak Desk")).toBeInTheDocument();
    expect(screen.getByText("WH-3")).toBeInTheDocument();
    expect(screen.queryByText("City warehouse")).not.toBeInTheDocument();
    expect(screen.queryByText("Nordic Chair")).not.toBeInTheDocument();
    expect(screen.queryByText("Plant warehouse")).not.toBeInTheDocument();
  });

  it("disables Filters until stock data is available", () => {
    storeMock.isLoading = true;
    render(<StockPage />);

    expect(screen.getByRole("button", { name: "Открыть фильтры остатков" })).toBeDisabled();
  });

  it("opens filters in a drawer instead of an inline panel", async () => {
    const user = userEvent.setup();
    render(<StockPage />);

    await user.click(screen.getByRole("button", { name: "Открыть фильтры остатков" }));

    const drawer = await screen.findByRole("dialog", { name: "Фильтры" });
    expect(drawer).toBeInTheDocument();
    expect(drawer).toHaveTextContent("Закреплено за");
    expect(drawer).toHaveTextContent("Место");
    expect(drawer).toHaveTextContent("Регион");
    expect(screen.queryByRole("complementary", { name: "Фильтры остатков" })).not.toBeInTheDocument();
  });

  it("ignores unknown warehouse and region URL ids so the matrix stays populated", () => {
    navigationMock.reset("warehouse=ghost&region=missing");
    render(<StockPage />);

    expect(screen.getByText("Nordic Chair")).toBeInTheDocument();
    expect(screen.getByText("Oak Desk")).toBeInTheDocument();
  });
});
