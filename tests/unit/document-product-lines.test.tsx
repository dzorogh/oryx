import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentProductLines } from "@/features/logistics/ui/document-product-lines";
import { snapshot } from "./logistics-test-fixtures";

afterEach(() => {
  cleanup();
});

const data = snapshot({
  products: Array.from({ length: 8 }, (_, index) => ({
    id: `p-${index + 1}`,
    code: `PRD-${index + 1}`,
    sku: `SKU-${index + 1}`,
    name: `Товар ${index + 1}`,
    unit: "pcs",
    manufacturerId: null,
  })),
});

const lines = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    productId: `p-${index + 1}`,
    quantity: (index + 1) * 2,
  }));

describe("DocumentProductLines", () => {
  it("shows an empty mark when there are no lines", () => {
    render(<DocumentProductLines snapshot={data} lines={[]} />);
    expect(screen.getByText("—")).toBeVisible();
  });

  it("renders each product with quantity on its own row", () => {
    render(<DocumentProductLines snapshot={data} lines={lines(3)} />);
    expect(screen.getByRole("link", { name: "Товар 1" })).toBeVisible();
    expect(screen.getByText("2 шт")).toBeVisible();
    expect(screen.getByRole("link", { name: "Товар 3" })).toBeVisible();
    expect(screen.getByText("6 шт")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Показать ещё/ })).toBeNull();
  });

  it("does not show a more-button for exactly five products", () => {
    render(<DocumentProductLines snapshot={data} lines={lines(5)} />);
    expect(screen.getByRole("link", { name: "Товар 5" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Показать ещё|Свернуть/ })).toBeNull();
  });

  it("keeps the first five rows and reveals the rest after Ещё", async () => {
    const user = userEvent.setup();
    render(<DocumentProductLines snapshot={data} lines={lines(8)} />);

    expect(screen.getByRole("link", { name: "Товар 5" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Товар 6" })).toBeNull();
    expect(screen.getByRole("button", { name: "Показать ещё 3" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Показать ещё 3" }));
    expect(screen.getByRole("link", { name: "Товар 8" })).toBeVisible();
    expect(screen.getByText("16 шт")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Свернуть список товаров" }));
    expect(screen.queryByRole("link", { name: "Товар 6" })).toBeNull();
    expect(screen.getByRole("button", { name: "Показать ещё 3" })).toBeVisible();
  });
});
