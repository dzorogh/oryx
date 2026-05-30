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

const buildStatusText = (isValid: boolean) => (isValid ? "OK" : "Error");

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
      aria-label="Audit panel"
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
            <CardTitle className="text-base">Result audit</CardTitle>
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[open]:rotate-180"
              aria-hidden
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-2">
            <div className="grid gap-2 text-sm">
              <p aria-label="Used container count">
                Containers: {result.usedContainerCount}
              </p>
              <p aria-label="Packing time across containers">
                Packing: {packingMsDisplay === null ? "measuring..." : `${packingMsDisplay} ms`}
              </p>
              <p aria-label="Result page render time">
                Render: {renderMs === null ? "measuring..." : `${renderMs.toFixed(2)} ms`}
              </p>
              <p aria-label="Placed unit count">
                Placed: {result.summary.placedUnits} / {result.summary.totalUnits}
              </p>
              <p aria-label="Unplaced unit count">Unplaced: {result.summary.unplacedUnits}</p>
            </div>

            <Separator />

            <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-2">
                Geometry: {statusBadge(result.validation.geometryValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Support: {statusBadge(result.validation.supportValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Completeness: {statusBadge(result.validation.completenessValid)}
              </span>
              <span className="inline-flex items-center gap-2">
                Deterministic: {statusBadge(result.validation.deterministic)}
              </span>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Issues</h3>
              {result.validation.violations.length === 0 ? (
                <p aria-label="No violations">No violations.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-destructive" aria-label="Violation list">
                  {result.validation.violations.map((violation) => (
                    <li key={violation}>{violation}</li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium" aria-label="Side orientation check">
                Units placed on side
              </h3>
              {onSideUnits.length === 0 ? (
                <p aria-label="On side: none">None.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5" aria-label="Units on side list">
                  {onSideUnits.map((u) => (
                    <li key={u.unitId} aria-label={`Unit ${u.unitId} on side`}>
                      {u.unitId} — {u.itemName} (height: expected {u.expectedHeight}, got {u.actualHeight})
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Post-check</h3>
              <p aria-label="Non-last container empty volume post-check status">
                Non-last containers (empty volume): {statusBadge(emptyVolumePostCheck.pass)}
              </p>
              <p aria-label="Max empty volume in non-last containers">
                Max empty volume: {emptyVolumePostCheck.maxEmptyVolumePercent.toFixed(2)}% (threshold{" "}
                {emptyVolumePostCheck.thresholdPercent}%)
              </p>
              <p aria-label="Checked non-last container count">
                Containers checked: {emptyVolumePostCheck.checkedContainerCount}
              </p>
              {!emptyVolumePostCheck.pass && emptyVolumePostCheck.failingContainerIndex !== null ? (
                <p aria-label="Container exceeding empty volume threshold" className="text-destructive">
                  Threshold exceeded in container #{emptyVolumePostCheck.failingContainerIndex}
                </p>
              ) : null}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Unplaced units</h3>
              {result.unplacedItemUnitIds.length === 0 ? (
                <p aria-label="All units placed">All units placed.</p>
              ) : (
                <ul className="list-disc space-y-1 pl-5" aria-label="Unplaced units list">
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
