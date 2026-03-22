"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import type { OrderItemType, PackingResult } from "@/domain/packing/types";
import { CONTAINER_DIMENSIONS } from "@/domain/packing/constants";
import { MultiContainerScene } from "@/features/packing-visualization/components/multi-container-scene";
import { ResultPanel } from "@/features/packing-visualization/components/result-panel";

type OrderViewSectionProps = {
  orderItems: OrderItemType[];
  result: PackingResult;
  onQuantityChange: (lineIndex: number, quantity: number) => void;
  renderMs: number | null;
};

const CONTAINER_LABEL = "40HC";
const CONTAINER_MAX_WEIGHT_KG = 30_000;

const countPlacedByItemTypeId = (packingResult: PackingResult): Map<number, number> => {
  const counts = new Map<number, number>();
  for (const container of packingResult.containers) {
    for (const placement of container.placements) {
      const next = (counts.get(placement.itemTypeId) ?? 0) + 1;
      counts.set(placement.itemTypeId, next);
    }
  }
  return counts;
};

const formatVolumeM3 = (mmVolume: number) =>
  (mmVolume / 1_000_000_000).toLocaleString("ru-RU", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });

const formatDimensions = (item: OrderItemType) =>
  `${item.width.toLocaleString("ru-RU")} × ${item.length.toLocaleString("ru-RU")} × ${item.height.toLocaleString("ru-RU")} мм`;

export const OrderViewSection = ({
  orderItems,
  result,
  onQuantityChange,
  renderMs,
}: OrderViewSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const placedByType = useMemo(() => countPlacedByItemTypeId(result), [result]);

  const rows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return orderItems
      .map((item, lineIndex) => ({ item, lineIndex }))
      .filter(({ item }) => {
        if (!normalizedQuery) return true;
        const hay = `${item.name} ${item.id}`.toLowerCase();
        return hay.includes(normalizedQuery);
      });
  }, [orderItems, searchQuery]);

  const volumeMm3 =
    CONTAINER_DIMENSIONS.width * CONTAINER_DIMENSIONS.length * CONTAINER_DIMENSIONS.height;

  const hasContainers = result.containers.length > 0;

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleQuantityInputChange = (lineIndex: number, event: ChangeEvent<HTMLInputElement>) => {
    const parsed = event.target.valueAsNumber;
    if (Number.isNaN(parsed)) {
      return;
    }
    onQuantityChange(lineIndex, parsed);
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        aria-label="Состав заказа"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Ordered Products</h2>
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M10.5 18a7.5 7.5 0 110-15 7.5 7.5 0 010 15zM16.5 16.5L21 21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Поиск по названию или ID"
              aria-label="Поиск по позициям заказа"
              className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
          <table className="min-w-[720px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 text-xs font-medium uppercase tracking-wide text-slate-600">
                <th scope="col" className="px-3 py-3">
                  Наименование
                </th>
                <th scope="col" className="px-3 py-3">
                  ID
                </th>
                <th scope="col" className="px-3 py-3">
                  Габариты, мм
                </th>
                <th scope="col" className="px-3 py-3">
                  Вес
                </th>
                <th scope="col" className="px-3 py-3">
                  Количество
                </th>
                <th scope="col" className="px-3 py-3" title="Размещено в контейнерах">
                  В контейнере
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ item, lineIndex }, index) => {
                const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50/80";
                const placed = placedByType.get(item.id) ?? 0;
                return (
                  <tr key={String(lineIndex)} className={`${zebra} border-b border-slate-200`}>
                    <td className="px-3 py-3 align-middle font-medium text-slate-900">{item.name}</td>
                    <td className="px-3 py-3 align-middle text-slate-700">{item.id}</td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap text-slate-800">
                      {formatDimensions(item)}
                    </td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap text-slate-800">
                      {item.weight.toLocaleString("ru-RU")} кг
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <label className="sr-only" htmlFor={`qty-${lineIndex}`}>
                        Количество для {item.name}
                      </label>
                      <input
                        id={`qty-${lineIndex}`}
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={9_999_999}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => handleQuantityInputChange(lineIndex, e)}
                        className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-right text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        aria-label={`Количество, ${item.name}`}
                      />
                    </td>
                    <td className="px-3 py-3 align-middle text-slate-900">{placed}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500" role="status">
            Нет позиций, подходящих под поиск.
          </p>
        ) : null}
      </section>

      <section
        className="rounded-lg border border-slate-200/90 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        aria-label="Load calculator"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Load calculator</h2>
          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">Контейнер</span>
            <select
              name="container-type"
              defaultValue={CONTAINER_LABEL}
              className="max-w-[7rem] cursor-pointer rounded border border-slate-200/80 bg-slate-50/80 py-0.5 pl-1.5 pr-7 text-xs font-normal text-slate-600 shadow-none focus:border-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-200/80"
              aria-label="Тип контейнера"
            >
              <option value={CONTAINER_LABEL}>{CONTAINER_LABEL}</option>
            </select>
          </label>
        </div>



        {hasContainers ? (
          <MultiContainerScene
            containers={result.containers}
            containerSize={CONTAINER_DIMENSIONS}
            orderItems={orderItems}
          />
        ) : (
          <p className="py-16 text-center text-sm text-slate-500">Нет контейнеров для отображения.</p>
        )}

        <div className="mt-6">
          <ResultPanel result={result} orderItems={orderItems} renderMs={renderMs} />
        </div>
      </section>
    </div>
  );
};
