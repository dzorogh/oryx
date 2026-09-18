import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StoreCatalogPage } from "@/components/store/pim/products/store-catalog-page";
import type { StoreCatalogItem } from "@/components/store/pim/products/store-catalog-demo-data";

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

const catalogDbMock = vi.hoisted(() => {
  const item = (overrides: StoreCatalogItem): StoreCatalogItem => overrides;
  const fixtures: StoreCatalogItem[] = [
    item({
      id: "db-ace",
      name: "Oryx Ace 1000 Side-by-Side",
      sku: "689220",
      code: "PRD-db-ace",
      imageSrc: "",
      imageAlt: "Oryx Ace 1000 Side-by-Side",
      categoryId: "atv-side-by-side",
      category: "Side-by-Side",
      family: "Ace",
      brand: "Oryx",
      stock: 4,
      updatedAt: "2026-09-01T00:00:00.000Z",
      dealerPrice: 18990,
      retailPrice: 21990,
      dealerStatus: "Available for purchase",
      retailStatus: "Available for sale",
      productionSite: "SH-53",
    }),
    item({
      id: "db-sprint",
      name: "Oryx Sprint 200 ABS",
      sku: "310946",
      code: "PRD-db-sprint",
      imageSrc: "",
      imageAlt: "Oryx Sprint 200 ABS",
      categoryId: "road-scooter",
      category: "Scooter",
      family: "Sprint",
      brand: "Oryx",
      stock: 8,
      updatedAt: "2026-09-01T00:00:00.000Z",
      dealerPrice: 3290,
      retailPrice: 3890,
      dealerStatus: "Available for purchase",
      retailStatus: "Available for sale",
      productionSite: "SH-12",
    }),
  ];

  let impl: () => Promise<StoreCatalogItem[] | null> = async () => fixtures;

  return {
    fixtures,
    load: () => impl(),
    use: (next: () => Promise<StoreCatalogItem[] | null>) => {
      impl = next;
    },
    reset: () => {
      impl = async () => fixtures;
    },
  };
});

vi.mock("@/features/store/store-catalog-from-logistics", () => ({
  loadDbCatalogItems: () => catalogDbMock.load(),
}));

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
  within(getCatalogMain()).getByRole("group", { name: "Тип списка каталога" });

