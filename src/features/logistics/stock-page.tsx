// english-ui:ignore-file
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { computeStockBalances, summarizeProductStock } from "@/features/logistics/logistics-balances";
import { formatQuantity, LOCATION_LABELS, STOCK_STATE_LABELS } from "@/features/logistics/logistics-labels";
import { customerOrderById, productById } from "@/features/logistics/logistics-lookups";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import {
  defaultStockViewFilter,
  isDefaultStockViewFilter,
  matchesProductQuery,
  parseStockPlace,
  parseStockViewFilter,
  serializeStockPlace,
  stockHref,
  type StockViewFilter,
} from "@/features/logistics/stock-filters";
import type { LocationType, StockState } from "@/features/logistics/logistics-types";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const STATE_FILTERS: Array<{ id: "all" | StockState; label: string }> = [
  { id: "all", label: "Все" },
  { id: "free", label: STOCK_STATE_LABELS.free },
  { id: "reserved", label: STOCK_STATE_LABELS.reserved },
  { id: "shipped", label: STOCK_STATE_LABELS.shipped },
];

const OTHER_PLACE_FILTERS: Array<{ id: LocationType; label: string }> = [
  { id: "production_order_line", label: LOCATION_LABELS.production_order_line },
  { id: "transfer", label: LOCATION_LABELS.transfer },
  { id: "customer_order", label: LOCATION_LABELS.customer_order },
];

const TYPE_COLUMNS: Array<{ id: LocationType; header: string }> = [
  { id: "warehouse", header: "Склады" },
  { id: "production_order_line", header: LOCATION_LABELS.production_order_line },
  { id: "transfer", header: LOCATION_LABELS.transfer },
  { id: "customer_order", header: LOCATION_LABELS.customer_order },
];

const qtyClass = (quantity: number) =>
  quantity === 0 ? "text-muted-foreground" : "font-medium text-foreground";

