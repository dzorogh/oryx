"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { plantCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, ProductionStatus } from "@/features/logistics/logistics-types";
import type {
  ProduceRow,
  ProductPlan,
  SourceGroup,
  SourcePlaceKind,
  SourceRow,
} from "@/features/logistics/order-plan/order-plan-model";
import type { OrderPlanActionKey } from "@/features/logistics/order-plan/order-plan-types";
import {
  CoverageBar,
  DeltaBadge,
  formatSigned,
  GoneChip,
  Marker,
  OwnerChip,
  PlanQuantityInput,
  type MarkerTone,
} from "@/features/logistics/order-plan/order-plan-visuals";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { ProductionStatusBadge } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";

const GROUP_LABELS: Record<SourcePlaceKind, string> = {
  warehouse: "Склад",
  transfer: "В пути",
  production_output: "Выпуск",
  production_order: "Заказано на производстве",
};

const GROUP_MARKERS: Record<SourcePlaceKind, MarkerTone> = {
  warehouse: "warehouse",
  transfer: "transfer",
  production_output: "output",
  production_order: "production_order",
};

const EDIT_GRID = "grid grid-cols-[minmax(0,1fr)_132px_64px_110px] items-center gap-2.5";
const VIEW_GRID = "grid grid-cols-[minmax(0,1fr)_132px_110px] items-center gap-2.5";

export type SetPlanAction = (key: OrderPlanActionKey, quantity: number) => Promise<void>;

const Kpi = ({ label, marker, children }: { label: string; marker?: MarkerTone; children: ReactNode }) => (
  <div className="px-3 py-2 not-first:border-l not-first:border-border/60">
    <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-zinc-500">
      {marker ? <Marker tone={marker} wide /> : null}
      {label}
    </span>
    <b className="mt-0.5 flex items-baseline gap-1.5 text-[22px] leading-tight font-semibold tabular-nums">{children}</b>
  </div>
);

const PlaceCell = ({ code, hint, gone, href }: { code: string; hint: string | null; gone: string | null; href: string | null }) => (
  <div className="min-w-0">
    {href ? (
      <a href={href} className="font-semibold hover:underline">
        {code}
      </a>
    ) : (
      <b className="font-semibold">{code}</b>
    )}
    {gone ? (
      <span className="ml-1.5">
        <GoneChip label={gone} />
      </span>
    ) : null}
    {hint ? <small className="block text-[11.5px] leading-tight text-zinc-500">{hint}</small> : null}
  </div>
);

const SourceLine = ({
  row,
  editable,
  remaining,
  onSet,
}: {
  row: SourceRow;
  editable: boolean;
  remaining: number;
  onSet: SetPlanAction;
}) => {
  const bad = row.shortage > 0;
  const quiet = !row.owner.free;
  return (
    <div className={cn(editable ? EDIT_GRID : VIEW_GRID, "min-h-10 rounded-md px-2 py-1.5", bad && "bg-red-50")}>
      <div className={cn(quiet && "[&_a]:font-medium [&_a]:text-zinc-500 [&_b]:font-medium [&_b]:text-zinc-500 [&_small]:text-zinc-400")}>
        <PlaceCell code={row.place.code} hint={row.place.hint} gone={row.place.goneLabel} href={row.place.href} />
      </div>
      <div>
        <OwnerChip label={row.owner.label} muted={quiet} />
      </div>
      {editable ? (
        <>
          <div
            className={cn(
              "text-right font-medium tabular-nums",
              quiet && "text-zinc-500",
              bad && "font-bold text-red-600",
            )}
          >
            {formatQuantity(row.available)}
          </div>
          <div className="flex items-center justify-end gap-1.5">
            {bad ? <DeltaBadge value={row.shortage} /> : null}
            <PlanQuantityInput
              value={row.take}
              invalid={bad}
              disabled={row.take <= 0 && (row.available <= 0 || remaining <= 0)}
              ariaLabel={`Взять ${row.place.code} ${row.owner.label}`}
              onCommit={(quantity) => onSet(row.key, quantity)}
            />
          </div>
        </>
      ) : (
        <div className="pr-2 text-right font-semibold tabular-nums">{formatQuantity(row.take)}</div>
      )}
    </div>
  );
};

