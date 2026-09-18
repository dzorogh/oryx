import { describe, expect, it } from "vitest";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import {
  linkedManufacturersForProduct,
  locationHostLabel,
  locationIdentity,
  locationLabel,
  manufacturerCode,
  manufacturerIdsForProducts,
  manufacturerSelectItems,
  productsForManufacturer,
  warehouseCode,
  warehouseOwnerLabel,
} from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";

const snapshot = {
  products: [
    { id: "3", code: formatLogisticsCode("product", 3), sku: "CROSS-180-RX", name: "Cross 180 RX", unit: "pcs", manufacturerId: "4" },
    { id: "7", code: formatLogisticsCode("product", 7), sku: "FORCE-650", name: "Force 650", unit: "pcs", manufacturerId: "1" },
    { id: "99", code: formatLogisticsCode("product", 99), sku: "MANUAL", name: "Manual product", unit: "pcs", manufacturerId: null },
  ],
  manufacturers: [
    {
      id: "4",
      code: formatLogisticsCode("manufacturer", 4),
      name: "ZHEJIANG TAOTAO VEHICLES CO.,LTD",
      warehouseId: "6",
    },
    {
      id: "1",
      code: formatLogisticsCode("manufacturer", 1),
      name: "SHANDONG SHENGWO NEW ENERGY VEHICLE CO., LTD",
      warehouseId: "3",
    },
  ],
  warehouses: [
    { id: "6", code: formatLogisticsCode("warehouse", 6), name: "ZHEJIANG TAOTAO VEHICLES CO.,LTD", manufacturerId: "4" },
    { id: "2", code: formatLogisticsCode("warehouse", 2), name: "Dubai Hub", manufacturerId: null },
  ],
  customerOrders: [{ id: "12", number: formatLogisticsCode("customerOrder", 12), status: "open", createdAt: "", closedAt: null, expectedEndOn: null, description: "" }],
  productionOrders: [
    { id: "8", number: formatLogisticsCode("productionOrder", 8), manufacturerId: "4", status: "in_progress", createdAt: "", closedAt: null, expectedEndOn: null },
  ],
  productionOrderLines: [{ id: "9", orderId: "8", productId: "3", quantity: 44, activatedQuantity: 44 }],
  transfers: [
    {
      id: "5",
      number: formatLogisticsCode("transfer", 5),
      fromWarehouseId: "6",
      toWarehouseId: "2",
      status: "sent",
      createdAt: "",
      sentAt: "",
      cancelledAt: null,
      expectedEndOn: null,
    },
  ],
} as LogisticsSnapshot;

describe("manufacturer display", () => {
  it("keeps a single plant on the product itself instead of a junction", () => {
    expect(snapshot.products.find((item) => item.id === "3")?.manufacturerId).toBe("4");
    expect(snapshot.products.find((item) => item.id === "99")?.manufacturerId).toBeNull();
  });

  it("shows the plant code instead of the legal name", () => {
    expect(manufacturerCode(snapshot, "4")).toBe("PLT-4");
    expect(warehouseOwnerLabel(snapshot, "6")).toBe("PLT-4");
    expect(manufacturerSelectItems(snapshot)).toEqual([
      { value: "4", label: "PLT-4" },
      { value: "1", label: "PLT-1" },
    ]);
  });

  it("limits plants to those linked to the selected products", () => {
    expect(manufacturerIdsForProducts(snapshot, ["3"])).toEqual(["4"]);
    expect(manufacturerSelectItems(snapshot, ["3"])).toEqual([{ value: "4", label: "PLT-4" }]);
    expect(linkedManufacturersForProduct(snapshot, "3").map((item) => item.id)).toEqual(["4"]);
  });

  it("keeps every plant when the product has no plant links", () => {
    expect(manufacturerIdsForProducts(snapshot, ["99"])).toBeNull();
    expect(manufacturerSelectItems(snapshot, ["99"])).toHaveLength(2);
    expect(linkedManufacturersForProduct(snapshot, "99")).toEqual([]);
  });

  it("returns no shared plant when products are made at different factories", () => {
    expect(manufacturerIdsForProducts(snapshot, ["3", "7"])).toEqual([]);
    expect(manufacturerSelectItems(snapshot, ["3", "7"])).toEqual([]);
  });

  it("offers only products of the selected plant plus unlinked ones", () => {
    expect(productsForManufacturer(snapshot, "4").map((item) => item.id)).toEqual(["3", "99"]);
  });

  it("keeps company warehouses without a plant", () => {
    expect(warehouseOwnerLabel(snapshot, "2")).toBe("Общий / РЦ");
  });
});

describe("warehouse display", () => {
  it("shows the warehouse code instead of the name", () => {
    expect(warehouseCode(snapshot, "6")).toBe("WH-6");
    expect(warehouseCode(snapshot, "2")).toBe("WH-2");
    expect(locationLabel(snapshot, "warehouse", "6")).toBe("WH-6");
    expect(locationLabel(snapshot, "warehouse", "2")).toBe("WH-2");
  });
});

describe("locationIdentity", () => {
  it("types a production line as a document plus plant, not a bare place code", () => {
    expect(locationIdentity(snapshot, "production_order_line", "9")).toEqual({
      title: "PO-8",
      hint: "PLT-4",
      manufacturerId: "4",
      isPlantWarehouse: false,
    });
  });

  it("shows the plant next to a plant warehouse when the codes differ", () => {
    expect(locationIdentity(snapshot, "warehouse", "6")).toMatchObject({
      title: "WH-6",
      hint: "PLT-4",
      isPlantWarehouse: true,
    });
    expect(locationIdentity(snapshot, "warehouse", "2")).toMatchObject({
      title: "WH-2",
      hint: null,
      isPlantWarehouse: false,
    });
  });

  it("shows the transfer route next to the transfer number", () => {
    expect(locationIdentity(snapshot, "transfer", "5")).toEqual({
      title: "TR-5",
      hint: "WH-6 → WH-2",
      manufacturerId: null,
      isPlantWarehouse: false,
    });
  });
});

describe("locationHostLabel", () => {
  it("names the host entity kind plus its code", () => {
    expect(locationHostLabel(snapshot, "warehouse", "2")).toBe("Warehouse WH-2");
    expect(locationHostLabel(snapshot, "warehouse", "6")).toBe("Plant warehouse WH-6");
    expect(locationHostLabel(snapshot, "production_order_line", "9")).toBe("Production order PO-8");
    expect(locationHostLabel(snapshot, "transfer", "5")).toBe("Transfer TR-5");
    expect(locationHostLabel(snapshot, "customer_order", "12")).toBe("Customer order OMS-12");
  });
});
