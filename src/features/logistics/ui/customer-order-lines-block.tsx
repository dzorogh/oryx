// english-ui:ignore-file
"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Check, Factory, Truck, Warehouse } from "lucide-react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Card } from "@/components/ui/card";
import { hrefForProduct } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { locationIdentity } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";
import {
  buildCustomerOrderLineView,
  type CustomerOrderLineView,
} from "@/features/logistics/ui/customer-order-line-view";
import {
  CustomerOrderLinesTable,
  LineActions,
  type CustomerOrderLinesActionProps,
} from "@/features/logistics/ui/customer-order-lines-table";
import { LocationLink } from "@/features/logistics/ui/location-link";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { ProductPhoto } from "@/features/store/product-photo";
import { cn } from "@/lib/utils";

const LAYOUTS = [
  {
    id: "pipeline",
    label: "Путь",
    hint: "Состав заказа слева направо: производство → путь → склад → отгрузка.",
  },
  {
    id: "split",
    label: "Слои",
    hint: "Слева — что уже в заказе. Справа — что лежит на складах.",
  },
  {
    id: "tiles",
    label: "Плитки",
    hint: "Каждая штука заказа как клетка, рядом крупные цифры по этапам.",
  },
  {
    id: "table",
    label: "Таблица",
    hint: "Текущая плотная таблица со всеми колонками.",
  },
] as const;

type LayoutId = (typeof LAYOUTS)[number]["id"];

type StageKey = "produced" | "inTransit" | "inWarehouse" | "shipped";

const STAGES: Array<{
  key: StageKey;
  label: string;
  icon: typeof Factory;
  tone: string;
  bar: string;
  places: (view: CustomerOrderLineView) => CustomerOrderLineView["warehousePlaces"];
}> = [
    {
      key: "produced",
      label: "Производство",
      icon: Factory,
      tone: "bg-[var(--corportal-accent-amber-soft)] text-[var(--corportal-accent-amber-on-soft)]",
      bar: "bg-[var(--corportal-accent-amber-on-soft)]",
      places: (view) => view.productionPlaces,
    },
    {
      key: "inTransit",
      label: "В пути",
      icon: Truck,
      tone: "bg-zinc-100 text-zinc-700",
      bar: "bg-zinc-500",
      places: (view) => view.transitPlaces,
    },
    {
      key: "inWarehouse",
      label: "На складе",
      icon: Warehouse,
      tone: "bg-[var(--corportal-accent-violet-soft)] text-[var(--corportal-accent-violet-on-soft)]",
      bar: "bg-[var(--corportal-accent-violet-on-soft)]",
      places: (view) => view.warehousePlaces,
    },
    {
      key: "shipped",
      label: "Отгружено",
      icon: Check,
      tone: "bg-[var(--corportal-accent-teal-soft)] text-[var(--corportal-accent-teal-on-soft)]",
      bar: "bg-[var(--corportal-accent-teal-on-soft)]",
      places: () => [],
    },
  ];

const qtyOf = (view: CustomerOrderLineView, key: StageKey): number => view[key];

