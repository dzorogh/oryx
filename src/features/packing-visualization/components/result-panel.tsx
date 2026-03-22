"use client";

import { useMemo } from "react";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { expandOrder } from "@/domain/packing/expand-order";

type ResultPanelProps = {
  result: PackingResult;
  orderItems: OrderItemType[];
  renderMs: number | null;
};

const buildStatusText = (isValid: boolean) => (isValid ? "OK" : "Ошибка");

export const ResultPanel = ({ result, orderItems, renderMs }: ResultPanelProps) => {
  const onSideUnits = useMemo(() => {
    const expectedUnits = expandOrder(orderItems);
    const expectedUnitByUnitId = new Map<
      string,
      { itemTypeId: number; itemName: string; expectedHeight: number }
    >(
      expectedUnits.map((unit) => {
        const itemType = orderItems.find((x) => x.id === unit.itemTypeId);
        return [
          unit.unitId,
          {
            itemTypeId: unit.itemTypeId,
            itemName: itemType?.name ?? `Type#${unit.itemTypeId}`,
            expectedHeight: unit.dimensions.height,
          },
        ] as const;
      }),
    );

    const found: Array<{
      unitId: string;
      itemName: string;
      expectedHeight: number;
      actualHeight: number;
    }> = [];

    for (const container of result.containers) {
      for (const placement of container.placements) {
        const expected = expectedUnitByUnitId.get(placement.itemUnitId);
        if (!expected) continue;

        // Vertical axis in scene/packing model is placement.size.height.
        // If it differs from the source unit height, the unit is on its side.
        const canBeUpright = placement.size.height === expected.expectedHeight;

        if (!canBeUpright) {
          found.push({
            unitId: placement.itemUnitId,
            itemName: expected.itemName,
            expectedHeight: expected.expectedHeight,
            actualHeight: placement.size.height,
          });
        }
      }
    }

    return found.sort((a, b) => a.unitId.localeCompare(b.unitId));
  }, [orderItems, result.containers]);

  return (
    <section
      className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(45,55,72,0.06)]"
      aria-label="Панель аудита"
    >
      <h2 className="text-lg font-semibold text-[#3D4C6A]">Аудит результата</h2>

      <div className="grid gap-2 text-sm text-slate-700">
        <p aria-label="Количество использованных контейнеров">
          Контейнеров: {result.usedContainerCount}
        </p>
        <p aria-label="Время раскладки по контейнерам">
          Раскладка: {result.timing.packingMs.toFixed(2)} мс
        </p>
        <p aria-label="Время отрисовки страницы результата">
          Отрисовка: {renderMs === null ? "измеряется..." : `${renderMs.toFixed(2)} мс`}
        </p>
        <p aria-label="Количество размещенных единиц">
          Placed: {result.summary.placedUnits} / {result.summary.totalUnits}
        </p>
        <p aria-label="Количество неразмещенных единиц">Unplaced: {result.summary.unplacedUnits}</p>
      </div>

      <div className="space-y-1 text-sm text-slate-600">
        <p>Geometry: {buildStatusText(result.validation.geometryValid)}</p>
        <p>Support: {buildStatusText(result.validation.supportValid)}</p>
        <p>Completeness: {buildStatusText(result.validation.completenessValid)}</p>
        <p>Deterministic: {buildStatusText(result.validation.deterministic)}</p>
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium text-[#3D4C6A]">Ошибки/замечания</h3>
        {result.validation.violations.length === 0 ? (
          <p className="text-emerald-600" aria-label="Нарушений нет">
            Нарушений нет.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-rose-600" aria-label="Список нарушений">
            {result.validation.violations.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium text-[#3D4C6A]" aria-label="Проверка боковой ориентации">
          Ящики лежат на боку
        </h3>
        {onSideUnits.length === 0 ? (
          <p className="text-emerald-600" aria-label="На боку: нет">
            Нет.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-amber-700" aria-label="Список ящиков на боку">
            {onSideUnits.map((u) => (
              <li key={u.unitId} aria-label={`Ящик ${u.unitId} на боку`}>
                {u.unitId} — {u.itemName} (height: expected {u.expectedHeight}, got {u.actualHeight})
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <h3 className="font-medium text-[#3D4C6A]">Unplaced units</h3>
        {result.unplacedItemUnitIds.length === 0 ? (
          <p className="text-emerald-600" aria-label="Все единицы размещены">
            Все единицы размещены.
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-amber-700" aria-label="Список неразмещенных единиц">
            {result.unplacedItemUnitIds.map((unitId) => (
              <li key={unitId}>{unitId}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