const TypeQty = ({
  items,
  unit,
  showSplit,
}: {
  items: Array<{ quantity: number; free: number; reserved: number; shipped: number }>;
  unit?: string;
  showSplit: boolean;
}) => {
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  if (total === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const parts = showSplit
    ? [
        items.reduce((sum, item) => sum + item.free, 0),
        items.reduce((sum, item) => sum + item.reserved, 0),
        items.reduce((sum, item) => sum + item.shipped, 0),
      ]
    : null;
  const split =
    parts == null
      ? []
      : [
          parts[0] > 0 ? `свободно ${formatQuantity(parts[0])}` : null,
          parts[1] > 0 ? `занято ${formatQuantity(parts[1])}` : null,
          parts[2] > 0 ? `у клиента ${formatQuantity(parts[2])}` : null,
        ].filter(Boolean);

  return (
    <div className="flex flex-col gap-0.5">
      <span className={`tabular-nums ${qtyClass(total)}`}>{formatQuantity(total, unit)}</span>
      {split.length > 0 ? <span className="text-xs text-muted-foreground">{split.join(" · ")}</span> : null}
    </div>
  );
};

const StockPageContent = () => {
  const { snapshot, isLoading, error } = useLogisticsStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filters, setFilters] = useState(() => parseStockViewFilter(searchParams));
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    const fromUrl = parseStockViewFilter(searchParams);
    if (stockHref(fromUrl) !== stockHref(filtersRef.current)) {
      filtersRef.current = fromUrl;
      setFilters(fromUrl);
    }
  }, [searchParams]);

  const replaceFilters = (next: StockViewFilter) => {
    filtersRef.current = next;
    setFilters(next);
    router.replace(stockHref(next), { scroll: false });
  };

  const updateFilters = (patch: Partial<StockViewFilter>) => {
    replaceFilters({ ...filtersRef.current, ...patch });
  };

  const warehouses = useMemo(
    () => [...snapshot.warehouses].sort((left, right) => left.code.localeCompare(right.code, "en")),
    [snapshot.warehouses],
  );

  const balances = useMemo(() => computeStockBalances(snapshot.transactions), [snapshot.transactions]);

  const orderOptions = useMemo(() => {
    const ids = new Set(
      balances
        .filter((entry) => entry.ownerType === "order" && entry.ownerId && Math.abs(entry.quantity) > 1e-9)
        .map((entry) => entry.ownerId as string),
    );
    if (filters.orderId) {
      ids.add(filters.orderId);
    }
    return [...ids]
      .map((id) => customerOrderById(snapshot, id))
      .filter((order): order is NonNullable<typeof order> => Boolean(order))
      .sort((left, right) => left.number.localeCompare(right.number, "ru"));
  }, [balances, filters.orderId, snapshot]);

  const summaries = useMemo(
    () =>
      summarizeProductStock(balances, {
        place: filters.place,
        stockState: filters.state,
        customerOrderId: filters.orderId,
      }),
    [balances, filters.orderId, filters.place, filters.state],
  );

  const rows = useMemo(
    () =>
      summaries
        .map((row) => ({
          ...row,
          product: productById(snapshot, row.productId),
        }))
        .filter((row) => matchesProductQuery(row.product, filters.query, row.productId))
        .sort((left, right) =>
          (left.product?.name ?? left.productId).localeCompare(right.product?.name ?? right.productId, "ru"),
        ),
    [filters.query, snapshot, summaries],
  );

  const visibleColumns = useMemo(() => {
    if (filters.place.kind === "warehouse") {
      return TYPE_COLUMNS.filter((column) => column.id === "warehouse");
    }
    if (filters.place.kind === "locationType") {
      const locationType = filters.place.locationType;
      return TYPE_COLUMNS.filter((column) => column.id === locationType);
    }
    const present = TYPE_COLUMNS.filter((column) =>
      rows.some((row) => Math.abs(row.byType[column.id]) > 1e-9),
    );
    return present.length > 0 ? present : TYPE_COLUMNS;
  }, [filters.place, rows]);

  const placeItems = useMemo(
    () => [
      { value: "all", label: "Все места" },
      ...warehouses.map((warehouse) => ({ value: `warehouse:${warehouse.id}`, label: warehouse.code })),
      ...OTHER_PLACE_FILTERS.map((item) => ({ value: item.id, label: item.label })),
    ],
    [warehouses],
  );

  const orderItems = useMemo(
    () => [
      { value: "all", label: "Все заказы клиента" },
      ...orderOptions.map((order) => ({ value: order.id, label: order.number })),
    ],
    [orderOptions],
  );

  const hasActiveFilters = !isDefaultStockViewFilter(filters);
  const emptyMessage = hasActiveFilters
    ? "Нет остатков по выбранным фильтрам."
    : "Остатков нет. Проведите документ, чтобы появились первые записи журнала.";

  return (
    <LogisticsPageShell crumbs={[{ label: "Остатки" }]}>
      <LogisticsToolbar
        title="Остатки"
        description="Сводка по товару: итог и количество по типу места. Места и документы — в фильтрах и карточке товара."
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Состояние остатка">
            {STATE_FILTERS.map((item) => (
              <HomeFilterChip
                key={item.id}
                active={filters.state === item.id}
                role="tab"
                aria-selected={filters.state === item.id}
                onClick={() => updateFilters({ state: item.id })}
              >
                {item.label}
              </HomeFilterChip>
            ))}
          </div>
          {hasActiveFilters ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => replaceFilters(defaultStockViewFilter())}
              className="ml-auto gap-1 text-muted-foreground"
              aria-label="Сбросить фильтры"
            >
              <X aria-hidden className="size-3.5" />
              Сбросить
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Поиск по названию или артикулу</span>
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Поиск по названию или артикулу"
                className="pl-8"
                aria-label="Поиск по названию или артикулу"
              />
            </div>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={placeItems}
              value={serializeStockPlace(filters.place)}
              onValueChange={(value) => updateFilters({ place: parseStockPlace(value) })}
            >
              <SelectTrigger size="sm" className="w-full bg-background sm:w-[14rem]" aria-label="Фильтр по месту">
                <SelectValue placeholder="Все места" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value="all">Все места</SelectItem>
                </SelectGroup>
                {warehouses.length > 0 ? (
                  <SelectGroup>
                    <SelectLabel>Склады</SelectLabel>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={`warehouse:${warehouse.id}`}>
                        {warehouse.code}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ) : null}
                <SelectGroup>
                  <SelectLabel>Другие места</SelectLabel>
                  {OTHER_PLACE_FILTERS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              items={orderItems}
              value={filters.orderId ?? "all"}
              onValueChange={(value) => updateFilters({ orderId: !value || value === "all" ? null : value })}
            >
              <SelectTrigger size="sm" className="w-full bg-background sm:w-[10.5rem]" aria-label="Фильтр по заказу клиента">
                <SelectValue placeholder="Все заказы клиента" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value="all">Все заказы клиента</SelectItem>
                  {orderOptions.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.number}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </LogisticsToolbar>

      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}

      {!isLoading && !error ? (
        <LogisticsTableCard
          title={rows.length > 0 || hasActiveFilters ? `Товары · ${rows.length}` : undefined}
          headers={["Товар", "Всего", ...visibleColumns.map((column) => column.header)]}
          isEmpty={rows.length === 0}
          empty={emptyMessage}
        >
          {rows.map((row) => (
            <TableRow key={row.productId}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={row.productId} />
              </TableCell>
              <TableCell className={`px-3 py-2 text-sm tabular-nums ${qtyClass(row.total)}`}>
                {formatQuantity(row.total, row.product?.unit)}
              </TableCell>
              {visibleColumns.map((column) => (
                <TableCell key={column.id} className="px-3 py-2 text-sm">
                  <TypeQty
                    unit={row.product?.unit}
                    showSplit={filters.state === "all"}
                    items={row.locations.filter((item) => item.locationType === column.id)}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}
    </LogisticsPageShell>
  );
};

export const StockPage = () => (
  <Suspense
    fallback={
      <LogisticsPageShell crumbs={[{ label: "Остатки" }]}>
        <LogisticsLoading />
      </LogisticsPageShell>
    }
  >
    <StockPageContent />
  </Suspense>
);