const PlaceChips = ({
  snapshot,
  items,
}: {
  snapshot: LogisticsSnapshot;
  items: CustomerOrderLineView["warehousePlaces"];
}) => {
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => {
        const identity = locationIdentity(snapshot, item.locationType, item.locationId);
        return (
          <span
            key={`${item.locationType}:${item.locationId}`}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--corportal-border-grey)] bg-background px-1.5 py-0.5"
            title={identity.hint ?? undefined}
          >
            <LocationLink snapshot={snapshot} locationType={item.locationType} locationId={item.locationId} />
            <span className="tabular-nums text-[11px] font-medium text-foreground">
              {formatQuantity(item.quantity)}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const QtyValue = ({
  quantity,
  unit,
  empty = "0",
}: {
  quantity: number;
  unit?: string;
  empty?: string;
}) => {
  const active = quantity > 1e-9;
  return (
    <span className={cn("tabular-nums tracking-tight", active ? "text-foreground" : "text-muted-foreground/70")}>
      {active ? formatQuantity(quantity, unit) : empty}
    </span>
  );
};

const CompositionBar = ({ view }: { view: CustomerOrderLineView }) => {
  const segments = [
    ...STAGES.map((stage) => ({
      key: stage.key,
      qty: qtyOf(view, stage.key),
      className: stage.bar,
      label: stage.label,
    })),
    {
      key: "open",
      qty: view.toReserve,
      className: "bg-foreground/12",
      label: "К резерву",
    },
  ].filter((segment) => segment.qty > 1e-9);

  return (
    <div className="space-y-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {segments.length === 0 ? <span className="h-full w-full bg-muted" /> : null}
        {segments.map((segment) => (
          <span
            key={segment.key}
            className={cn("h-full min-w-0", segment.className)}
            style={{ width: `${(segment.qty / Math.max(view.ordered, 1)) * 100}%` }}
            title={`${segment.label}: ${formatQuantity(segment.qty, view.unit)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {STAGES.map((stage) => (
          <span key={stage.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", stage.bar)} />
            {stage.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-foreground/20" />
          К резерву
        </span>
      </div>
    </div>
  );
};

const ProductHead = ({
  view,
  kicker,
}: {
  view: CustomerOrderLineView;
  kicker?: ReactNode;
}) => (
  <div className="flex min-w-0 items-start gap-3">
    <Link href={hrefForProduct(view.productId)} className="shrink-0" aria-label={view.productName}>
      <ProductPhoto src={view.imageUrl} alt={view.productName} sizes="56px" className="size-14 rounded-xl" />
    </Link>
    <div className="min-w-0">
      <Link href={hrefForProduct(view.productId)} className="text-[15px] font-medium tracking-tight text-foreground hover:underline">
        {view.productName}
      </Link>
      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{view.productCode}</p>
      {kicker}
    </div>
  </div>
);

const StageCard = ({
  snapshot,
  view,
  stage,
}: {
  snapshot: LogisticsSnapshot;
  view: CustomerOrderLineView;
  stage: (typeof STAGES)[number];
}) => {
  const quantity = qtyOf(view, stage.key);
  const places = stage.places(view);
  const active = quantity > 1e-9;
  const Icon = stage.icon;
  return (
    <div
      className={cn(
        "flex min-h-[92px] flex-col gap-2 rounded-xl px-3 py-2.5 ring-1 ring-inset",
        active ? `${stage.tone} ring-transparent` : "bg-muted/40 text-muted-foreground ring-[var(--corportal-border-grey)]",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-current/80">
        <Icon className="size-3.5" />
        {stage.label}
      </div>
      <p className="text-xl font-medium tracking-tight">
        <QtyValue quantity={quantity} unit={view.unit} />
      </p>
      {places.length > 0 ? <PlaceChips snapshot={snapshot} items={places} /> : null}
    </div>
  );
};

const OpenStrip = ({
  snapshot,
  view,
  actions,
}: {
  snapshot: LogisticsSnapshot;
  view: CustomerOrderLineView;
  actions: CustomerOrderLinesActionProps;
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--corportal-border-grey)] pt-3">
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
      <span>
        <span className="text-muted-foreground">К резерву</span>{" "}
        <span className="tabular-nums font-medium">{formatQuantity(view.toReserve, view.unit)}</span>
      </span>
      <span>
        <span className="text-muted-foreground">Свободно</span>{" "}
        <span className="tabular-nums font-medium">{formatQuantity(view.freeQty, view.unit)}</span>
      </span>
      {view.shortQty > 1e-9 ? (
        <span className="text-destructive">
          Нехватка {formatQuantity(view.shortQty, view.unit)}
        </span>
      ) : null}
      <PlaceChips snapshot={snapshot} items={view.freePlaces} />
    </div>
    <LineActions view={view} snapshot={snapshot} className="flex-row flex-wrap" {...actions} />
  </div>
);

const PipelineLayout = ({
  snapshot,
  view,
  actions,
}: {
  snapshot: LogisticsSnapshot;
  view: CustomerOrderLineView;
  actions: CustomerOrderLinesActionProps;
}) => (
  <div className="space-y-4 px-4 py-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <ProductHead
        view={view}
        kicker={
          <p className="mt-2 text-sm text-muted-foreground">
            Заказано{" "}
            <span className="tabular-nums font-medium text-foreground">{formatQuantity(view.ordered, view.unit)}</span>
            <span className="mx-1.5 text-border">·</span>
            {formatQuantity(view.shipped, view.unit)} уже у клиента
          </p>
        }
      />
      <p className="text-right text-sm tabular-nums text-muted-foreground">
        <span className="text-2xl font-medium tracking-tight text-foreground">{formatQuantity(view.shipped)}</span>
        <span className="mx-1">/</span>
        {formatQuantity(view.ordered)}
      </p>
    </div>
    <CompositionBar view={view} />
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {STAGES.map((stage) => (
        <StageCard key={stage.key} snapshot={snapshot} view={view} stage={stage} />
      ))}
    </div>
    <OpenStrip snapshot={snapshot} view={view} actions={actions} />
  </div>
);

const SplitLayout = ({
  snapshot,
  view,
  actions,
}: {
  snapshot: LogisticsSnapshot;
  view: CustomerOrderLineView;
  actions: CustomerOrderLinesActionProps;
}) => (
  <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
    <div className="space-y-4 px-4 py-4">
      <ProductHead view={view} />
      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">В этом заказе</p>
        <CompositionBar view={view} />
      </div>
      <div className="divide-y divide-[var(--corportal-border-grey)] rounded-xl ring-1 ring-[var(--corportal-border-grey)]">
        {STAGES.map((stage) => {
          const quantity = qtyOf(view, stage.key);
          const places = stage.places(view);
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="flex items-start justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("grid size-7 place-items-center rounded-lg", stage.tone)}>
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm">{stage.label}</p>
                  {places.length > 0 ? <PlaceChips snapshot={snapshot} items={places} /> : null}
                </div>
              </div>
              <p className="text-sm font-medium">
                <QtyValue quantity={quantity} unit={view.unit} />
              </p>
            </div>
          );
        })}
      </div>
    </div>
    <div className="flex flex-col gap-3 border-t border-[var(--corportal-border-grey)] bg-muted/30 px-4 py-4 lg:border-t-0 lg:border-l">
      <p className="text-xs font-medium text-muted-foreground">На складах</p>
      {view.warehouseStock.length === 0 ? (
        <p className="text-sm text-muted-foreground">На складах этого товара сейчас нет.</p>
      ) : (
        <ul className="space-y-2">
          {view.warehouseStock.map((stock) => (
            <li
              key={stock.locationId}
              className="rounded-xl bg-background px-3 py-2.5 ring-1 ring-[var(--corportal-border-grey)]"
            >
              <div className="flex items-center justify-between gap-2">
                <LocationLink snapshot={snapshot} locationType="warehouse" locationId={stock.locationId} />
                <span className="tabular-nums text-sm font-medium">
                  {formatQuantity(stock.reserved + stock.free, view.unit)}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                {stock.reserved > 1e-9 ? <span>под заказ {formatQuantity(stock.reserved, view.unit)}</span> : null}
                {stock.free > 1e-9 ? <span>свободно {formatQuantity(stock.free, view.unit)}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto space-y-2 border-t border-[var(--corportal-border-grey)] pt-3">
        <p className="text-sm">
          <span className="text-muted-foreground">К резерву</span>{" "}
          <span className="tabular-nums font-medium">{formatQuantity(view.toReserve, view.unit)}</span>
          {view.shortQty > 1e-9 ? (
            <span className="ml-2 text-destructive">нехватка {formatQuantity(view.shortQty, view.unit)}</span>
          ) : null}
        </p>
        <LineActions view={view} snapshot={snapshot} className="flex-row flex-wrap" {...actions} />
      </div>
    </div>
  </div>
);

const UnitMosaic = ({ view }: { view: CustomerOrderLineView }) => {
  if (view.ordered > 24 || view.ordered <= 0) {
    return <CompositionBar view={view} />;
  }
  const cells: Array<StageKey | "open"> = [];
  for (const stage of STAGES) {
    const count = Math.round(qtyOf(view, stage.key));
    for (let index = 0; index < count; index += 1) {
      cells.push(stage.key);
    }
  }
  while (cells.length < Math.round(view.ordered)) {
    cells.push("open");
  }
  return (
    <div className="flex flex-wrap gap-1">
      {cells.map((key, index) => {
        const stage = STAGES.find((item) => item.key === key);
        return (
          <span
            key={`${key}-${index}`}
            title={stage?.label ?? "К резерву"}
            className={cn("size-4 rounded-[5px]", stage ? stage.bar : "bg-transparent ring-1 ring-inset ring-foreground/20")}
          />
        );
      })}
    </div>
  );
};

const TilesLayout = ({
  snapshot,
  view,
  actions,
}: {
  snapshot: LogisticsSnapshot;
  view: CustomerOrderLineView;
  actions: CustomerOrderLinesActionProps;
}) => (
  <div className="space-y-4 px-4 py-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <ProductHead view={view} />
      <div className="max-w-xs space-y-2">
        <UnitMosaic view={view} />
        <p className="text-xs text-muted-foreground">
          Каждая клетка — 1 {view.unit === "pcs" ? "шт" : view.unit ?? "ед."} из заказа
        </p>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {STAGES.map((stage) => {
        const quantity = qtyOf(view, stage.key);
        const Icon = stage.icon;
        const places = stage.places(view);
        return (
          <div key={stage.key} className="rounded-2xl bg-muted/40 px-3 py-3">
            <div className="flex items-center justify-between gap-2 text-muted-foreground">
              <span className="text-xs font-medium">{stage.label}</span>
              <Icon className="size-3.5" />
            </div>
            <p className="mt-2 text-[28px] leading-none font-medium tracking-tight">
              <QtyValue quantity={quantity} unit={view.unit} />
            </p>
            {places.length > 0 ? (
              <div className="mt-2">
                <PlaceChips snapshot={snapshot} items={places} />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
    {view.warehouseStock.length > 0 ? (
      <div className="rounded-xl bg-muted/30 px-3 py-2.5">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Склады</p>
        <div className="flex flex-wrap gap-2">
          {view.warehouseStock.map((stock) => (
            <span
              key={stock.locationId}
              className="inline-flex items-center gap-2 rounded-full bg-background px-2.5 py-1 ring-1 ring-[var(--corportal-border-grey)]"
            >
              <LocationLink snapshot={snapshot} locationType="warehouse" locationId={stock.locationId} />
              {stock.reserved > 1e-9 ? (
                <span className="text-xs text-[var(--corportal-accent-violet-on-soft)]">
                  под заказ {formatQuantity(stock.reserved)}
                </span>
              ) : null}
              {stock.free > 1e-9 ? (
                <span className="text-xs text-muted-foreground">свободно {formatQuantity(stock.free)}</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    ) : null}
    <OpenStrip snapshot={snapshot} view={view} actions={actions} />
  </div>
);

export const CustomerOrderLinesBlock = ({
  snapshot,
  balances,
  lines,
  canAct,
  onReserve,
  onShip,
  onRelease,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  lines: CustomerOrderLine[];
  canAct: boolean;
} & CustomerOrderLinesActionProps) => {
  const [layout, setLayout] = useState<LayoutId>("pipeline");
  const views = useMemo(
    () => lines.map((line) => buildCustomerOrderLineView(snapshot, balances, line, canAct)),
    [balances, canAct, lines, snapshot],
  );
  const actions = { onReserve, onShip, onRelease };
  const activeHint = LAYOUTS.find((item) => item.id === layout)?.hint;
  const title = lines.length > 0 ? `Товары · ${lines.length}` : "Товары";

  if (layout === "table") {
    return (
      <CustomerOrderLinesTable
        snapshot={snapshot}
        balances={balances}
        lines={lines}
        canAct={canAct}
        action={<LayoutSwitch layout={layout} onChange={setLayout} />}
        {...actions}
      />
    );
  }

  return (
    <Card size="sm" className={cn(logisticsCardClass, "gap-0 py-0")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--corportal-border-grey)] px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <LayoutSwitch layout={layout} onChange={setLayout} />
      </div>
      {activeHint ? (
        <p className="border-b border-[var(--corportal-border-grey)] px-4 py-2 text-xs text-muted-foreground">
          {activeHint}
        </p>
      ) : null}
      {views.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">В этом заказе клиента нет товаров.</p>
      ) : (
        <div className="divide-y divide-[var(--corportal-border-grey)]">
          {views.map((view) => (
            <div key={view.line.id}>
              {layout === "pipeline" ? (
                <PipelineLayout snapshot={snapshot} view={view} actions={actions} />
              ) : null}
              {layout === "split" ? (
                <SplitLayout snapshot={snapshot} view={view} actions={actions} />
              ) : null}
              {layout === "tiles" ? (
                <TilesLayout snapshot={snapshot} view={view} actions={actions} />
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const LayoutSwitch = ({
  layout,
  onChange,
}: {
  layout: LayoutId;
  onChange: (layout: LayoutId) => void;
}) => (
  <div className="flex flex-wrap gap-1" role="tablist" aria-label="Макет блока товаров">
    {LAYOUTS.map((item) => (
      <HomeFilterChip
        key={item.id}
        size="xs"
        active={layout === item.id}
        role="tab"
        aria-selected={layout === item.id}
        onClick={() => onChange(item.id)}
      >
        {item.label}
      </HomeFilterChip>
    ))}
  </div>
);
