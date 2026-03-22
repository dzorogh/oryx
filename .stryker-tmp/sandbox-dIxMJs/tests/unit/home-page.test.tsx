// @ts-nocheck
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ORDER_ID,
  ORDER_PRESETS,
  getOrderPresetById,
} from "@/domain/packing/constants";
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/api/packing")) {
          const match = /[?&]orderId=(\d+)/.exec(url);
          const orderId = match ? Number(match[1]) : DEFAULT_ORDER_ID;
          const body = generatePackingResult(orderId);
          return {
            ok: true,
            status: 200,
            json: async () => body,
          };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({}),
        };
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("после загрузки API показывает заголовок, сцену-заглушку и панель результата", async () => {
    render(<HomePage />);

    expect(screen.getByText("Загрузка результата упаковки...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "3D визуализация упаковки контейнеров" })).toBeVisible();
    });

    expect(screen.getByTestId("multi-container-scene-stub")).toBeInTheDocument();
    expect(screen.getByLabelText("Панель аудита")).toBeInTheDocument();
    expect(screen.getByLabelText("Переключение заказа для упаковки")).toBeInTheDocument();
  });

  it("вызывает router.replace при смене заказа", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Переключение заказа для упаковки")).toBeVisible();
    });

    const select = screen.getByLabelText("Переключение заказа для упаковки");
    const firstValue = (select as HTMLSelectElement).value;

    const options = screen.getAllByRole("option");
    const other = options.find((o) => (o as HTMLOptionElement).value !== firstValue);
    expect(other).toBeDefined();

    const nextValue = (other as HTMLOptionElement).value;
    fireEvent.change(select, { target: { value: nextValue } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
    });
  });

  it.each(ORDER_PRESETS)(
    "заказ №$orderId ($label): UI и результат API согласованы",
    async (preset) => {
      navigationState.searchParams = new URLSearchParams(`orderId=${String(preset.orderId)}`);
      const expectedPositions = preset.order.length;
      const expectedUnits = expandOrder(preset.order).length;
      const expectedResult = generatePackingResult(preset.orderId);

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "3D визуализация упаковки контейнеров" })).toBeVisible();
      });

      expect(
        screen.getByText(`Позиций: ${expectedPositions} | Единиц: ${expectedUnits}`),
      ).toBeInTheDocument();

      expect(screen.getByLabelText("Переключение заказа для упаковки")).toHaveValue(String(preset.orderId));

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
