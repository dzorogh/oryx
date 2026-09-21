import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultStockViewFilter,
  filterRowsByProductQuery,
  filterSectionsByProductQuery,
} from "@/features/logistics/stock-filters";
import { StockFiltersPanel } from "@/features/logistics/ui/stock-filters-panel";
import { StockProductsMatrix } from "@/features/logistics/ui/stock-products-matrix";
import { EMPTY_SNAPSHOT } from "@/features/logistics/use-logistics-store";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";

afterEach(() => {
  cleanup();
});

const snapshot: LogisticsSnapshot = {
  ...EMPTY_SNAPSHOT,
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
  warehouses: [
    { id: "wh-2", code: "WH-2", name: "Plant warehouse", manufacturerId: null },
    { id: "wh-3", code: "WH-3", name: "City warehouse", manufacturerId: null },
  ],
  regions: [{ id: "1", code: "REG-1", name: "Nordics" }],
};

const chairProductRow = {
  productId: "p-chair",
  owner: { free: 10, regionReserve: 4, orderReserve: 9 },
  location: { warehouses: 20, production: 0, transfers: 3 },
};

const deskProductRow = {
  productId: "p-desk",
  owner: { free: 2, regionReserve: 0, orderReserve: 0 },
  location: { warehouses: 2, production: 0, transfers: 0 },
};

const chairWarehouseSection = {
  warehouseId: "wh-2",
  rows: [
    {
      warehouseId: "wh-2",
      productId: "p-chair",
      free: 1,
      regionReserve: 2,
      orderReserve: 3,
      onHand: 6,
    },
  ],
};

const deskWarehouseSection = {
  warehouseId: "wh-3",
  rows: [
    {
      warehouseId: "wh-3",
      productId: "p-desk",
      free: 2,
      regionReserve: 0,
      orderReserve: 0,
      onHand: 2,
    },
  ],
};

const chooseOption = async (user: ReturnType<typeof userEvent.setup>, name: string, option: string) => {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
};

const headerTexts = () => screen.getAllByRole("columnheader").map((header) => header.textContent ?? "");

const forbiddenHeaders = ["SKU", "Unit", "Plant", "Shipped", "Customer"];

const renderFilters = (group: "products" | "warehouses" | "regions") =>
  render(
    <StockFiltersPanel
      snapshot={snapshot}
      group={group}
      filters={defaultStockViewFilter(group)}
      onChange={() => undefined}
    />,
  );

