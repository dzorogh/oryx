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
  descendantCategoryIds,
  UNCATEGORIZED_GROUP_ID,
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
  resolveOwner,
  STATUS_RU,
  stockBreakdown,
  stockQuantity,
  unassignedCell,
  ymKey,
  type CalendarOwner,
  type CategoryTreeNode,
  type StockBreakdownRow,
  type OutputCalendarOpenOrder,
  type OutputCalendarOutputLine,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage,
  type OutputCalendarProduct,
  type YearMonth,
} from "@/features/logistics/output-calendar";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

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
  onSetCollapsed: (ids: string[], collapsed: boolean) => void;
  onCreate: (target: CreateDialogTarget) => void;
};

const IDENTITY_HEAD =
  "sticky left-0 z-30 min-w-[200px] max-w-[240px] bg-zinc-50 px-2 py-1.5 text-left text-[11px] font-medium text-zinc-700";
const IDENTITY_CELL = "sticky left-0 z-10 min-w-[200px] max-w-[240px] bg-background px-2 py-1.5";
const QTY_HEAD = "min-w-14 px-2 py-1.5 text-right text-[11px] font-medium text-zinc-700";
const QTY_CELL = "min-w-14 px-2 py-1 text-right text-xs tabular-nums";

const EntityLink = ({ href, children }: { href: string | null; children: string }) =>
  href ? <LogisticsCodeBadge code={children} href={href} /> : <span className="font-medium">{children}</span>;

const NameLink = ({ href, children }: { href: string; children: string }) => (
  <Link
    href={href}
    className="underline decoration-muted-foreground/50 decoration-dotted underline-offset-4 hover:decoration-foreground"
  >
    {children}
  </Link>
);

const HoverBreakdown = ({
  title,
  subtitle,
  quantity,
  unit,
  hasFresh = false,
  children,
}: {
  title: string;
  subtitle: string;
  quantity: number;
  unit: string;
  hasFresh?: boolean;
  children: ReactNode;
}) => (
  <Popover>
    <PopoverTrigger
      openOnHover
      delay={150}
      closeDelay={150}
      className="flex min-h-[22px] flex-1 cursor-default items-center justify-end tabular-nums"
    >
      <span
        className={cn(
          hasFresh &&
            "border-b border-dashed border-muted-foreground after:ml-0.5 after:inline-block after:size-1.5 after:rounded-full after:bg-blue-600 after:align-middle after:content-['']",
        )}
      >
        {formatQuantity(quantity, unit)}
      </span>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[380px] gap-0 p-0 text-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className="shrink-0 text-base font-semibold tabular-nums">{formatQuantity(quantity, unit)}</div>
      </div>
      <div className="max-h-[60vh] divide-y divide-border overflow-y-auto">{children}</div>
    </PopoverContent>
  </Popover>
);

const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0">{children}</dd>
  </>
);

