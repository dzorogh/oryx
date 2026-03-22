import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTAINER_DIMENSIONS, DEFAULT_ORDER_ID, getOrderPresetById } from "@/domain/packing/constants";
import { OrderViewSection } from "@/features/packing-visualization/components/order-view-section";
import { generatePackingResult } from "@/domain/packing/generate-packing-result";

vi.mock("@/features/packing-visualization/components/multi-container-scene", () => ({
  MultiContainerScene: () => <div data-testid="multi-container-scene-stub" aria-label="3D сцена всех контейнеров" />,
}));

vi.mock("@/features/packing-visualization/components/result-panel", () => ({
  ResultPanel: () => <div data-testid="result-panel-stub" />,
}));

describe("OrderViewSection", () => {
  afterEach(() => {
    cleanup();
  });

  it("при валидном размещении показывает 3D-сцену", () => {
    const preset = getOrderPresetById(DEFAULT_ORDER_ID);
    const result = generatePackingResult(DEFAULT_ORDER_ID, preset.order);

    render(
      <OrderViewSection
        orderItems={preset.order}
        result={result}
        isPackingLoading={false}
        onQuantityChange={() => {}}
        renderMs={null}
      />,
    );

    expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ошибки размещения: визуализация недоступна")).not.toBeInTheDocument();
  });

  it("при ошибках размещения не рендерит сцену и показывает сообщение об ошибке", () => {
    const orderItems = [
      {
        id: 99001,
        name: "Слишком высокий",
        width: 100,
        length: 100,
        height: CONTAINER_DIMENSIONS.height + 1,
        weight: 1,
        quantity: 1,
      },
    ];
    const result = generatePackingResult(DEFAULT_ORDER_ID, orderItems);

    render(
      <OrderViewSection
        orderItems={orderItems}
        result={result}
        isPackingLoading={false}
        onQuantityChange={() => {}}
        renderMs={null}
      />,
    );

    expect(screen.queryByTestId("multi-container-scene-stub")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Ошибки размещения: визуализация недоступна")).toBeInTheDocument();
    expect(screen.getByText("Ошибки размещения")).toBeInTheDocument();
  });

  it("во время загрузки показывает спиннер, а не сцену", () => {
    const preset = getOrderPresetById(DEFAULT_ORDER_ID);

    render(
      <OrderViewSection
        orderItems={preset.order}
        result={null}
        isPackingLoading
        onQuantityChange={() => {}}
        renderMs={null}
      />,
    );

    expect(screen.getByLabelText("Выполняется расчёт упаковки")).toBeInTheDocument();
    expect(screen.queryByTestId("multi-container-scene-stub")).not.toBeInTheDocument();
  });
});
