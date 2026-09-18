// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { expandOrder } from "@/domain/packing/expand-order";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ResultPanelProps = {
  result: PackingResult;
  orderItems: OrderItemType[];
  renderMs: number | null;
};

const buildStatusText = (isValid: boolean) => (isValid ? "ОК" : "Ошибка");

export const ResultPanel = ({ result, orderItems, renderMs }: ResultPanelProps) => {
  const [packingMsDisplay, setPackingMsDisplay] = useState<string | null>(null);
  const emptyVolumePostCheck = result.postCheck.nonLastContainerEmptyVolume;

  useEffect(() => {
    // Время раскладки из performance.now() недетерминировано между SSR и клиентом — показываем после гидратации.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация UI с метрикой после монтирования
    setPackingMsDisplay(result.timing.packingMs.toFixed(2));
  }, [result.timing.packingMs]);

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

  const statusBadge = (isValid: boolean) => (
    <Badge variant={isValid ? "secondary" : "destructive"}>{buildStatusText(isValid)}</Badge>
  );

  return (
    <Card
      aria-label="Панель аудита"
      className="border border-[var(--corportal-border-grey)] bg-[var(--corportal-surface-white)] ring-0"
    >
      <Collapsible defaultOpen={false} className="group">
        <CardHeader>
          <CollapsibleTrigger
            type="button"
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md text-left outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
          >
            <CardTitle className="text-base">Аудит результата</CardTitle>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-2 text-sm">
              <p aria-label="Число использованных контейнеров">
                Контейнеры: {result.usedContainerCount}
              </p>
              <p aria-label="Время упаковки по контейнерам">
                Упаковка: {packingMsDisplay === null ? "измерение..." : `${packingMsDisplay} мс`}
              </p>
              <p aria-label="Время отрисовки страницы результата">
                Отрисовка: {renderMs === null ? "измерение..." : `${renderMs.toFixed(2)} мс`}
              </p>
              <p aria-label="Число размещённых единиц">
                Размещено: {result.summary.placedUnits} / {result.summary.totalUnits}
              </p>
              <p aria-label="Число неразмещённых единиц">Не размещено: {result.summary.unplacedUnits}</p>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                Геометрия: {statusBadge(result.validation.geometryValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Опора: {statusBadge(result.validation.supportValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Полнота: {statusBadge(result.validation.completenessValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Детерминированность: {statusBadge(result.validation.deterministic)}
              </span>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Проблемы</h3>
              {result.validation.violations.length === 0 ? (
                <p aria-label="Нарушений нет">Нарушений нет.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-destructive" aria-label="Список нарушений">
                  {result.validation.violations.map((violation) => (
                    <li key={violation}>{violation}</li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium" aria-label="Проверка ориентации на бок">
                Единицы на боку
              </h3>
              {onSideUnits.length === 0 ? (
                <p aria-label="На боку: нет">Нет.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5" aria-label="Список единиц на боку">
                  {onSideUnits.map((u) => (
                    <li key={u.unitId} aria-label={`Единица ${u.unitId} на боку`}>
                      {u.unitId} — {u.itemName} (высота: ожидалось {u.expectedHeight}, получилось {u.actualHeight})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Постпроверка</h3>
              <p aria-label="Статус постпроверки пустого объёма непоследних контейнеров">
                Непоследние контейнеры (пустой объём): {statusBadge(emptyVolumePostCheck.pass)}
              </p>
              <p aria-label="Максимальный пустой объём в непоследних контейнерах">
                Макс. пустой объём: {emptyVolumePostCheck.maxEmptyVolumePercent.toFixed(2)}% (порог{" "}
                {emptyVolumePostCheck.thresholdPercent}%)
              </p>
              <p aria-label="Число проверенных непоследних контейнеров">
                Проверено контейнеров: {emptyVolumePostCheck.checkedContainerCount}
              </p>
              {!emptyVolumePostCheck.pass && emptyVolumePostCheck.failingContainerIndex !== null ? (
                <p aria-label="Контейнер с превышением порога пустого объёма" className="text-destructive">
                  Порог превышен в контейнере #{emptyVolumePostCheck.failingContainerIndex}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Неразмещённые единицы</h3>
              {result.unplacedItemUnitIds.length === 0 ? (
                <p aria-label="Все единицы размещены">Все единицы размещены.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5" aria-label="Список неразмещённых единиц">
                  {result.unplacedItemUnitIds.map((unitId) => (
                    <li key={unitId}>{unitId}</li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