const PlantPick = ({
  plantIds,
  value,
  onChange,
  snapshot,
}: {
  plantIds: string[];
  value: string;
  onChange: (plantId: string) => void;
  snapshot: LogisticsSnapshot;
}) => {
  const chipClass =
    "inline-flex h-[26px] items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold whitespace-nowrap";
  if (plantIds.length <= 1) {
    return <span className={chipClass}>{plantCode(snapshot, value)}</span>;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" className={cn(chipClass, "hover:bg-zinc-50")} />}>
        {plantCode(snapshot, value)}
        <ChevronDown className="size-3 text-zinc-500" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 w-auto min-w-28">
        {plantIds.map((plantId) => (
          <DropdownMenuItem key={plantId} onClick={() => onChange(plantId)}>
            {plantCode(snapshot, plantId)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ProduceLine = ({
  row,
  editable,
  remaining,
  onSet,
  snapshot,
}: {
  row: ProduceRow;
  editable: boolean;
  remaining: number;
  onSet: SetPlanAction;
  snapshot: LogisticsSnapshot;
}) => {
  const bad = row.shortage > 0;
  const status = row.place?.status ?? null;
  return (
    <div className={cn(editable ? EDIT_GRID : VIEW_GRID, "min-h-10 rounded-md px-2 py-1.5", bad && "bg-red-50")}>
      {row.place ? (
        <PlaceCell
          code={row.place.code}
          hint={row.place.hint}
          gone={status === "cancelled" ? row.place.goneLabel : null}
          href={row.place.href}
        />
      ) : (
        <b className="font-semibold">Новый PO</b>
      )}
      <div>
        {row.place && status ? (
          <ProductionStatusBadge status={status as ProductionStatus} />
        ) : row.plantId ? (
          <PlantPick plantIds={[row.plantId]} value={row.plantId} onChange={() => undefined} snapshot={snapshot} />
        ) : null}
      </div>
      {editable ? (
        <>
          <div />
          <div className="flex items-center justify-end gap-1.5">
            {bad ? <DeltaBadge value={row.shortage} /> : null}
            <PlanQuantityInput
              add
              value={row.take}
              invalid={bad}
              disabled={row.take <= 0 && (remaining <= 0 || status === "cancelled")}
              ariaLabel={`Добавить ${row.place?.code ?? "Новый PO"}`}
              onCommit={(quantity) => onSet(row.key, quantity)}
            />
          </div>
        </>
      ) : (
        <div className="pr-2 text-right font-semibold tabular-nums">+{formatQuantity(row.take)}</div>
      )}
    </div>
  );
};

const NewPoLine = ({
  variantId,
  plantIds,
  remaining,
  onSet,
  snapshot,
}: {
  variantId: string;
  plantIds: string[];
  remaining: number;
  onSet: SetPlanAction;
  snapshot: LogisticsSnapshot;
}) => {
  const [picked, setPicked] = useState<string | null>(null);
  const plantId = picked && plantIds.includes(picked) ? picked : plantIds[0];
  if (!plantId) {
    return null;
  }
  return (
    <div className={cn(EDIT_GRID, "min-h-10 rounded-md px-2 py-1.5")}>
      <b className="font-semibold">Новый PO</b>
      <div>
        <PlantPick plantIds={plantIds} value={plantId} onChange={setPicked} snapshot={snapshot} />
      </div>
      <div />
      <div className="flex items-center justify-end">
        <PlanQuantityInput
          add
          value={0}
          disabled={remaining <= 0}
          ariaLabel="Добавить Новый PO"
          onCommit={(quantity) =>
            onSet({ kind: "produce", variantId, locationId: null, ownerId: null, plantId }, quantity)
          }
        />
      </div>
    </div>
  );
};

const SectionHead = ({ title, total, grid }: { title: string; total: string; grid: string }) => (
  <div className={cn(grid, "px-2 pt-1 pb-1.5 text-[13px] font-semibold")}>
    <span className="col-span-full flex items-center justify-between">
      <span>{title}</span>
      <span className="pr-2 font-normal text-zinc-500 tabular-nums">{total}</span>
    </span>
  </div>
);

const ColumnHead = ({ labels, grid }: { labels: string[]; grid: string }) => (
  <div className={cn(grid, "px-2 pt-0.5 pb-1 text-[11.5px] text-zinc-400")}>
    {labels.map((label, index) => (
      <span key={`${label}-${index}`} className={cn(index >= 2 && "text-right")}>
        {label}
      </span>
    ))}
  </div>
);

export const OrderPlanDetail = ({
  product,
  groups,
  produce,
  launched,
  editable,
  onSet,
  snapshot,
}: {
  product: ProductPlan;
  groups: SourceGroup[];
  produce: { existing: ProduceRow[]; created: ProduceRow[]; newPlantIds: string[] };
  launched: boolean;
  editable: boolean;
  onSet: SetPlanAction;
  snapshot: LogisticsSnapshot;
}) => {
  const grid = editable ? EDIT_GRID : VIEW_GRID;
  const takeTotal = groups.reduce((sum, group) => sum + group.take, 0);
  const produceRows = [...produce.existing, ...produce.created];
  const addTotal = produceRows.reduce((sum, row) => sum + row.take, 0);
  const excess = product.remaining < -1e-9;
  const showProduce = editable || produceRows.length > 0;

  return (
    <Card size="sm" className={cn(logisticsCardClass, "min-w-0 gap-0 py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0")}>
      <div className="border-b border-border/60 px-4 py-3.5">
        <div className="flex items-baseline gap-2">
          <h3 className="text-[15px] font-semibold">{product.name}</h3>
          {product.subtitle ? <span className="text-xs text-zinc-500">{product.subtitle}</span> : null}
        </div>
        <div className="mt-3 grid grid-cols-4 rounded-md border border-border/60">
          <Kpi label="Заказано">{formatQuantity(product.ordered)}</Kpi>
          <Kpi label={launched ? "Было" : "Уже есть"} marker="warehouse">
            {formatQuantity(product.have)}
          </Kpi>
          <Kpi label="В плане" marker="plan-warehouse">
            {formatQuantity(product.plan)}
            {product.shortage > 0 ? (
              <span className="inline-flex h-[18px] items-center rounded border border-red-200 bg-red-50 px-1.5 text-[11.5px] font-semibold text-red-600">
                {formatSigned(-product.shortage)}
              </span>
            ) : null}
          </Kpi>
          <Kpi label="Осталось" marker="none">
            <span className={cn(excess && "text-amber-600")}>{formatSigned(product.remaining)}</span>
          </Kpi>
        </div>
        <CoverageBar bar={product.bar} size="large" />
      </div>

      <div className="border-b border-border/60 px-4 pt-2.5 pb-3 last:border-b-0">
        <SectionHead title="Взять" total={formatQuantity(takeTotal)} grid={grid} />
        {groups.length > 0 ? (
          <ColumnHead labels={editable ? ["Источник", "Владелец", "Доступно", "Взять"] : ["Источник", "Владелец", "Взято"]} grid={grid} />
        ) : null}
        {groups.map((group) => (
          <div key={group.kind}>
            <div className={cn(grid, "px-2 pt-2.5 pb-0.5 text-xs font-semibold text-zinc-600")}>
              <span className={cn("flex items-center gap-1.5", editable ? "col-span-3" : "col-span-2")}>
                <Marker tone={GROUP_MARKERS[group.kind]} />
                {GROUP_LABELS[group.kind]}
              </span>
              <span className="pr-2 text-right text-zinc-500 tabular-nums">{formatQuantity(group.take)}</span>
            </div>
            {group.rows.map((row) => (
              <SourceLine key={row.keyString} row={row} editable={editable} remaining={product.remaining} onSet={onSet} />
            ))}
          </div>
        ))}
      </div>

      {showProduce ? (
        <div className="px-4 pt-2.5 pb-3">
          <SectionHead title="Заказать дополнительно" total={formatQuantity(addTotal)} grid={grid} />
          <ColumnHead labels={editable ? ["Заказ на производство", "", "", "Добавить"] : ["Заказ на производство", "", "Добавлено"]} grid={grid} />
          {produce.existing.map((row) => (
            <ProduceLine key={row.keyString} row={row} editable={editable} remaining={product.remaining} onSet={onSet} snapshot={snapshot} />
          ))}
          {produce.created.map((row) => (
            <ProduceLine key={row.keyString} row={row} editable={editable} remaining={product.remaining} onSet={onSet} snapshot={snapshot} />
          ))}
          {editable && produce.newPlantIds.length > 0 ? (
            <NewPoLine
              key={product.variantId}
              variantId={product.variantId}
              plantIds={produce.newPlantIds}
              remaining={product.remaining}
              onSet={onSet}
              snapshot={snapshot}
            />
          ) : null}
        </div>
      ) : null}
    </Card>
  );
};