describe("StoreCatalogPage", () => {
  afterEach(() => {
    catalogDbMock.reset();
    cleanup();
  });

  it("shows quick filters, filters panel button, and columns panel button", () => {
    navigationMock.reset();
    render(<StoreCatalogPage />);

    expect(screen.getByRole("heading", { name: "Товары" })).toBeVisible();

    const listingGroup = getListingModeGroup();
    expect(within(listingGroup).getByRole("button", { name: "Товары" })).toHaveAttribute("aria-pressed", "true");
    expect(within(listingGroup).getByRole("button", { name: "Варианты" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Быстрый поиск по названию или артикулу")).toBeVisible();
    expect(screen.getByLabelText("Быстрый фильтр по категории")).toBeVisible();
    expect(screen.getByRole("button", { name: "Открыть панель фильтров каталога" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Открыть панель колонок каталога" })).toBeVisible();
  });

  it("does not render hardcoded catalog items before the database responds", async () => {
    navigationMock.reset();
    let resolveLoad: (items: StoreCatalogItem[] | null) => void = () => {};
    catalogDbMock.use(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );

    render(<StoreCatalogPage />);

    const table = screen.getByRole("table", { name: "Каталог товаров" });
    expect(table).toHaveAttribute("aria-busy", "true");
    expect(table.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
    expect(screen.getByText("Загрузка…")).toBeVisible();
    expect(screen.queryByText("Нет товаров, подходящих под выбранные фильтры.")).not.toBeInTheDocument();
    expect(screen.queryByText("Ace 1000 Side-by-Side")).not.toBeInTheDocument();
    expect(screen.queryByText("Force 1000 EFI")).not.toBeInTheDocument();
    expect(screen.queryByText("Force 1000 EFI Series 01")).not.toBeInTheDocument();

    resolveLoad(catalogDbMock.fixtures);

    expect(await screen.findByText("Ace 1000 Side-by-Side")).toBeVisible();
    expect(screen.getByRole("table", { name: "Каталог товаров" })).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByText("Force 1000 EFI Series 01")).not.toBeInTheDocument();
    expect(screen.getByText("Показано 2 из 2")).toBeVisible();
  });

  it("shows an empty catalog when the database request fails", async () => {
    navigationMock.reset();
    catalogDbMock.use(async () => {
      throw new Error("catalog unavailable");
    });
    render(<StoreCatalogPage />);

    expect(await screen.findByText("Нет товаров, подходящих под выбранные фильтры.")).toBeVisible();
    expect(screen.queryByText("Force 1000 EFI")).not.toBeInTheDocument();
  });

  it("shows an empty catalog when the database returns nothing", async () => {
    navigationMock.reset();
    catalogDbMock.use(async () => null);
    render(<StoreCatalogPage />);

    expect(await screen.findByText("Нет товаров, подходящих под выбранные фильтры.")).toBeVisible();
    expect(screen.queryByText("Force 1000 EFI")).not.toBeInTheDocument();
  });

  it("filters list by product name search", async () => {
    navigationMock.reset();
    render(<StoreCatalogPage />);

    const catalogMain = getCatalogMain();
    expect(await within(catalogMain).findByText("Ace 1000 Side-by-Side")).toBeVisible();
    expect(within(catalogMain).getByText("Sprint 200 ABS")).toBeVisible();

    const quickSearchInput = within(catalogMain).getByLabelText("Быстрый поиск по названию или артикулу");

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
      name: "Открыть панель фильтров каталога",
    });
    fireEvent.click(openFiltersButton);

    expect(screen.getByRole("heading", { name: "Фильтры" })).toBeVisible();
  });

  it("opens columns panel and toggles optional columns", async () => {
    navigationMock.reset();
    const user = userEvent.setup();
    render(<StoreCatalogPage />);

    const [openColumnsButton] = screen.getAllByRole("button", {
      name: "Открыть панель колонок каталога",
    });

    await user.click(openColumnsButton);
    expect(screen.getByRole("heading", { name: "Колонки" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Сбросить колонки каталога к значениям по умолчанию" })).toBeVisible();

    const nameCheckbox = screen.getByLabelText("Показать колонку «Название»");
    expect(nameCheckbox).toBeChecked();
    expect(nameCheckbox).toHaveAttribute("aria-disabled", "true");

    const familyCheckbox = screen.getByLabelText("Показать колонку «Семейство»");
    expect(familyCheckbox).not.toBeChecked();

    await user.click(familyCheckbox);
    expect(familyCheckbox).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Close" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Семейство" })).toBeVisible();
  });

  it("shows product variants mode when listing query is set", async () => {
    navigationMock.reset();
    navigationMock.replace("/store/pim/products?listing=variants");
    render(<StoreCatalogPage />);

    const catalogMain = getCatalogMain();
    const listingGroup = getListingModeGroup();
    expect(within(listingGroup).getByRole("button", { name: "Варианты" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Добавить вариант в каталог")).toBeVisible();
    expect(await within(catalogMain).findByText("Ace 1000 Side-by-Side")).toBeVisible();
    expect(within(catalogMain).queryByText("Force 1000 EFI Touring")).not.toBeInTheDocument();
  });

  it("updates listing query when product variants tab is clicked", async () => {
    navigationMock.reset();
    // The page syncs listing mode through the History API (for static export),
    // not the Next router, so assert against the real URL.
    window.history.replaceState(null, "", "/store/pim/products");
    const user = userEvent.setup();
    render(<StoreCatalogPage />);

    const listingGroup = getListingModeGroup();
    await user.click(within(listingGroup).getByRole("button", { name: "Варианты" }));

    expect(new URLSearchParams(window.location.search).get("listing")).toBe("variants");
  });
});
