import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ReservationHoldTable } from "@/features/logistics/ui/reservation-hold-list";
import { snapshot } from "./logistics-test-fixtures";

afterEach(() => {
  cleanup();
});

const data = snapshot({
  products: Array.from({ length: 7 }, (_, index) => ({
    id: `p-${index + 1}`,
    code: `PRD-${index + 1}`,
    sku: `SKU-${index + 1}`,
    name: `Товар ${index + 1}`,
    unit: "pcs",
    manufacturerId: null,
  })),
  warehouses: [{ id: "wh-1", code: "WH-1", name: "One", manufacturerId: null }],
});

describe("ReservationHoldTable product preview", () => {
  it("shows five products and expands the rest", async () => {
    const user = userEvent.setup();
    render(
      <ReservationHoldTable
        snapshot={data}
        placeHeader="Place"
        rows={[
          {
            id: "rsv-1",
            number: "RSV-1",
            href: "/store/logistics/reservations/1",
            status: "posted",
            direction: "reserve",
            toOwnerType: "order",
            toOwnerId: "1",
            locationType: "warehouse",
            locationId: "wh-1",
            lines: Array.from({ length: 7 }, (_, index) => ({
              id: `line-${index + 1}`,
              productId: `p-${index + 1}`,
              quantity: index + 1,
              fromOwnerType: null,
              fromOwnerId: null,
            })),
          },
        ]}
      />,
    );

    expect(screen.getByText("Товар 5")).toBeVisible();
    expect(screen.queryByText("Товар 6")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Показать ещё 2" }));
    expect(screen.getByText("Товар 7")).toBeVisible();
  });
});
