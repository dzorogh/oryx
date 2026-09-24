// english-ui:ignore-file
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  buildCategoryTree,
  buildOwnerSet,
  computeMonthRange,
  currentYearMonth,
  formatOutputDate,
  formatYearMonthLabel,
  monthCell,
  noDateCell,
  openOrdersForProduct,
  plantCodesForProduct,
  pluralTovar,
  productCode,
  productVisibleForPlant,
  STATUS_RU,
  stockQuantity,
  ymKey,
  type CategoryTreeNode,
  type OutputCalendarOpenOrder,
  type OutputCalendarOutputLine,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage,
  type OutputCalendarProduct,
  type YearMonth,
} from "@/features/logistics/output-calendar";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Fragment, useMemo } from "react";

export type CreateDialogTarget =
  | {
      kind: "existing";
      product: OutputCalendarProduct;
      order: OutputCalendarOpenOrder;
      month: YearMonth;
    }
  | {
      kind: "new";
      product: OutputCalendarProduct;
      month: YearMonth;
    };

type OutputCalendarMatrixProps = {
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onCreate: (target: CreateDialogTarget) => void;
};

const IDENTITY_HEAD =
  "sticky left-0 z-30 min-w-[200px] max-w-[240px] bg-zinc-50 px-2 py-1.5 text-left text-[11px] font-medium text-zinc-700";
const IDENTITY_CELL = "sticky left-0 z-10 min-w-[200px] max-w-[240px] bg-background px-2 py-1.5";
const QTY_HEAD = "min-w-14 px-2 py-1.5 text-right text-[11px] font-medium text-zinc-700";
const QTY_CELL = "min-w-14 px-2 py-1 text-right text-xs tabular-nums";

