"use client";

import type { PackingResult } from "@/domain/packing/types";

type ResultPanelProps = {
  result: PackingResult;
};

const buildStatusText = (isValid: boolean) => (isValid ? "OK" : "Ошибка");

export const ResultPanel = ({ result }: ResultPanelProps) => {
  return (
    <section className="space-y-4 rounded-lg border border-slate-600 bg-slate-900 p-4" aria-label="Панель аудита">
      <h2 className="text-lg font-semibold">Аудит результата</h2>

      <div className="grid gap-2 text-sm text-slate-100">
        <p aria-label="Количество использованных контейнеров">
          Контейнеров: {result.usedContainerCount}
        </p>
        <p aria-label="Количество размещенных единиц">
          Placed: {result.summary.placedUnits} / {result.summary.totalUnits}
        </p>
        <p aria-label="Количество неразмещенных единиц">Unplaced: {result.summary.unplacedUnits}</p>
      </div>

      <div className="space-y-1 text-sm text-slate-200">
        <p>Geometry: {buildStatusText(result.validation.geometryValid)}</p>
        <p>Support: {buildStatusText(result.validation.supportValid)}</p>
        <p>Completeness: {buildStatusText(result.validation.completenessValid)}</p>
        <p>Deterministic: {buildStatusText(result.validation.deterministic)}</p>
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium text-slate-100">Ошибки/замечания</h3>
        {result.validation.violations.length === 0 ? (
          <p className="text-emerald-300" aria-label="Нарушений нет">
            Нарушений нет.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-rose-300" aria-label="Список нарушений">
            {result.validation.violations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium text-slate-100">Unplaced units</h3>
        {result.unplacedItemUnitIds.length === 0 ? (
          <p className="text-emerald-300" aria-label="Все единицы размещены">
            Все единицы размещены.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-amber-300" aria-label="Список неразмещенных единиц">
            {result.unplacedItemUnitIds.map((unitId) => (
              <li key={unitId}>{unitId}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