const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const CellPopover = ({
  page,
  title,
  productName,
  lines,
  quantity,
  unit,
  hasFresh,
}: {
  page: OutputCalendarPage;
  title: string;
  productName: string;
  lines: OutputCalendarOutputLine[];
  quantity: number;
  unit: string;
  hasFresh: boolean;
}) => {
  if (quantity <= 0 || lines.length === 0) {
    return null;
  }
  const outputs = new Map<string, OutputCalendarOutputLine[]>();
  for (const line of lines) {
    outputs.set(line.outputId, [...(outputs.get(line.outputId) ?? []), line]);
  }
  const today = todayIso();
  return (
    <HoverBreakdown title={title} subtitle={productName} quantity={quantity} unit={unit} hasFresh={hasFresh}>
      {[...outputs.values()].map((group) => {
        const first = group[0];
        const total = group.reduce((sum, line) => sum + line.quantity, 0);
        const overdue = first.expectedEndOn != null && first.expectedEndOn < today;
        return (
          <section key={first.outputId} className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <EntityLink href={first.outputSequence ? logisticsPath("outputs", first.outputSequence) : null}>
                  {first.outputNumber}
                </EntityLink>
                <StatusPill status={first.status} label={STATUS_RU[first.status]} />
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatQuantity(total, unit)}</span>
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <DetailRow label="Заказ">
                <EntityLink
                  href={
                    first.productionOrderSequence
                      ? logisticsPath("production-orders", first.productionOrderSequence)
                      : null
                  }
                >
                  {first.productionOrderNumber}
                </EntityLink>
              </DetailRow>
              <DetailRow label="Завод">
                <EntityLink href={logisticsPath("plants", first.plantId)}>
                  {formatLogisticsCode("plant", first.plantId)}
                </EntityLink>
              </DetailRow>
              <DetailRow label="Срок">
                <span className={cn(overdue && "font-medium text-red-700")}>
                  {formatOutputDate(first.expectedEndOn)}
                  {overdue ? " · просрочен" : ""}
                </span>
              </DetailRow>
              <DetailRow label="Для кого">
                {group.length === 1 ? (
                  <OwnerLabel owner={resolveOwner(first.ownerId, page)} />
                ) : (
                  <ul className="space-y-0.5">
                    {group.map((line) => (
                      <li key={line.ownerId} className="flex justify-between gap-3">
                        <OwnerLabel owner={resolveOwner(line.ownerId, page)} />
                        <span className="tabular-nums text-muted-foreground">
                          {formatQuantity(line.quantity, unit)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DetailRow>
            </dl>
          </section>
        );
      })}
    </HoverBreakdown>
  );
};

const StockLocation = ({ row }: { row: StockBreakdownRow }) =>
  row.locationKind === "transfer" ? (
    <EntityLink href={row.locationSequence ? logisticsPath("transfers", row.locationSequence) : null}>
      {formatLogisticsCode("transfer", row.locationSequence ?? row.locationId)}
    </EntityLink>
  ) : (
    <EntityLink href={logisticsPath("warehouses", row.locationId)}>
      {formatLogisticsCode("warehouse", row.locationId)}
    </EntityLink>
  );

const OwnerLabel = ({ owner }: { owner: CalendarOwner }) => {
  switch (owner.kind) {
    case "free":
      return <span>Свободно</span>;
    case "region":
      return <NameLink href={logisticsPath("regions", owner.region.id)}>{owner.region.name}</NameLink>;
    case "order":
      return (
        <EntityLink href={logisticsPath("customer-orders", owner.order.sequenceNumber)}>
          {owner.order.number}
        </EntityLink>
      );
    default:
      return <span>Резерв</span>;
  }
};

const StockPopover = ({
  productName,
  rows,
  quantity,
  unit,
}: {
  productName: string;
  rows: StockBreakdownRow[];
  quantity: number;
  unit: string;
}) => {
  if (quantity === 0 || rows.length === 0) {
    return null;
  }
  const locations = new Map<string, StockBreakdownRow[]>();
  for (const row of rows) {
    const key = `${row.locationKind}-${row.locationId}`;
    locations.set(key, [...(locations.get(key) ?? []), row]);
  }
  const groups = [...locations.entries()]
    .map(([key, group]) => ({ key, group, total: group.reduce((sum, row) => sum + row.quantity, 0) }))
    .sort((a, b) => b.total - a.total);
  return (
    <HoverBreakdown title="Остаток" subtitle={productName} quantity={quantity} unit={unit}>
      {groups.map(({ key, group, total }) => (
        <section key={key} className="px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StockLocation row={group[0]} />
              <span className="text-xs text-muted-foreground">
                {group[0].locationKind === "transfer" ? "в пути" : "склад"}
              </span>
            </div>
            <span className="font-semibold tabular-nums">{formatQuantity(total, unit)}</span>
          </div>
          <ul className="mt-1 space-y-0.5 pl-3">
            {group.map((row) => (
              <li key={row.ownerId} className="flex justify-between gap-3">
                <OwnerLabel owner={row.owner} />
                <span className="tabular-nums text-muted-foreground">{formatQuantity(row.quantity, unit)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </HoverBreakdown>
  );
};

const UnassignedPopover = ({
  productName,
  orders,
  quantity,
  unit,
}: {
  productName: string;
  orders: OutputCalendarOpenOrder[];
  quantity: number;
  unit: string;
}) => {
  if (quantity <= 0 || orders.length === 0) {
    return null;
  }
  return (
    <HoverBreakdown title="Не распределено по выпускам" subtitle={productName} quantity={quantity} unit={unit}>
      {orders.map((order) => (
        <section key={order.productionOrderId} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <EntityLink href={logisticsPath("production-orders", order.sequenceNumber)}>{order.number}</EntityLink>
            <EntityLink href={logisticsPath("plants", order.plantId)}>
              {formatLogisticsCode("plant", order.plantId)}
            </EntityLink>
          </div>
          <span className="font-semibold tabular-nums">{formatQuantity(order.remaining, unit)}</span>
        </section>
      ))}
    </HoverBreakdown>
  );
};

const MonthCell = ({
  page,
  product,
  ym,
  current,
  isPast,
  cell,
  showPlus,
  openOrders,
  onCreate,
}: {
  page: OutputCalendarPage;
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
          page={page}
          title={`Приход · ${formatYearMonthLabel(ym)}`}
          productName={product.name}
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
  const unassigned = unassignedCell(product.id, page.openOrders, plantId);
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
        <div className="flex">
          <StockPopover
            productName={product.name}
            rows={stockBreakdown(product.id, page, ownerSet)}
            quantity={stock}
            unit={product.unit}
          />
        </div>
      </td>
      <td className={cn(QTY_CELL, "border-b border-r border-border")}>
        <div className="flex">
          <UnassignedPopover
            productName={product.name}
            orders={unassigned.orders}
            quantity={unassigned.quantity}
            unit={product.unit}
          />
        </div>
      </td>
      <td
        className={cn(
          QTY_CELL,
          "border-b border-r border-border",
          noDate.hasFresh && "animate-[flashPulse_2s_ease-out]",
        )}
      >
        <div className="flex">
          <CellPopover
            page={page}
            title="Приход без срока"
            productName={product.name}
            lines={noDate.lines}
            quantity={noDate.quantity}
            unit={product.unit}
            hasFresh={noDate.hasFresh}
          />
        </div>
      </td>
      {months.map((ym) => {
        const cell = monthCell(product.id, ym, page.outputLines, ownerSet, plantId);
        const curKey = ymKey(currentYm);
        const key = ymKey(ym);
        return (
          <MonthCell
            key={`${product.id}-${key}`}
            page={page}
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
    </tr>
  );
};

const GROUP_ROW_HEIGHT = 32;

/** Nested category rows stack under the sticky header, one row per level. */
const groupStickyTop = (depth: number) => `calc(var(--calendar-head-h, 0px) + ${depth * GROUP_ROW_HEIGHT}px)`;

const GroupRows = ({
  node,
  months,
  currentYm,
  ownerSet,
  plantId,
  page,
  collapsed,
  onToggleCollapse,
  onSetCollapsed,
  onCreate,
  stickyIds,
}: {
  node: CategoryTreeNode;
  months: YearMonth[];
  currentYm: YearMonth;
  ownerSet: Set<string>;
  plantId: string | null;
  page: OutputCalendarPage;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSetCollapsed: (ids: string[], collapsed: boolean) => void;
  onCreate: (target: CreateDialogTarget) => void;
  stickyIds: Set<string>;
}) => {
  const isCollapsed = collapsed.has(node.id);
  const stickyTop = stickyIds.has(node.id) ? groupStickyTop(node.depth) : undefined;
  const descendants = descendantCategoryIds(node);
  const anyCollapsedInside = isCollapsed || descendants.some((id) => collapsed.has(id));
  const colSpan = 5 + months.length;
  return (
    <Fragment>
      <tr
        data-group-id={node.id}
        data-group-depth={node.depth}
        className="group/category cursor-pointer select-none hover:bg-transparent"
        onClick={() => onToggleCollapse(node.id)}
      >
        <td
          className={cn(
            IDENTITY_CELL,
            "h-8 border-b border-r border-border bg-zinc-50 py-0 font-semibold whitespace-nowrap",
            stickyTop && "z-[16]",
          )}
          style={{ paddingLeft: 8 + node.depth * 14, top: stickyTop }}
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
        <td
          className={cn("h-8 border-b border-r border-border bg-zinc-50 px-2 py-0", stickyTop && "sticky z-[15]")}
          style={{ top: stickyTop }}
          colSpan={colSpan - 1}
        >
          {descendants.length > 0 ? (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-1 text-xs font-normal text-muted-foreground opacity-0 group-hover/category:opacity-100 hover:bg-zinc-200/70 hover:text-foreground focus-visible:opacity-100"
              onClick={(event) => {
                event.stopPropagation();
                if (anyCollapsedInside) {
                  onSetCollapsed([node.id, ...descendants], false);
                } else {
                  onSetCollapsed(descendants, true);
                }
              }}
            >
              {anyCollapsedInside ? (
                <ChevronsUpDown className="size-3" aria-hidden />
              ) : (
                <ChevronsDownUp className="size-3" aria-hidden />
              )}
              {anyCollapsedInside ? "Развернуть всё" : "Свернуть подкатегории"}
            </button>
          ) : null}
        </td>
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
              onSetCollapsed={onSetCollapsed}
              onCreate={onCreate}
              stickyIds={stickyIds}
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
  onSetCollapsed,
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
      if (productVisibleForPlant(product.id, page.outputLines, plantId, page.openOrders)) {
        set.add(product.id);
      }
    }
    return set;
  }, [page.products, page.outputLines, page.openOrders, plantId]);
  const { roots, uncategorized } = useMemo(
    () => buildCategoryTree(page.categories, page.products, visibleIds),
    [page.categories, page.products, visibleIds],
  );
  const curKey = ymKey(currentYm);
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLTableSectionElement>(null);
  const [headHeight, setHeadHeight] = useState(0);
  const [stickyIds, setStickyIds] = useState<Set<string>>(() => new Set());

  const updateStickyIds = useCallback(() => {
    const box = scrollRef.current;
    const head = headRef.current;
    if (!box || !head) return;
    // The deepest category rows whose natural position has passed the header form the sticky stack.
    const line = box.scrollTop + head.offsetHeight;
    const path: string[] = [];
    for (const row of box.querySelectorAll<HTMLTableRowElement>("tr[data-group-id]")) {
      const depth = Number(row.dataset.groupDepth);
      if (row.offsetTop > line + depth * GROUP_ROW_HEIGHT) break;
      path.length = depth;
      path[depth] = row.dataset.groupId ?? "";
    }
    setStickyIds((prev) => {
      const next = new Set(path.filter(Boolean));
      return next.size === prev.size && [...next].every((id) => prev.has(id)) ? prev : next;
    });
  }, []);

  useLayoutEffect(() => {
    const head = headRef.current;
    if (!head) return;
    const observer = new ResizeObserver(() => setHeadHeight(head.getBoundingClientRect().height));
    observer.observe(head);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(updateStickyIds);
    return () => cancelAnimationFrame(frame);
  }, [updateStickyIds, collapsed, roots, uncategorized, headHeight]);

  const groupProps = {
    months,
    currentYm,
    ownerSet,
    plantId,
    page,
    collapsed,
    onToggleCollapse,
    onSetCollapsed,
    onCreate,
    stickyIds,
  };

  return (
    <div
      ref={scrollRef}
      onScroll={updateStickyIds}
      className="max-h-[calc(100vh-180px)] overflow-auto rounded-md border border-border bg-background"
      style={{ "--calendar-head-h": `${headHeight}px` } as CSSProperties}
    >
      <style>{`@keyframes flashPulse{0%{box-shadow:inset 0 0 0 2px #2563eb}100%{box-shadow:inset 0 0 0 0 transparent}}`}</style>
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
        <thead ref={headRef}>
          <tr>
            <th className={cn(IDENTITY_HEAD, "sticky top-0 border-b border-r border-border")}>Товар</th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50 text-left")}>
              Код завода
            </th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50")}>Остаток</th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50")}>
              Не распределено
            </th>
            <th className={cn(QTY_HEAD, "sticky top-0 z-20 border-b border-r border-border bg-zinc-50")}>Без срока</th>
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
          </tr>
        </thead>
        {roots.map((node) => (
          <tbody key={node.id}>
            <GroupRows node={node} {...groupProps} />
          </tbody>
        ))}
        {uncategorized.length > 0 ? (
          <tbody>
            <GroupRows
              node={{
                id: UNCATEGORIZED_GROUP_ID,
                name: "Без категории",
                depth: 0,
                productCount: uncategorized.length,
                products: uncategorized,
                children: [],
              }}
              {...groupProps}
            />
          </tbody>
        ) : null}
      </table>
      {visibleIds.size === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Нет товаров для отображения</p>
      ) : null}
    </div>
  );
};
