"use client";

import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import type { PlanSummary, SummaryGroup } from "@/features/logistics/order-plan/order-plan-model";
import {
  DeltaBadge,
  GoneChip,
  Marker,
  OwnerChip,
  ProblemDot,
  type MarkerTone,
} from "@/features/logistics/order-plan/order-plan-visuals";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

const MARKERS: Record<SummaryGroup["kind"], MarkerTone> = {
  warehouse: "plan-warehouse",
  transfer: "plan-transfer",
  production_output: "plan-output",
  production_order: "production_order",
  new_po: "plan-output",
};

const Section = ({ title, count, children }: { title: string; count: number; children: ReactNode }) => (
  <div className="py-2 not-first:border-t not-first:border-border/60">
    <h4 className="flex items-baseline gap-1.5 px-2 pt-1 pb-0.5 text-[13px] font-semibold">
      {title}
      <small className="text-xs font-medium text-zinc-400">{count}</small>
    </h4>
    {children}
  </div>
);

const GroupBlock = ({
  group,
  plus,
  selectedId,
  onSelect,
}: {
  group: SummaryGroup;
  plus: boolean;
  selectedId: string | null;
  onSelect: (variantId: string) => void;
}) => {
  const marker = group.kind === "production_order" && plus ? "plan-output" : MARKERS[group.kind];
  return (
    <div>
      <div className="flex min-h-7 items-center gap-1.5 px-2 pt-[7px] pb-[3px] text-xs text-zinc-600">
        <Marker tone={marker} />
        {group.href ? (
          <a href={group.href} className="text-[12.5px] font-semibold text-zinc-900 hover:underline">
            {group.title}
          </a>
        ) : (
          <b className="text-[12.5px] font-semibold text-zinc-900">{group.title}</b>
        )}
        {group.hint ? <small className="text-[11.5px] text-zinc-400">{group.hint}</small> : null}
        {group.goneLabel ? <GoneChip label={group.goneLabel} /> : null}
        {group.result ? (
          <a
            href={group.result.href ?? undefined}
            className="ml-auto inline-flex h-[22px] items-center gap-1 rounded-md border border-border bg-white px-2 text-xs font-semibold whitespace-nowrap text-zinc-900 hover:bg-zinc-50"
          >
            {group.result.number}
            <ArrowUpRight className="size-3 text-zinc-400" />
          </a>
        ) : null}
      </div>
      {group.rows.map((row) => {
        const selected = row.variantId === selectedId;
        const bad = row.shortage > 0;
        return (
          <button
            key={row.keyString}
            type="button"
            onClick={() => onSelect(row.variantId)}
            className={cn(
              "grid min-h-[30px] w-full grid-cols-[minmax(0,1fr)_auto_44px] items-center gap-2 rounded-[5px] py-1 pr-2 pl-[25px] text-left hover:bg-zinc-50 hover:shadow-[inset_0_0_0_1px_#e5e5e5]",
              selected && "bg-zinc-100 shadow-[inset_3px_0_0_#18181b] hover:bg-zinc-100 hover:shadow-[inset_3px_0_0_#18181b]",
              row.excess && !bad && "bg-amber-50",
              bad && "bg-red-50",
            )}
          >
            <span className={cn("flex items-center gap-1.5 truncate", selected && "font-semibold")}>
              {row.excess && !bad ? <ProblemDot tone="amber" /> : null}
              <span className="truncate">{row.name}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {bad ? <DeltaBadge value={row.shortage} /> : null}
              {row.owner && !row.owner.free ? <OwnerChip label={row.owner.label} muted /> : null}
            </span>
            <span
              className={cn(
                "text-right font-semibold tabular-nums",
                bad && "text-red-600",
                row.excess && !bad && "text-amber-600",
              )}
            >
              {plus ? "+" : ""}
              {formatQuantity(row.quantity)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const OrderPlanSummary = ({
  summary,
  selectedId,
  onSelect,
  footer,
}: {
  summary: PlanSummary;
  selectedId: string | null;
  onSelect: (variantId: string) => void;
  footer: ReactNode;
}) => (
  <Card
    size="sm"
    className={cn(
      logisticsCardClass,
      "gap-0 py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0 xl:sticky xl:top-4",
    )}
  >
    <div className="border-b border-border/60 px-3.5 py-2.5">
      <h3 className="text-[13px] font-semibold">План</h3>
    </div>
    <div className="px-2 pt-0.5 pb-2">
      {summary.take.length > 0 ? (
        <Section title="Взять" count={summary.take.length}>
          {summary.take.map((group) => (
            <GroupBlock key={group.id} group={group} plus={false} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </Section>
      ) : null}
      {summary.order.length > 0 ? (
        <Section title="Заказать дополнительно" count={summary.order.length}>
          {summary.order.map((group) => (
            <GroupBlock key={group.id} group={group} plus selectedId={selectedId} onSelect={onSelect} />
          ))}
        </Section>
      ) : null}
      {summary.uncovered.length > 0 ? (
        <Section title="Не покрыто" count={summary.uncovered.length}>
          {summary.uncovered.map((item) => (
            <button
              key={item.variantId}
              type="button"
              onClick={() => onSelect(item.variantId)}
              className={cn(
                "grid min-h-[30px] w-full grid-cols-[minmax(0,1fr)_44px] items-center gap-2 rounded-[5px] px-2 py-1 text-left hover:bg-zinc-50",
                item.variantId === selectedId && "bg-zinc-100 shadow-[inset_3px_0_0_#18181b]",
              )}
            >
              <span className="flex items-center gap-1.5 truncate">
                <Marker tone="none" />
                <span className="truncate">{item.name}</span>
              </span>
              <span className="text-right font-semibold tabular-nums">{formatQuantity(item.quantity)}</span>
            </button>
          ))}
        </Section>
      ) : null}
    </div>
    <div className="flex flex-col gap-2 border-t border-border/60 px-3 pt-2.5 pb-3">{footer}</div>
  </Card>
);
