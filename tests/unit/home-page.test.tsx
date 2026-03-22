import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ORDER_ID, ORDER_PRESETS, getOrderPresetById } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import { isPackingPlacementValid } from "@/domain/packing/result-validation";
import { OrderPackingDynamicContent } from "@/features/packing-visualization/components/order-packing-page";
import { OrderPackingLayoutFrame } from "../../app/orders/[orderId]/layout";
import { Sidebar } from "../../app/orders/[orderId]/sidebar";

// MultiContainerScene требует WebGL; в jsdom — заглушка.
vi.mock("@/features/packing-visualization/components/multi-container-scene", () => ({
  MultiContainerScene: () => (
    <div data-testid="multi-container-scene-stub" aria-label="3D сцена всех контейнеров" />
  ),
}));

const renderOrderPacking = (selectedOrderId: number) =>
  render(
    <OrderPackingLayoutFrame orderId={selectedOrderId} sidebarNav={<Sidebar orderId={selectedOrderId} />}>
      <OrderPackingDynamicContent selectedOrderId={selectedOrderId} />
    </OrderPackingLayoutFrame>,
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
      expect(screen.getByRole("heading", { name: `Заказ №${DEFAULT_ORDER_ID}` })).toBeVisible();
    });

    await waitFor(() => {
      expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Панель аудита")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Заказы" })).toBeInTheDocument();
  });

  it("ссылки в боковом меню ведут на /orders/<id>", async () => {
    renderOrderPacking(DEFAULT_ORDER_ID);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: `Открыть ${ORDER_PRESETS[1].label}` })).toBeVisible();
    });

    expect(screen.getByRole("link", { name: `Открыть ${ORDER_PRESETS[1].label}` })).toHaveAttribute(
      "href",
      `/orders/${ORDER_PRESETS[1].orderId}`,
    );
  });

  it.each(ORDER_PRESETS)(
    "заказ №$orderId ($label): UI и результат расчёта согласованы",
    async (preset) => {
      const expectedPositions = preset.order.length;
      const expectedUnits = expandOrder(preset.order).length;
      const expectedResult = generatePackingResult(preset.orderId);

      renderOrderPacking(preset.orderId);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: `Заказ №${preset.orderId}` })).toBeVisible();
      });

      expect(
        screen.getByText(`Позиций: ${expectedPositions} · Единиц: ${expectedUnits}`),
      ).toBeInTheDocument();

      expect(screen.getByRole("link", { name: `Открыть ${preset.label}` })).toHaveAttribute(
        "aria-current",
        "page",
      );

      const auditToggle = await waitFor(() =>
        screen.getByRole("button", { name: "Аудит результата" }),
      );
      fireEvent.click(auditToggle);

      await waitFor(() => {
        expect(screen.getByLabelText("Количество использованных контейнеров")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Количество использованных контейнеров")).toHaveTextContent(
        `Контейнеров: ${expectedResult.usedContainerCount}`,
      );
      expect(screen.getByLabelText("Количество размещенных единиц")).toHaveTextContent(
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
            screen.getByLabelText("Ошибки размещения: визуализация недоступна"),
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
