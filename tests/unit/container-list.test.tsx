import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContainerList } from "@/features/packing-visualization/components/container-list";
import type { ContainerInstance } from "@/domain/packing/types";

const CONTAINERS: ContainerInstance[] = [
  { containerIndex: 0, placements: [] },
  { containerIndex: 1, placements: [] },
  { containerIndex: 2, placements: [] }
];

describe("ContainerList", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders containers in fill order", () => {
    render(
      createElement(ContainerList, {
        containers: CONTAINERS,
        selectedContainerIndex: 0,
        onSelectContainer: vi.fn()
      })
    );

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(buttons[0]).toHaveTextContent("Контейнер 1");
    expect(buttons[1]).toHaveTextContent("Контейнер 2");
    expect(buttons[2]).toHaveTextContent("Контейнер 3");
  });

  it("calls onSelectContainer with selected index", () => {
    const handleSelectContainer = vi.fn();

    render(
      createElement(ContainerList, {
        containers: CONTAINERS,
        selectedContainerIndex: 0,
        onSelectContainer: handleSelectContainer
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "Показать контейнер 2" }));

    expect(handleSelectContainer).toHaveBeenCalledTimes(1);
    expect(handleSelectContainer).toHaveBeenCalledWith(1);
  });
});
