import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreCatalogPage } from "@/components/store/pim/products/store-catalog-page";

const navigationMock = vi.hoisted(() => {
  let searchParams = new URLSearchParams();

  return {
    getSearchParams: () => searchParams,
    replace: (href: string) => {
      const url = new URL(href, "http://localhost");
      searchParams = url.searchParams;
    },
    reset: () => {
      searchParams = new URLSearchParams();
    },
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => "/store/pim/products",
  useSearchParams: () => navigationMock.getSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: navigationMock.replace,
    prefetch: vi.fn(),
  }),
}));

describe("StoreCatalogPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows quick filters, filters panel button, and columns panel button", () => {
    navigationMock.reset();
    render(<StoreCatalogPage />);

    expect(screen.getByRole("heading", { name: "Products" })).toBeVisible();

    const [catalogMain] = screen.getAllByRole("main");
    const listingTabs = within(catalogMain).getByRole("tablist", { name: "Catalog listing type" });
    expect(within(listingTabs).getByRole("tab", { name: "Base products" })).toHaveAttribute("aria-pressed", "true");
    expect(within(listingTabs).getByRole("tab", { name: "Product variants" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Quick search by name or SKU")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by category")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by dealer status")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by retail status")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open catalog filters panel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open catalog columns panel" })).toBeVisible();
  });

  it("filters list by product name search", async () => {
    navigationMock.reset();
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
    navigationMock.reset();
    render(<StoreCatalogPage />);

    const [openFiltersButton] = screen.getAllByRole("button", {
      name: "Open catalog filters panel",
    });
    fireEvent.click(openFiltersButton);

    expect(screen.getByRole("heading", { name: "Filters" })).toBeVisible();
  });

  it("opens columns panel and toggles optional columns", async () => {
    navigationMock.reset();
    const user = userEvent.setup();
    render(<StoreCatalogPage />);

    const [openColumnsButton] = screen.getAllByRole("button", {
      name: "Open catalog columns panel",
    });

    await user.click(openColumnsButton);
    expect(screen.getByRole("heading", { name: "Columns" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reset catalog columns to default" })).toBeVisible();

    const nameCheckbox = screen.getByLabelText("Toggle Name column");
    expect(nameCheckbox).toBeChecked();
    expect(nameCheckbox).toHaveAttribute("aria-disabled", "true");

    const familyCheckbox = screen.getByLabelText("Toggle Family column");
    expect(familyCheckbox).not.toBeChecked();

    await user.click(familyCheckbox);
    expect(familyCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Close" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Family" })).toBeVisible();
  });

  it("shows product variants mode when listing query is set", async () => {
    navigationMock.reset();
    navigationMock.replace("/store/pim/products?listing=variants");
    render(<StoreCatalogPage />);

    const [catalogMain] = screen.getAllByRole("main");
    const listingTabs = within(catalogMain).getByRole("tablist", { name: "Catalog listing type" });
    expect(within(listingTabs).getByRole("tab", { name: "Product variants" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Add a new variant to the catalog")).toBeVisible();
    expect(await within(catalogMain).findByText("100451-2")).toBeVisible();
  });

  it("updates listing query when product variants tab is clicked", async () => {
    navigationMock.reset();
    const user = userEvent.setup();
    render(<StoreCatalogPage />);

    const [catalogMain] = screen.getAllByRole("main");
    const listingTabs = within(catalogMain).getByRole("tablist", { name: "Catalog listing type" });
    await user.click(within(listingTabs).getByRole("tab", { name: "Product variants" }));

    expect(navigationMock.getSearchParams().get("listing")).toBe("variants");
  });
});