describe("stock products matrix", () => {
  it("renders Products owner and location headers, 0 with unit, and no forbidden columns", () => {
    render(
      <StockProductsMatrix
        snapshot={snapshot}
        group="products"
        productRows={[
          {
            productId: "p-chair",
            owner: { free: 10, regionReserve: 4, orderReserve: 9 },
            location: { warehouses: 20, production: 0, transfers: 3 },
          },
        ]}
        warehouseSections={[]}
        regionSections={[]}
        empty="No on-hand stock yet."
      />,
    );

    expect(headerTexts()).toEqual([
      "Product",
      "Owner",
      "Location",
      "Free",
      "Region reserve",
      "Order reserve",
      "Warehouses",
      "Production",
      "Transfers",
    ]);
    for (const header of forbiddenHeaders) {
      expect(headerTexts()).not.toContain(header);
    }
    expect(screen.getByText("0 pcs")).toBeInTheDocument();
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("renders warehouse and region section labels for grouped rows", () => {
    const { rerender } = render(
      <StockProductsMatrix
        snapshot={snapshot}
        group="warehouses"
        productRows={[]}
        warehouseSections={[
          {
            warehouseId: "wh-2",
            rows: [
              {
                warehouseId: "wh-2",
                productId: "p-chair",
                free: 1,
                regionReserve: 2,
                orderReserve: 3,
                onHand: 6,
              },
            ],
          },
        ]}
        regionSections={[]}
        empty="No on-hand stock yet."
      />,
    );

    expect(screen.getByText("WH-2")).toBeInTheDocument();
    expect(screen.queryByText("Plant warehouse")).not.toBeInTheDocument();
    expect(headerTexts()).toEqual(["Product", "Free", "Region reserve", "Order reserve", "On hand"]);

    rerender(
      <StockProductsMatrix
        snapshot={snapshot}
        group="regions"
        productRows={[]}
        warehouseSections={[]}
        regionSections={[
          {
            regionId: "1",
            rows: [
              {
                regionId: "1",
                productId: "p-chair",
                warehouses: 3,
                production: 0,
                transfers: 5,
                regionReserve: 8,
              },
            ],
          },
        ]}
        empty="No on-hand stock yet."
      />,
    );

    expect(screen.getByText("REG-1 · Nordics")).toBeInTheDocument();
    expect(headerTexts()).toEqual(["Product", "Warehouses", "Production", "Transfers", "Region reserve"]);
    expect(screen.getByText("0 pcs")).toBeInTheDocument();
  });

  it("shows empty copy when there is no on-hand", () => {
    render(
      <StockProductsMatrix
        snapshot={snapshot}
        group="products"
        productRows={[]}
        warehouseSections={[]}
        regionSections={[]}
        empty="No on-hand stock yet."
      />,
    );

    expect(screen.getByText("No on-hand stock yet.")).toBeInTheDocument();
  });

  it("hides nonmatching product rows and empty sections for a search query", () => {
    const productRows = filterRowsByProductQuery([chairProductRow, deskProductRow], snapshot, "desk");
    const warehouseSections = filterSectionsByProductQuery(
      [chairWarehouseSection, deskWarehouseSection],
      snapshot,
      "desk",
    );

    const { rerender } = render(
      <StockProductsMatrix
        snapshot={snapshot}
        group="products"
        productRows={productRows}
        warehouseSections={warehouseSections}
        regionSections={[]}
        empty="No on-hand stock matches the selected filters."
      />,
    );

    expect(screen.getByText("Oak Desk")).toBeInTheDocument();
    expect(screen.queryByText("Nordic Chair")).not.toBeInTheDocument();

    rerender(
      <StockProductsMatrix
        snapshot={snapshot}
        group="warehouses"
        productRows={productRows}
        warehouseSections={warehouseSections}
        regionSections={[]}
        empty="No on-hand stock matches the selected filters."
      />,
    );

    expect(screen.getByText("Oak Desk")).toBeInTheDocument();
    expect(screen.getByText("WH-3")).toBeInTheDocument();
    expect(screen.queryByText("City warehouse")).not.toBeInTheDocument();
    expect(screen.queryByText("Nordic Chair")).not.toBeInTheDocument();
    expect(screen.queryByText("WH-2")).not.toBeInTheDocument();
    expect(screen.queryByText("Plant warehouse")).not.toBeInTheDocument();
  });
});

describe("stock filters panel", () => {
  it("shows context filters for each grouping", () => {
    const { rerender } = renderFilters("products");

    expect(screen.getByRole("combobox", { name: "Закреплено за" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Место" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Регион" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Склад" })).not.toBeInTheDocument();

    rerender(
      <StockFiltersPanel
        snapshot={snapshot}
        group="warehouses"
        filters={defaultStockViewFilter("warehouses")}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Склад" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Закреплено за" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Регион" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Место" })).not.toBeInTheDocument();

    rerender(
      <StockFiltersPanel
        snapshot={snapshot}
        group="regions"
        filters={defaultStockViewFilter("regions")}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("combobox", { name: "Регион" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Место" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Склад" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Закреплено за" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
  });

  it("emits exact patches when selecting then clearing warehouse, region, owner and location", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <StockFiltersPanel
        snapshot={snapshot}
        group="products"
        filters={defaultStockViewFilter("products")}
        onChange={onChange}
      />,
    );

    await chooseOption(user, "Закреплено за", "Свободно");
    await chooseOption(user, "Закреплено за", "Все");
    await chooseOption(user, "Место", "Склады");
    await chooseOption(user, "Место", "Все места");
    await chooseOption(user, "Регион", "REG-1 · Nordics");
    await chooseOption(user, "Регион", "Все регионы");

    rerender(
      <StockFiltersPanel
        snapshot={snapshot}
        group="warehouses"
        filters={defaultStockViewFilter("warehouses")}
        onChange={onChange}
      />,
    );

    await chooseOption(user, "Склад", "WH-2");
    await chooseOption(user, "Склад", "Все склады");

    expect(onChange.mock.calls.map((call) => call[0])).toEqual([
      { owner: "free" },
      { owner: "all" },
      { location: "warehouse" },
      { location: "all" },
      { regionId: "1" },
      { regionId: null },
      { warehouseId: "wh-2" },
      { warehouseId: null },
    ]);
  });
});
