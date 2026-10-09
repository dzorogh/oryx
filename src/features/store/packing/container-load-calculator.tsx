"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  containerTypeFromInnerMm,
  packMixedContainers,
  type MixedPackItem,
} from "@/domain/packing/mixed-containers";
import type { OrderItemType } from "@/domain/packing/types";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { cn } from "@/lib/utils";

export type ContainerLoadType = {
  code: string;
  innerLengthMm: number;
  innerWidthMm: number;
  innerHeightMm: number;
  maxWeightKg: number;
};

/** Container type picker + mixed packing + 3D scene with fill percent (checkout and customer order card). */
export const ContainerLoadCalculator = ({
  containerTypes,
  items,
  missingNames,
  loadStatus = "ready",
  onRetry,
  heading = <p className="text-sm font-medium">Калькулятор контейнеров</p>,
  className = "space-y-3 border-t pt-3",
  sceneClassName = "h-[min(360px,50vh)]",
}: {
  containerTypes: ContainerLoadType[];
  items: MixedPackItem[];
  /** Products without dimensions, listed apart. */
  missingNames: string[];
  loadStatus?: "loading" | "ready" | "error" | "unconfigured";
  onRetry?: () => void;
  heading?: ReactNode;
  className?: string;
  sceneClassName?: string;
}) => {
  const defaultCodes = useMemo(() => containerTypes.map((type) => type.code), [containerTypes]);
  const [selectedOverride, setSelectedOverride] = useState<string[] | null>(null);
  const selectedCodes = selectedOverride ?? defaultCodes;

  const typesReady = loadStatus === "ready";
  const allowed = useMemo(
    () =>
      typesReady
        ? containerTypes
            .filter((type) => selectedCodes.includes(type.code))
            .map((type) =>
              containerTypeFromInnerMm({
                code: type.code,
                innerLengthMm: type.innerLengthMm,
                innerWidthMm: type.innerWidthMm,
                innerHeightMm: type.innerHeightMm,
                maxWeightKg: type.maxWeightKg,
              }),
            )
        : [],
    [containerTypes, selectedCodes, typesReady],
  );

  const result = useMemo(
    () => (items.length && allowed.length ? packMixedContainers(items, allowed) : null),
    [items, allowed],
  );

  const orderItems: OrderItemType[] = useMemo(
    () =>
      items.map((item) => ({
        id: item.id,
        name: item.name,
        width: item.widthMm,
        length: item.lengthMm,
        height: item.heightMm,
        weight: item.weightKg,
        quantity: item.quantity,
      })),
    [items],
  );

  const defaultSize = allowed[0]
    ? { width: allowed[0].width, length: allowed[0].length, height: allowed[0].height }
    : { width: 12032, length: 2352, height: 2690 };

  const setSelectedCodes = (codes: string[]) => setSelectedOverride(codes);

  return (
    <div className={cn(className)}>
      {heading}
      {typesReady ? (
        <div className="flex flex-wrap gap-3">
          {containerTypes.map((type) => {
            const checked = selectedCodes.includes(type.code);
            return (
              <label key={type.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => {
                    if (value) setSelectedCodes([...selectedCodes, type.code]);
                    else setSelectedCodes(selectedCodes.filter((code) => code !== type.code));
                  }}
                />
                <span className="tabular-nums">{type.code}</span>
              </label>
            );
          })}
        </div>
      ) : null}
      {loadStatus === "loading" ? (
        <p className="text-sm text-muted-foreground">Загрузка…</p>
      ) : null}
      {loadStatus === "error" ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-destructive">Не удалось загрузить типы контейнеров</p>
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Повторить
            </Button>
          ) : null}
        </div>
      ) : null}
      {loadStatus === "unconfigured" ? (
        <p className="text-sm text-muted-foreground">Бэкенд демо не настроен</p>
      ) : null}
      {typesReady && !allowed.length ? (
        <p className="text-sm text-muted-foreground">Выберите хотя бы один тип контейнера.</p>
      ) : null}
      {result?.oversizedItemIds.length ? (
        <p className="text-sm text-amber-700">
          Не помещается ни в один выбранный контейнер:{" "}
          {result.oversizedItemIds
            .map((id) => items.find((item) => item.id === id)?.name ?? String(id))
            .join(", ")}
        </p>
      ) : null}
      {result?.unplacedBoxIds.length ? (
        <p className="text-sm text-amber-700">
          Не уложено коробок: {result.unplacedBoxIds.length} — нужно больше контейнеров, чем считает калькулятор.
        </p>
      ) : null}
      {missingNames.length ? (
        <p className="text-sm text-muted-foreground">Нет габаритов: {missingNames.join(", ")}</p>
      ) : null}
      {result?.containers.length ? (
        <>
          <ul className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {result.containers.map((container) => (
              <li key={container.containerIndex} className="tabular-nums">
                {container.typeCode}: {container.fillPercent.toFixed(1)}%
              </li>
            ))}
          </ul>
          <MultiContainerScene
            containers={result.containers.map((container) => ({
              containerIndex: container.containerIndex,
              placements: container.placements,
              size: container.size,
              typeCode: container.typeCode,
              fillPercent: container.fillPercent,
            }))}
            containerSize={defaultSize}
            orderItems={orderItems}
            className={sceneClassName}
          />
        </>
      ) : allowed.length ? (
        <p className="text-sm text-muted-foreground">Нет данных для укладки.</p>
      ) : null}
    </div>
  );
};
