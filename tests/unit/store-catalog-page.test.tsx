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

const getCatalogMain = () => screen.getByRole("main");

const getListingModeGroup = () =>
  within(getCatalogMain()).getByRole("group", { name: "Catalog listing type" });

describe("StoreCatalogPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows quick filters, filters panel button, and columns panel button", () => {
    navigationMock.reset();
    render(<StoreCatalogPage />);

    expect(screen.getByRole("heading", { name: "Products" })).toBeVisible();

    const listingGroup = getListingModeGroup();
    expect(within(listingGroup).getByRole("button", { name: "Products" })).toHaveAttribute("aria-pressed", "true");
    expect(within(listingGroup).getByRole("button", { name: "Variants" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Quick search by name or SKU")).toBeVisible();
    expect(screen.getByLabelText("Quick filter by category")).toBeVisible();
    expect(screen.getByRole("button", { name: "Open catalog filters panel" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open catalog columns panel" })).toBeVisible();
  });

  it("filters list by product name search", async () => {
    navigationMock.reset();
    render(<StoreCatalogPage />);

    const catalogMain = getCatalogMain();
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

    const catalogMain = getCatalogMain();
    const listingGroup = getListingModeGroup();
    expect(within(listingGroup).getByRole("button", { name: "Variants" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Add a new variant to the catalog")).toBeVisible();
    expect(await within(catalogMain).findByText("100451-2")).toBeVisible();
  });

  it("updates listing query when product variants tab is clicked", async () => {
    navigationMock.reset();
    // The page syncs listing mode through the History API (for static export),
    // not the Next router, so assert against the real URL.
    window.history.replaceState(null, "", "/store/pim/products");
    const user = userEvent.setup();
    render(<StoreCatalogPage />);

    const listingGroup = getListingModeGroup();
    await user.click(within(listingGroup).getByRole("button", { name: "Variants" }));

    expect(new URLSearchParams(window.location.search).get("listing")).toBe("variants");
  });
});
