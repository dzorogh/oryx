import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_ORDER_ID, ORDER_PRESETS, getOrderPresetById } from "@/domain/packing/constants";
import { expandOrder } from "@/domain/packing/expand-order";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";
import HomePage from "../../app/page";

// MultiContainerScene требует WebGL; в jsdom — заглушка.
vi.mock("@/features/packing-visualization/components/multi-container-scene", () => ({
  MultiContainerScene: () => (
    <div data-testid="multi-container-scene-stub" aria-label="3D сцена всех контейнеров" />
  ),
}));

const mockReplace = vi.fn();

const navigationState = vi.hoisted(() => ({
  searchParams: new URLSearchParams(""),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/",
  useSearchParams: () => navigationState.searchParams,
}));

describe("HomePage", () => {
  beforeEach(() => {
    navigationState.searchParams = new URLSearchParams("");
    mockReplace.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("после расчёта показывает заголовок, сцену-заглушку, навигацию по заказам и панель результата", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: `Заказ №${DEFAULT_ORDER_ID}` })).toBeVisible();
    });

    await waitFor(() => {
      expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Панель аудита")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Заказы" })).toBeInTheDocument();
  });

  it("вызывает router.replace при выборе другого заказа в боковом меню", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: `Открыть ${ORDER_PRESETS[1].label}` })).toBeVisible();
    });

    fireEvent.click(screen.getByRole("button", { name: `Открыть ${ORDER_PRESETS[1].label}` }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  it.each(ORDER_PRESETS)(
    "заказ №$orderId ($label): UI и результат расчёта согласованы",
    async (preset) => {
      navigationState.searchParams = new URLSearchParams(`orderId=${String(preset.orderId)}`);
      const expectedPositions = preset.order.length;
      const expectedUnits = expandOrder(preset.order).length;
      const expectedResult = generatePackingResult(preset.orderId);

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: `Заказ №${preset.orderId}` })).toBeVisible();
      });

      expect(
        screen.getByText(`Позиций: ${expectedPositions} · Единиц: ${expectedUnits}`),
      ).toBeInTheDocument();

      expect(screen.getByRole("button", { name: `Открыть ${preset.label}` })).toHaveAttribute(
        "aria-current",
        "page",
      );

      await waitFor(() => {
        expect(screen.getByLabelText("Количество использованных контейнеров")).toBeInTheDocument();
      });

      expect(screen.getByLabelText("Количество использованных контейнеров")).toHaveTextContent(
        `Контейнеров: ${expectedResult.usedContainerCount}`,
      );
      expect(screen.getByLabelText("Количество размещенных единиц")).toHaveTextContent(
        `Placed: ${expectedResult.summary.placedUnits} / ${expectedResult.summary.totalUnits}`,
      );

      expect(expectedResult.validation.geometryValid).toBe(true);
      expect(expectedResult.validation.supportValid).toBe(true);
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
