"use client";

import type { ContainerInstance, OrderItemType } from "@/domain/packing/types";

const COLUMN_THEMES = [
  { header: "bg-[#E6D6FD]", tint: "bg-[#E6D6FD]/40", accent: "bg-[#84CC16]" },
  { header: "bg-[#C8F1E4]", tint: "bg-[#D4F6ED]/50", accent: "bg-[#14B8A6]" },
  { header: "bg-[#FFD6E0]", tint: "bg-[#FFE0E6]/45", accent: "bg-[#EC4899]" },
  { header: "bg-[#FFF3B8]", tint: "bg-[#FFF9C4]/50", accent: "bg-[#EAB308]" },
  { header: "bg-[#C7E2FF]", tint: "bg-[#D1E9FF]/50", accent: "bg-[#647BEF]" },
] as const;

type PackingKanbanBoardProps = {
  containers: ContainerInstance[];
  orderItems: OrderItemType[];
};

const buildItemNameMap = (orderItems: OrderItemType[]) => {
  const map = new Map<number, string>();
  for (const item of orderItems) {
    map.set(item.id, item.name);
  }
  return map;
};

export const PackingKanbanBoard = ({ containers, orderItems }: PackingKanbanBoardProps) => {
  const itemNameByTypeId = buildItemNameMap(orderItems);

  if (containers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
        Нет контейнеров для отображения в канбане.
      </p>
    );
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]"
      role="list"
      aria-label="Контейнеры в виде канбан-колонок"
    >
      {containers.map((container, idx) => {
        const theme = COLUMN_THEMES[idx % COLUMN_THEMES.length];
        return (
          <section
            key={container.containerIndex}
            className="flex min-w-[min(100%,320px)] max-w-[320px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 shadow-sm"
            role="listitem"
          >
            <header
              className={`flex items-center justify-between gap-2 px-3 py-2.5 ${theme.header}`}
            >
              <span className="text-sm font-semibold text-[#3D4C6A]">
                Контейнер {container.containerIndex + 1}
              </span>
              <span
                className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/80 px-1.5 text-xs font-medium text-[#3D4C6A] shadow-sm"
                aria-label={`Единиц в контейнере: ${container.placements.length}`}
              >
                {container.placements.length}
              </span>
            </header>
            <div className={`flex min-h-[100px] flex-col gap-2 p-2 ${theme.tint}`}>
              {container.placements.map((placement) => {
                const name =
                  itemNameByTypeId.get(placement.itemTypeId) ?? `Тип ${placement.itemTypeId}`;
                return (
                  <article
                    key={placement.itemUnitId}
                    className="flex overflow-hidden rounded-lg border border-slate-200/60 bg-white shadow-[0_1px_3px_rgba(45,55,72,0.08)]"
                  >
                    <div className={`w-1 shrink-0 ${theme.accent}`} aria-hidden />
                    <div className="min-w-0 flex-1 p-3">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                        {name}
                      </h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">{placement.itemUnitId}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-xs text-[#778297]">
                        <span>
                          {placement.size.width}×{placement.size.length}×{placement.size.height}
                        </span>
                        <span>yaw {placement.rotationYaw}°</span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};