const CellPopover = ({
  lines,
  quantity,
  unit,
  hasFresh,
}: {
  lines: OutputCalendarOutputLine[];
  quantity: number;
  unit: string;
  hasFresh: boolean;
}) => {
  if (quantity <= 0 || lines.length === 0) {
    return null;
  }
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "cursor-pointer tabular-nums",
          hasFresh && "border-b border-dashed border-muted-foreground after:ml-0.5 after:inline-block after:size-1.5 after:rounded-full after:bg-blue-600 after:align-middle after:content-['']",
        )}
      >
        {formatQuantity(quantity, unit)}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] gap-1 p-2.5 text-xs">
        <h4 className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Состав ячейки
        </h4>
        {lines.map((line) => (
          <div key={`${line.outputId}-${line.ownerId}`} className="py-0.5 text-zinc-700">
            {line.outputNumber} · {line.productionOrderNumber} ·{" "}
            {formatLogisticsCode("plant", line.plantId)} · {formatOutputDate(line.expectedEndOn)} ·{" "}
            {STATUS_RU[line.status]} · {formatQuantity(line.quantity, unit)}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const MonthCell = ({
  product,
  ym,
  current,
  isPast,
  cell,
  showPlus,
  openOrders,
  onCreate,
}: {
  product: OutputCalendarProduct;
  ym: YearMonth;
  current: boolean;
  isPast: boolean;
  cell: { quantity: number; lines: OutputCalendarOutputLine[]; hasFresh: boolean };
  showPlus: boolean;
  openOrders: OutputCalendarOpenOrder[];
  onCreate: (target: CreateDialogTarget) => void;
}) => {
  const overdue = isPast && cell.quantity > 0;
  return (
    <td
      className={cn(
        QTY_CELL,
        "border-b border-r border-border relative group",
        current && "bg-zinc-50",
        overdue && "bg-red-50 font-medium text-red-700",
        cell.hasFresh && "animate-[flashPulse_2s_ease-out]",
      )}
    >
      <div className="relative flex min-h-[22px] items-center justify-end gap-1">
        {showPlus ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex size-4 shrink-0 items-center justify-center rounded-[3px] bg-zinc-800 text-white opacity-0 group-hover:opacity-100 hover:bg-zinc-900 focus-visible:opacity-100 aria-expanded:opacity-100"
                  aria-label="Создать выпуск"
                />
              }
            >
              <Plus className="size-3" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[260px] max-w-[340px]">
              {openOrders.map((order) => (
                <DropdownMenuItem
                  key={order.productionOrderId}
                  onClick={() => onCreate({ kind: "existing", product, order, month: ym })}
                >
                  Выпуск по {order.number} — осталось разложить {formatQuantity(order.remaining, product.unit)}
                </DropdownMenuItem>
              ))}
              {openOrders.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => onCreate({ kind: "new", product, month: ym })}>
                Новый заказ на производство…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <CellPopover
          lines={cell.lines}
          quantity={cell.quantity}
          unit={product.unit}
          hasFresh={cell.hasFresh}
        />
      </div>
    </td>
  );
};

const ProductRow = ({
  product,
  depth,
  months,
  currentYm,
  ownerSet,
  plantId,
  page,
  onCreate,
}: {
  product: OutputCalendarProduct;
  depth: number;
  months: YearMonth[];
  currentYm: YearMonth;
  ownerSet: Set<string>;
  plantId: string | null;
  page: OutputCalendarPage;
  onCreate: (target: CreateDialogTarget) => void;
}) => {
  const stock = stockQuantity(product.id, page.stock, ownerSet);
  const plants = plantCodesForProduct(product.id, page.outputLines);
  const orders = openOrdersForProduct(product.id, page.openOrders);
  const noDate = noDateCell(product.id, page.outputLines, ownerSet, plantId);
  const pad = 8 + depth * 14 + 20;

  return (
    <tr className="hover:bg-transparent">
      <td className={cn(IDENTITY_CELL, "border-b border-r border-border")} style={{ paddingLeft: pad }}>
        <span className="block max-w-[200px] truncate font-medium" title={product.name}>
          {product.name}
        </span>
        <span className="text-[11px] text-muted-foreground">{productCode(product.id)}</span>
      </td>
      <td className="border-b border-r border-border px-2 py-1 text-xs text-muted-foreground tabular-nums">
        {plants.length ? plants.join(", ") : "—"}
      </td>
      <td className={cn(QTY_CELL, "border-b border-r border-border")}>
        {stock !== 0 ? formatQuantity(stock, product.unit) : ""}
      </td>
      {months.map((ym) => {
        const cell = monthCell(product.id, ym, page.outputLines, ownerSet, plantId);
        const curKey = ymKey(currentYm);
        const key = ymKey(ym);
        return (
          <MonthCell
            key={`${product.id}-${key}`}
            product={product}
            ym={ym}
            current={key === curKey}
            isPast={key < curKey}
            cell={cell}
            showPlus={key >= curKey}
            openOrders={orders}
            onCreate={onCreate}
          />
        );
      })}
      <td
        className={cn(
          QTY_CELL,
          "border-b border-border",
          noDate.hasFresh && "animate-[flashPulse_2s_ease-out]",
        )}
      >
        <CellPopover
          lines={noDate.lines}
          quantity={noDate.quantity}
          unit={product.unit}
          hasFresh={noDate.hasFresh}
        />
      </td>
    </tr>
  );
};

const GroupRows = ({
  node,
  months,
  currentYm,
  ownerSet,
  plantId,
  page,
  collapsed,
  onToggleCollapse,
  onCreate,
}: {
  node: CategoryTreeNode;
  months: YearMonth[];
  currentYm: YearMonth;
  ownerSet: Set<string>;
  plantId: string | null;
  page: OutputCalendarPage;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onCreate: (target: CreateDialogTarget) => void;
}) => {
  const isCollapsed = collapsed.has(node.id);
  const colSpan = 3 + months.length + 1;
  return (
    <Fragment>
      <tr
        className="cursor-pointer select-none hover:bg-transparent"
        onClick={() => onToggleCollapse(node.id)}
      >
        <td
          className={cn(IDENTITY_CELL, "border-b border-r border-border bg-zinc-50 font-semibold")}
          style={{ paddingLeft: 8 + node.depth * 14 }}
          colSpan={1}
        >
          <button
            type="button"
            aria-expanded={!isCollapsed}
            className="inline-flex items-center gap-1"
            onClick={(event) => {
              event.stopPropagation();
              onToggleCollapse(node.id);
            }}
          >
            {isCollapsed ? (
              <ChevronRight className="size-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-3 text-muted-foreground" />
            )}
            {node.name}
            <span className="font-normal text-muted-foreground">
              · {pluralTovar(node.productCount)}
            </span>
          </button>
        </td>
        <td className="border-b border-r border-border bg-zinc-50" colSpan={colSpan - 1} />
      </tr>
      {!isCollapsed ? (
        <>
          {node.products.map((product) => (
            <ProductRow
              key={`${node.id}-${product.id}`}
              product={product}
              depth={node.depth}
              months={months}
              currentYm={currentYm}
              ownerSet={ownerSet}
              plantId={plantId}
              page={page}
              onCreate={onCreate}
            />
          ))}
          {node.children.map((child) => (
            <GroupRows
              key={child.id}
              node={child}
              months={months}
              currentYm={currentYm}
              ownerSet={ownerSet}
              plantId={plantId}
              page={page}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              onCreate={onCreate}
            />
          ))}
        </>
      ) : null}
    </Fragment>
  );
};

export const OutputCalendarMatrix = ({
  page,
  filter,
  plantId,
  collapsed,
  onToggleCollapse,
  onCreate,
}: OutputCalendarMatrixProps) => {
  const currentYm = currentYearMonth();
  const ownerSet = useMemo(() => buildOwnerSet(filter, page), [filter, page]);
  const months = useMemo(
    () => computeMonthRange(page.outputLines),
    [page.outputLines],
  );
  const visibleIds = useMemo(() => {
    const set = new Set<string>();
    for (const product of page.products) {
      if (productVisibleForPlant(product.id, page.outputLines, plantId)) {
        set.add(product.id);
      }
    }
    return set;
  }, [page.products, page.outputLines, plantId]);
  const { roots, uncategorized } = useMemo(
    () => buildCategoryTree(page.categories, page.products, visibleIds),
    [page.categories, page.products, visibleIds],
  );
  const curKey = ymKey(currentYm);

  return (
    <div className="max-h-[calc(100vh-180px)] overflow-auto rounded-md border border-border bg-background">
      <style>{`@keyframes flashPulse{0%{box-shadow:inset 0 0 0 2px #2563eb}100%{box-shadow:inset 0 0 0 0 transparent}}`}</style>
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
        <thead>
          <tr>
            <th className={cn(IDENTITY_HEAD, "sticky top-0 border-b border-r border-border")}>Товар</th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50 text-left")}>
              Код завода
            </th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50")}>Остаток</th>
            {months.map((ym) => {
              const key = ymKey(ym);
              return (
                <th
                  key={key}
                  className={cn(
                    QTY_HEAD,
                    "sticky top-0 z-20 border-b border-r border-border bg-zinc-50",
                    key === curKey && "bg-zinc-100",
                  )}
                >
                  {formatYearMonthLabel(ym)}
                </th>
              );
            })}
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-border bg-zinc-50")}>Без срока</th>
          </tr>
        </thead>
        <tbody>
          {roots.map((node) => (
            <GroupRows
              key={node.id}
              node={node}
              months={months}
              currentYm={currentYm}
              ownerSet={ownerSet}
              plantId={plantId}
              page={page}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              onCreate={onCreate}
            />
          ))}
          {uncategorized.length > 0 ? (
            <GroupRows
              node={{
                id: "__uncategorized",
                name: "Без категории",
                depth: 0,
                productCount: uncategorized.length,
                products: uncategorized,
                children: [],
              }}
              months={months}
              currentYm={currentYm}
              ownerSet={ownerSet}
              plantId={plantId}
              page={page}
              collapsed={collapsed}
              onToggleCollapse={onToggleCollapse}
              onCreate={onCreate}
            />
          ) : null}
        </tbody>
      </table>
      {visibleIds.size === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Нет товаров для отображения</p>
      ) : null}
    </div>
  );
};
