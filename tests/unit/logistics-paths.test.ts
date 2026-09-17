import { describe, expect, it } from "vitest";
import {
  hrefForStoreProduct,
  LOGISTICS_PATHS,
  redirectLegacyLogisticsPath,
} from "@/features/logistics/logistics-paths";
import { hrefForProduct, hrefForCustomerOrder } from "@/features/logistics/logistics-availability";
import { inferCatalogCategory, mapLogisticsProductToCatalogItem } from "@/features/store/store-catalog-from-logistics";

describe("logistics paths", () => {
  it("hosts logistics under Store and products in the PIM catalog", () => {
    expect(LOGISTICS_PATHS.stock).toBe("/store/logistics/stock");
    expect(LOGISTICS_PATHS.products).toBe("/store/pim/products");
    expect(hrefForStoreProduct("17")).toBe("/store/pim/products/17");
    expect(hrefForProduct("17")).toBe("/store/pim/products/17");
    expect(hrefForCustomerOrder("3")).toBe("/store/logistics/customer-orders/3");
  });

  it("redirects legacy /logistics URLs", () => {
    expect(redirectLegacyLogisticsPath(undefined)).toBe("/store/logistics/stock");
    expect(redirectLegacyLogisticsPath([])).toBe("/store/logistics/stock");
    expect(redirectLegacyLogisticsPath(["stock"])).toBe("/store/logistics/stock");
    expect(redirectLegacyLogisticsPath(["products"])).toBe("/store/pim/products");
    expect(redirectLegacyLogisticsPath(["products", "17"])).toBe("/store/pim/products/17");
    expect(redirectLegacyLogisticsPath(["customer-orders", "3"])).toBe("/store/logistics/customer-orders/3");
  });
});

describe("shared store catalog mapping", () => {
  it("maps a logistics product onto the Store catalog item shape", () => {
    const inferred = inferCatalogCategory("FORCE-1100-EFI", "Force 1100 EFI");
    expect(inferred.categoryId).toBe("atv-4x4");

    const item = mapLogisticsProductToCatalogItem(
      {
        id: 1,
        sku: "FORCE-1100-EFI",
        name: "Force 1100 EFI",
        dealer_price: 11990,
        retail_price: 13990,
      },
      "SH-4",
    );

    expect(item.id).toBe("1");
    expect(item.code).toBe("PRD-1");
    expect(item.sku).toBe("FORCE-1100-EFI");
    expect(item.dealerPrice).toBe(11990);
    expect(item.retailPrice).toBe(13990);
    expect(item.productionSite).toBe("SH-4");
    expect(item.imageSrc).toBe("");
  });

  it("uses the Korportal product photo when image_url is present", () => {
    const imageUrl = "https://my.globaldrive.ru/s3/media/2026/09/01/03/223416/Force-1100-(6).png";
    const mediumUrl =
      "https://my.globaldrive.ru/s3/media/2026/09/01/03/223416/conversions/Force-1100-(6)-medium.webp";
    const item = mapLogisticsProductToCatalogItem(
      {
        id: 1,
        sku: "FORCE-1100-EFI",
        name: "Force 1100 EFI",
        image_url: imageUrl,
        dealer_price: 39950,
        retail_price: 42990,
      },
      "SH-4",
    );

    expect(item.code).toBe("PRD-1");
    expect(item.imageSrc).toBe(mediumUrl);
    expect(item.dealerPrice).toBe(39950);
    expect(item.retailPrice).toBe(42990);
  });
});
