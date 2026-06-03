import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ORDER_ID, ORDER_PRESETS, getOrderPresetById } from "@/domain/packing/constants";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { OrderPackingAppChrome } from "@/components/store/pim/order-packing-app-chrome";
import { OrderPackingDynamicContent } from "@/features/packing-visualization/components/order-view-section";

// MultiContainerScene требует WebGL; в jsdom — заглушка.
vi.mock("@/features/packing-visualization/components/multi-container-scene", () => ({
  MultiContainerScene: () => (
    <div data-testid="multi-container-scene-stub" aria-label="3D сцена всех контейнеров" />
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/pim/orders/59",
  useParams: () => ({ employeeId: "123" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const renderOrderPacking = (selectedOrderId: number) =>
  render(
    <OrderPackingAppChrome orderId={selectedOrderId}>
      <OrderPackingDynamicContent selectedOrderId={selectedOrderId} />
    </OrderPackingAppChrome>,
  );

describe("Order packing (страница заказа)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("после расчёта показывает заголовок, сцену-заглушку, навигацию по заказам и панель результата", async () => {
    renderOrderPacking(DEFAULT_ORDER_ID);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: `Order #${DEFAULT_ORDER_ID}` })).toBeVisible();
    });

    await waitFor(() => {
      expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Audit panel")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Orders" })).toBeInTheDocument();
  });

  it("ссылки в боковом меню ведут на /pim/orders/<id>", async () => {
    renderOrderPacking(DEFAULT_ORDER_ID);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: `Open ${ORDER_PRESETS[1].label}` })).toBeVisible();
    });

    expect(screen.getByRole("link", { name: `Open ${ORDER_PRESETS[1].label}` })).toHaveAttribute(
      "href",
      `/pim/orders/${ORDER_PRESETS[1].orderId}`,
    );
  });

  it.each(ORDER_PRESETS)(
    "заказ №$orderId ($label): UI и результат расчёта согласованы",
    async (preset) => {
      const expectedPositions = preset.order.length;
      const expectedResult = generatePackingResult(preset.orderId);

      renderOrderPacking(preset.orderId);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: `Order #${preset.orderId}` })).toBeVisible();
      });

      expect(screen.getByRole("heading", { name: "Ordered Products" })).toBeVisible();
      const orderCard = screen.getByLabelText("Order composition");
      expect(within(orderCard).getAllByRole("row").length).toBe(expectedPositions + 1);

      expect(screen.getByRole("link", { name: `Open ${preset.label}` })).toHaveAttribute(
        "aria-current",
        "page",
      );

      const auditToggle = await waitFor(() =>
        screen.getByRole("button", { name: "Result audit" }),
      );
      fireEvent.click(auditToggle);

      await waitFor(() => {
        expect(screen.getByLabelText("Used container count")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Used container count")).toHaveTextContent(
        `Containers: ${expectedResult.usedContainerCount}`,
      );
      expect(screen.getByLabelText("Placed unit count")).toHaveTextContent(
        `Placed: ${expectedResult.summary.placedUnits} / ${expectedResult.summary.totalUnits}`,
      );

      if (isPackingPlacementValid(expectedResult.validation)) {
        expect(expectedResult.validation.geometryValid).toBe(true);
        expect(expectedResult.validation.supportValid).toBe(true);
        await waitFor(() => {
          expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
        });
      } else {
        await waitFor(() => {
          expect(
            screen.getByLabelText("Placement errors: visualization unavailable"),
          ).toBeInTheDocument();
        });
        expect(screen.queryByTestId("multi-container-scene-stub")).not.toBeInTheDocument();
      }
    },
    60_000,
  );

  it("все orderId из ORDER_PRESETS уникальны и совпадают с getOrderPresetById", () => {
    const ids = ORDER_PRESETS.map((p) => p.orderId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of ORDER_PRESETS) {
      expect(getOrderPresetById(preset.orderId).orderId).toBe(preset.orderId);
    }
  });
});
