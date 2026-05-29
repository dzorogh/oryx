import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StoreCatalogPage } from "@/components/store/pim/products/store-catalog-page";

describe("StoreCatalogPage", () => {
  it("shows quick filters and filters panel button", () => {
    render(<StoreCatalogPage />);

    expect(screen.getByRole("heading", { name: "Products" })).toBeVisible();
    expect(screen.getByLabelText("Quick search by name or SKU")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by category")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by dealer status")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by retail status")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open catalog filters panel" })).toBeVisible();
  });

  it("filters list by product name search", async () => {
    render(<StoreCatalogPage />);

    const [catalogMain] = screen.getAllByRole("main");
    const quickSearchInput = within(catalogMain).getByLabelText("Quick search by name or SKU");

    fireEvent.change(quickSearchInput, {
      target: { value: "Ace 1000" },
    });

    expect((await within(catalogMain).findAllByText("Ace 1000 Side-by-Side")).length).toBeGreaterThan(0);
    expect(within(catalogMain).queryAllByText("Sprint 200 ABS").length).toBe(0);
  });

  it("opens full filters panel", () => {
    render(<StoreCatalogPage />);

    const [openFiltersButton] = screen.getAllByRole("button", {
      name: "Open catalog filters panel",
    });
    fireEvent.click(openFiltersButton);

    expect(screen.getByRole("heading", { name: "Filters" })).toBeVisible();
  });
});
