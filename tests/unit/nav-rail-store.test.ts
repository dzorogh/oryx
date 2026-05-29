import { describe, expect, it } from "vitest";
import { RAIL_PRIMARY_ITEMS } from "@/components/layout/nav-rail";

describe("NavRail Store section", () => {
  it("содержит единый верхнеуровневый раздел Store", () => {
    const storeItem = RAIL_PRIMARY_ITEMS.find((item) => item.label === "Store");

    expect(storeItem).toBeDefined();
    expect(storeItem?.href).toBe("/store/pim/products");
    expect(storeItem?.match).toBe("/store");
  });

  it("не содержит старый отдельный пункт каталога", () => {
    expect(RAIL_PRIMARY_ITEMS.some((item) => item.href === "/catalog")).toBe(false);
  });
});
