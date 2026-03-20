"use client";

import { useMemo, useState } from "react";
import { CONTAINER_DIMENSIONS } from "@/domain/packing/constants";
import { ContainerList } from "@/features/packing-visualization/components/container-list";
import { ContainerScene } from "@/features/packing-visualization/components/container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";

export default function HomePage() {
  const { result, isLoading, error } = usePackingResult();
  const [selectedContainerIndex, setSelectedContainerIndex] = useState(0);

  const selectedContainer = useMemo(
    () =>
      result.containers.find((container) => container.containerIndex === selectedContainerIndex) ??
      result.containers[0],
    [result.containers, selectedContainerIndex]
  );

  if (isLoading) {
    return <main className="min-h-screen p-6 text-slate-100">Загрузка результата упаковки...</main>;
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 text-rose-300" aria-label="Ошибка расчета упаковки">
        Ошибка: {error}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">3D визуализация упаковки контейнеров</h1>
        <p className="text-slate-300">
          Выберите контейнер в порядке заполнения, чтобы проверить размещения.
        </p>
      </header>

      <ContainerList
        containers={result.containers}
        selectedContainerIndex={selectedContainer?.containerIndex ?? 0}
        onSelectContainer={setSelectedContainerIndex}
      />

      {selectedContainer ? (
        <ContainerScene container={selectedContainer} containerSize={CONTAINER_DIMENSIONS} />
      ) : (
        <p className="text-slate-300">Нет контейнеров для отображения.</p>
      )}

      <ResultPanel result={result} />
    </main>
  );
}
