"use client";

import { useMemo } from "react";
import { CONTAINER_DIMENSIONS } from "@/domain/packing/constants";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";
import { usePackingResult } from "@/features/packing-visualization/hooks/usePackingResult";

export default function HomePage() {
  const { result, isLoading, error } = usePackingResult();
  const hasContainers = useMemo(() => result.containers.length > 0, [result.containers]);

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
          Все контейнеры отображаются на одной сцене — можно вращать и осматривать укладку.
        </p>
      </header>

      {hasContainers ? (
        <MultiContainerScene containers={result.containers} containerSize={CONTAINER_DIMENSIONS} />
      ) : (
        <p className="text-slate-300">Нет контейнеров для отображения.</p>
      )}

      <ResultPanel result={result} />
    </main>
  );
}
