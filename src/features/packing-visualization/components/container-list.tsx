"use client";

import type { ContainerInstance } from "@/domain/packing/types";

type ContainerListProps = {
  containers: ContainerInstance[];
  selectedContainerIndex: number;
  onSelectContainer: (containerIndex: number) => void;
};

export const ContainerList = ({
  containers,
  selectedContainerIndex,
  onSelectContainer
}: ContainerListProps) => {
  if (containers.length === 0) {
    return (
      <p className="text-sm text-slate-300" aria-label="Список контейнеров пуст">
        Контейнеры не использованы.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Список контейнеров по порядку заполнения">
      {containers.map((container) => {
        const isSelected = container.containerIndex === selectedContainerIndex;
        const baseClassName =
          "rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
        const stateClassName = isSelected
          ? "border-sky-500 bg-sky-700 text-slate-100"
          : "border-slate-500 bg-slate-800 text-slate-200 hover:bg-slate-700";

        return (
          <button
            key={container.containerIndex}
            type="button"
            aria-label={`Показать контейнер ${container.containerIndex + 1}`}
            className={`${baseClassName} ${stateClassName}`}
            onClick={() => onSelectContainer(container.containerIndex)}
          >
            Контейнер {container.containerIndex + 1}
          </button>
        );
      })}
    </div>
  );
};
