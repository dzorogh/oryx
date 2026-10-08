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
import { formatEntityCode } from "@/lib/entity-codes";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import {
  buildCategoryTree,
  descendantCategoryIds,
  groupByBaseProduct,
  pluralTovar,
  pluralVariant,
  UNCATEGORIZED_GROUP_ID,
  type CategoryTreeNode,
} from "@/features/logistics/category-tree";
import {
  buildCalendarColumns,
  buildOwnerSet,
  computeMonthRange,
  currentYearMonth,
  formatOutputDate,
  formatYearMonthLabel,
  moneyPeriodCell,
  moneyUnallocatedCell,
  noDateCell,
  openOrdersForProduct,
  periodCell,
  plantCodesForProduct,
  plantMoneyRows,
  productCode,
  productVisibleForPlant,
  regionMoneyRows,
  resolveOwner,
  STATUS_RU,
  stockBreakdown,
  stockQuantity,
  unassignedCell,
  unpaidPaymentDueDates,
  ymKey,
  type CalendarColumn,
  type CalendarOwner,
  type IncomingFilter,
  type MoneyCell,
  type MoneyRow,
  type MoneyUnallocatedEntry,
  type OutputCalendarMoneyOrder,
  type PlantPaymentsFilter,
  type StockBreakdownRow,
  type OutputCalendarOpenOrder,
  type OutputCalendarOutputLine,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage,
  type OutputCalendarProduct,
  type UnpaidStatus,
  type YearMonth,
} from "@/features/logistics/output-calendar";
import { formatOrderMoney, PAYMENT_STATUS_LABELS, todayIso, type PaymentStatus } from "@/features/logistics/order-money";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { categoryGroupStickyTop, useStickyCategoryRows } from "@/features/logistics/ui/use-sticky-category-rows";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, type ReactNode } from "react";

export type CreateDialogTarget =
  | {
      kind: "existing";
      product: OutputCalendarProduct;
      order: OutputCalendarOpenOrder;
      month: YearMonth;
      /** Day column — the output date; month column — the month's last day. */
      date?: string;
    }
  | {
      kind: "new";
      product: OutputCalendarProduct;
      month: YearMonth;
      date?: string;
    };

export const MONEY_PLANTS_GROUP_ID = "money:plants";
export const MONEY_REGIONS_GROUP_ID = "money:regions";

type OutputCalendarMatrixProps = {
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  plantPaymentsFilter: PlantPaymentsFilter;
  incomingFilter: IncomingFilter;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  onSetCollapsed: (ids: string[], collapsed: boolean) => void;
  expandedMonths: Set<number>;
  onToggleMonth: (key: number) => void;
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
  valueLabel,
  headerValue = valueLabel,
  hasFresh = false,
  children,
}: {
  title: string;
  subtitle: string;
  valueLabel: string;
  /** Header total when the cell shows a rounded value. */
  headerValue?: string;
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
        {valueLabel}
      </span>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-[380px] gap-0 p-0 text-sm">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <div className="shrink-0 text-base font-semibold tabular-nums">{headerValue}</div>
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
    <HoverBreakdown
      title={title}
      subtitle={productName}
      valueLabel={formatQuantity(quantity, unit)}
      hasFresh={hasFresh}
    >
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
                  {formatEntityCode("plant", first.plantId)}
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
      {formatEntityCode("transfer", row.locationSequence ?? row.locationId)}
    </EntityLink>
  ) : (
    <EntityLink href={logisticsPath("warehouses", row.locationId)}>
      {formatEntityCode("warehouse", row.locationId)}
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
    <HoverBreakdown title="Остаток" subtitle={productName} valueLabel={formatQuantity(quantity, unit)}>
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
    <HoverBreakdown
      title="Не распределено по выпускам"
      subtitle={productName}
      valueLabel={formatQuantity(quantity, unit)}
    >
      {orders.map((order) => (
        <section key={order.productionOrderId} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <EntityLink href={logisticsPath("production-orders", order.sequenceNumber)}>{order.number}</EntityLink>
            <EntityLink href={logisticsPath("plants", order.plantId)}>
              {formatEntityCode("plant", order.plantId)}
            </EntityLink>
          </div>
          <span className="font-semibold tabular-nums">{formatQuantity(order.remaining, unit)}</span>
        </section>
      ))}
    </HoverBreakdown>
  );
};

const orderHref = (order: Pick<OutputCalendarMoneyOrder, "kind" | "sequenceNumber">) =>
  logisticsPath(order.kind === "production_order" ? "production-orders" : "customer-orders", order.sequenceNumber);

const moneyRowSubtitle = (row: MoneyRow) => `${row.kind === "plant" ? "Завод" : "Регион"} ${row.code}`;

const PAYMENT_DOT: Record<PaymentStatus, string> = {
  planned: "bg-zinc-400",
  invoiced: "bg-blue-600",
  paid: "bg-green-600",
};

/** One line of a money popover: order code · details · amount (original currency under it). */
const MoneyEntryRow = ({
  order,
  details,
  amount,
  original,
}: {
  order: OutputCalendarMoneyOrder;
  details: ReactNode;
  amount: string;
  original: string | null;
}) => (
  <section className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-3 px-4 py-2.5">
    <div>
      <EntityLink href={orderHref(order)}>{order.number}</EntityLink>
    </div>
    <div className="min-w-0 space-y-0.5">{details}</div>
    <div className="text-right tabular-nums">
      <div className="font-semibold">{amount}</div>
      {original ? <div className="text-xs text-muted-foreground">{original}</div> : null}
    </div>
  </section>
);

const MoneyPeriodPopover = ({
  title,
  row,
  cell,
  productionCurrency,
}: {
  title: string;
  row: MoneyRow;
  cell: MoneyCell;
  productionCurrency: string;
}) => {
  if (cell.entries.length === 0) return null;
  return (
    <HoverBreakdown
      title={title}
      subtitle={moneyRowSubtitle(row)}
      valueLabel={formatOrderMoney(cell.amount, productionCurrency, { compact: true })}
      headerValue={formatOrderMoney(cell.amount, productionCurrency)}
    >
      {cell.entries.map((entry) => {
        const code = entry.order.currencyCode;
        return (
          <MoneyEntryRow
            key={entry.payment.id}
            order={entry.order}
            amount={formatOrderMoney(entry.converted, productionCurrency)}
            original={code === productionCurrency ? null : formatOrderMoney(entry.payment.amount, code)}
            details={
              <>
                <div className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className={cn("tabular-nums", entry.overdue && "font-medium text-red-700")}>
                    {formatOutputDate(entry.payment.dueOn)}
                  </span>
                  {entry.overdue ? <span className="text-xs text-red-700">просрочен</span> : null}
                </div>
                <div className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  <i className={cn("size-1.5 shrink-0 rounded-full", PAYMENT_DOT[entry.payment.status])} aria-hidden />
                  {PAYMENT_STATUS_LABELS[entry.payment.status]}
                </div>
              </>
            }
          />
        );
      })}
    </HoverBreakdown>
  );
};

const MoneyUnallocatedPopover = ({
  row,
  amount,
  entries,
  productionCurrency,
}: {
  row: MoneyRow;
  amount: number;
  entries: MoneyUnallocatedEntry[];
  productionCurrency: string;
}) => {
  if (entries.length === 0) return null;
  return (
    <HoverBreakdown
      title="Не распределено по платежам"
      subtitle={moneyRowSubtitle(row)}
      valueLabel={formatOrderMoney(amount, productionCurrency, { compact: true })}
      headerValue={formatOrderMoney(amount, productionCurrency)}
    >
      {entries.map((entry) => {
        const code = entry.order.currencyCode;
        return (
          <MoneyEntryRow
            key={entry.order.id}
            order={entry.order}
            amount={formatOrderMoney(entry.converted, productionCurrency)}
            original={code === productionCurrency ? null : formatOrderMoney(entry.rest, code)}
            details={
              <>
                <div className="text-xs whitespace-nowrap text-muted-foreground">
                  Сумма <span className="text-foreground tabular-nums">{formatOrderMoney(entry.total, code)}</span>
                </div>
                <div className="text-xs whitespace-nowrap text-muted-foreground">
                  Распределено{" "}
                  <span className="text-foreground tabular-nums">{formatOrderMoney(entry.allocated, code)}</span>
                </div>
              </>
            }
          />
        );
      })}
    </HoverBreakdown>
  );
};

const columnTitle = (column: CalendarColumn) =>
  column.kind === "month" ? formatYearMonthLabel(column.ym) : formatOutputDate(column.iso);

/** Current month (collapsed) or today (expanded day). */
const isCurrentColumn = (column: CalendarColumn, currentKey: number, today: string) =>
  column.kind === "month" ? ymKey(column.ym) === currentKey : column.iso === today;

/** Month before the current one or a day before today. */
const isPastColumn = (column: CalendarColumn, currentKey: number, today: string) =>
  column.kind === "month" ? ymKey(column.ym) < currentKey : column.iso < today;

const PeriodCell = ({
  page,
  product,
  column,
  current,
  isPast,
  cell,
  showPlus,
  openOrders,
  onCreate,
}: {
  page: OutputCalendarPage;
  product: OutputCalendarProduct;
  column: CalendarColumn;
  current: boolean;
  isPast: boolean;
  cell: { quantity: number; lines: OutputCalendarOutputLine[]; hasFresh: boolean };
  showPlus: boolean;
  openOrders: OutputCalendarOpenOrder[];
  onCreate: (target: CreateDialogTarget) => void;
}) => {
  const overdue = isPast && cell.quantity > 0;
  const date = column.kind === "day" ? column.iso : undefined;
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
                  onClick={() => onCreate({ kind: "existing", product, order, month: column.ym, date })}
                >
                  Выпуск по {order.number} — осталось разложить {formatQuantity(order.remaining, product.unit)}
                </DropdownMenuItem>
              ))}
              {openOrders.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem onClick={() => onCreate({ kind: "new", product, month: column.ym, date })}>
                Новый заказ на производство…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <CellPopover
          page={page}
          title={`Приход · ${columnTitle(column)}`}
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
  columns,
  currentKey,
  today,
  ownerSet,
  plantId,
  page,
  onCreate,
}: {
  product: OutputCalendarProduct;
  depth: number;
  columns: CalendarColumn[];
  currentKey: number;
  today: string;
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
      {columns.map((column) => {
        const cell = periodCell(product.id, column.period, page.outputLines, ownerSet, plantId);
        const isPast = isPastColumn(column, currentKey, today);
        return (
          <PeriodCell
            key={`${product.id}-${column.key}`}
            page={page}
            product={product}
            column={column}
            current={isCurrentColumn(column, currentKey, today)}
            isPast={isPast}
            cell={cell}
            showPlus={!isPast}
            openOrders={orders}
            onCreate={onCreate}
          />
        );
      })}
    </tr>
  );
};

/** Nested category rows stack under the sticky header, one row per level. */
const groupStickyTop = categoryGroupStickyTop;

type RowContext = {
  columns: CalendarColumn[];
  currentKey: number;
  today: string;
  page: OutputCalendarPage;
  collapsed: Set<string>;
  onToggleCollapse: (id: string) => void;
  stickyIds: Set<string>;
};

type GroupTotalCell = { key: string; value: ReactNode; className?: string };

type MoneyTone = "outgoing" | "incoming";

/** Solid backgrounds: header rows stick over scrolled content. */
const MONEY_TONE: Record<
  MoneyTone,
  {
    icon: LucideIcon;
    iconClass: string;
    headBg: string;
    headCurrentBg: string;
    headStripe: string;
    rowStripe: string;
  }
> = {
  outgoing: {
    icon: ArrowUpRight,
    iconClass: "text-orange-600",
    headBg: "bg-orange-50",
    headCurrentBg: "bg-orange-100",
    headStripe: "shadow-[inset_3px_0_0_var(--color-orange-500)]",
    rowStripe: "shadow-[inset_3px_0_0_var(--color-orange-200)]",
  },
  incoming: {
    icon: ArrowDownLeft,
    iconClass: "text-emerald-600",
    headBg: "bg-emerald-50",
    headCurrentBg: "bg-emerald-100",
    headStripe: "shadow-[inset_3px_0_0_var(--color-emerald-500)]",
    rowStripe: "shadow-[inset_3px_0_0_var(--color-emerald-200)]",
  },
};

const SectionRow = ({ title, colSpan, first = false }: { title: string; colSpan: number; first?: boolean }) => (
  <tr className="hover:bg-transparent">
    <td
      colSpan={colSpan}
      className={cn(
        "border-b border-border bg-background px-0 pb-1.5 text-xs font-semibold text-muted-foreground",
        first ? "pt-2" : "pt-6",
      )}
    >
      <span className="sticky left-0 inline-block px-2">{title}</span>
    </td>
  </tr>
);

const GroupHeaderRow = ({
  id,
  depth,
  title,
  count,
  cells,
  collapsed,
  stickyTop,
  onToggle,
  tools,
  tone,
}: {
  id: string;
  depth: number;
  title: string;
  count: string;
  /** Totals for every column after the identity column. */
  cells: GroupTotalCell[];
  collapsed: boolean;
  stickyTop: string | undefined;
  onToggle: () => void;
  tools?: ReactNode;
  tone?: MoneyTone;
}) => {
  const toneStyle = tone ? MONEY_TONE[tone] : null;
  const ToneIcon = toneStyle?.icon;
  const rowBg = toneStyle?.headBg ?? "bg-zinc-50";
  return (
    <tr
      data-group-id={id}
      data-group-depth={depth}
      className="group/category cursor-pointer select-none hover:bg-transparent"
      onClick={onToggle}
    >
      <td
        className={cn(
          IDENTITY_CELL,
          "h-8 border-b border-r border-border py-0 font-semibold whitespace-nowrap",
          rowBg,
          toneStyle?.headStripe,
          stickyTop && "z-[16]",
        )}
        style={{ paddingLeft: 8 + depth * 14, top: stickyTop }}
        colSpan={1}
      >
        <button
          type="button"
          aria-expanded={!collapsed}
          className="inline-flex items-center gap-1"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {collapsed ? (
            <ChevronRight className="size-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-3 text-muted-foreground" />
          )}
          {ToneIcon ? <ToneIcon className={cn("size-3.5", toneStyle?.iconClass)} aria-hidden /> : null}
          {title}
          <span className="font-normal text-muted-foreground">· {count}</span>
        </button>
        {tools}
      </td>
      {cells.map((cell) => (
        <td
          key={cell.key}
          className={cn(
            "h-8 border-b border-r border-border px-2 py-0 text-right text-xs font-semibold whitespace-nowrap tabular-nums",
            rowBg,
            cell.className,
            stickyTop && "sticky z-[15]",
          )}
          style={{ top: stickyTop }}
        >
          {cell.value}
        </td>
      ))}
    </tr>
  );
};

const subtreeProducts = (node: CategoryTreeNode<OutputCalendarProduct>): OutputCalendarProduct[] => {
  const byId = new Map<string, OutputCalendarProduct>();
  const walk = (current: CategoryTreeNode<OutputCalendarProduct>) => {
    for (const product of current.products) byId.set(product.id, product);
    current.children.forEach(walk);
  };
  walk(node);
  return [...byId.values()];
};

/** Σ of the product rows; a product listed in several subcategories counts once. */
const categoryTotalCells = (
  products: OutputCalendarProduct[],
  ctx: RowContext,
  ownerSet: Set<string>,
  plantId: string | null,
): GroupTotalCell[] => {
  const { page, columns, currentKey, today } = ctx;
  const unit = products.every((product) => product.unit === products[0]?.unit) ? products[0]?.unit : undefined;
  const label = (quantity: number) => (quantity > 0 ? formatQuantity(quantity, unit) : null);
  const sum = (quantityOf: (product: OutputCalendarProduct) => number) =>
    products.reduce((total, product) => total + quantityOf(product), 0);
  return [
    { key: "plant", value: null },
    { key: "stock", value: label(sum((p) => stockQuantity(p.id, page.stock, ownerSet))) },
    { key: "unassigned", value: label(sum((p) => unassignedCell(p.id, page.openOrders, plantId).quantity)) },
    { key: "no-date", value: label(sum((p) => noDateCell(p.id, page.outputLines, ownerSet, plantId).quantity)) },
    ...columns.map((column) => {
      const quantity = sum((p) => periodCell(p.id, column.period, page.outputLines, ownerSet, plantId).quantity);
      return {
        key: column.key,
        value: label(quantity),
        className: cn(
          isCurrentColumn(column, currentKey, today) && "bg-zinc-100",
          quantity > 0 && isPastColumn(column, currentKey, today) && "bg-red-50 text-red-700",
        ),
      };
    }),
  ];
};

const moneyTotalCells = (
  rows: MoneyRow[],
  hiddenStatuses: UnpaidStatus[],
  tone: MoneyTone,
  ctx: RowContext,
): GroupTotalCell[] => {
  const { page, columns, currentKey, today } = ctx;
  const currency = page.productionCurrency;
  const label = (amount: number) => (amount > 0 ? formatOrderMoney(amount, currency, { compact: true }) : null);
  const unallocated = rows.reduce((total, row) => total + moneyUnallocatedCell(row, currency).amount, 0);
  return [
    { key: "plant", value: null },
    { key: "stock", value: null },
    { key: "unassigned", value: label(unallocated) },
    { key: "no-date", value: null },
    ...columns.map((column) => {
      const cells = rows.map((row) => moneyPeriodCell(row, column.period, hiddenStatuses, currency, today));
      return {
        key: column.key,
        value: label(cells.reduce((total, cell) => total + cell.amount, 0)),
        className: cn(
          isCurrentColumn(column, currentKey, today) && MONEY_TONE[tone].headCurrentBg,
          cells.some((cell) => cell.overdue) && "bg-red-50 text-red-700",
        ),
      };
    }),
  ];
};

const GroupRows = ({
  node,
  ownerSet,
  plantId,
  onSetCollapsed,
  onCreate,
  ...ctx
}: RowContext & {
  node: CategoryTreeNode<OutputCalendarProduct>;
  ownerSet: Set<string>;
  plantId: string | null;
  onSetCollapsed: (ids: string[], collapsed: boolean) => void;
  onCreate: (target: CreateDialogTarget) => void;
}) => {
  const { collapsed, onToggleCollapse, stickyIds, columns } = ctx;
  const isCollapsed = collapsed.has(node.id);
  const stickyTop = stickyIds.has(node.id) ? groupStickyTop(node.depth) : undefined;
  const descendants = descendantCategoryIds(node);
  const anyCollapsedInside = isCollapsed || descendants.some((id) => collapsed.has(id));
  return (
    <Fragment>
      <GroupHeaderRow
        id={node.id}
        depth={node.depth}
        title={node.name}
        count={pluralTovar(node.productCount)}
        cells={categoryTotalCells(subtreeProducts(node), ctx, ownerSet, plantId)}
        collapsed={isCollapsed}
        stickyTop={stickyTop}
        onToggle={() => onToggleCollapse(node.id)}
        tools={
          descendants.length > 0 ? (
            <button
              type="button"
              aria-label={anyCollapsedInside ? "Развернуть всё" : "Свернуть подкатегории"}
              title={anyCollapsedInside ? "Развернуть всё" : "Свернуть подкатегории"}
              className="pointer-events-none ml-1.5 inline-flex size-5 items-center justify-center rounded align-middle text-muted-foreground opacity-0 group-hover/category:pointer-events-auto group-hover/category:opacity-100 hover:bg-zinc-200/70 hover:text-foreground focus-visible:pointer-events-auto focus-visible:opacity-100"
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
            </button>
          ) : null
        }
      />
      {!isCollapsed ? (
        <>
          {groupByBaseProduct(node.id, node.products, (product) => ({
            id: product.productId,
            name: product.productName,
          })).map((entry) => {
            const productRow = (product: OutputCalendarProduct, depth: number) => (
              <ProductRow
                key={`${node.id}-${product.id}`}
                product={product}
                depth={depth}
                columns={columns}
                currentKey={ctx.currentKey}
                today={ctx.today}
                ownerSet={ownerSet}
                plantId={plantId}
                page={ctx.page}
                onCreate={onCreate}
              />
            );
            if (entry.kind === "item") return productRow(entry.item, node.depth);
            const { group } = entry;
            const groupDepth = node.depth + 1;
            const groupCollapsed = collapsed.has(group.id);
            return (
              <Fragment key={group.id}>
                <GroupHeaderRow
                  id={group.id}
                  depth={groupDepth}
                  title={group.name}
                  count={pluralVariant(group.items.length)}
                  cells={categoryTotalCells(group.items, ctx, ownerSet, plantId)}
                  collapsed={groupCollapsed}
                  stickyTop={stickyIds.has(group.id) ? groupStickyTop(groupDepth) : undefined}
                  onToggle={() => onToggleCollapse(group.id)}
                />
                {!groupCollapsed ? group.items.map((product) => productRow(product, groupDepth)) : null}
              </Fragment>
            );
          })}
          {node.children.map((child) => (
            <GroupRows
              key={child.id}
              node={child}
              ownerSet={ownerSet}
              plantId={plantId}
              onSetCollapsed={onSetCollapsed}
              onCreate={onCreate}
              {...ctx}
            />
          ))}
        </>
      ) : null}
    </Fragment>
  );
};

const pluralRows = (count: number, forms: [string, string, string]) => {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  const word = n > 10 && n < 20 ? forms[2] : n1 === 1 ? forms[0] : n1 >= 2 && n1 <= 4 ? forms[1] : forms[2];
  return `${count} ${word}`;
};

const MoneyRowView = ({
  row,
  hiddenStatuses,
  ...ctx
}: RowContext & { row: MoneyRow; hiddenStatuses: UnpaidStatus[] }) => {
  const { page, columns, currentKey, today } = ctx;
  const currency = page.productionCurrency;
  const unallocatedCell = moneyUnallocatedCell(row, currency);
  const tone: MoneyTone = row.kind === "plant" ? "outgoing" : "incoming";
  return (
    <tr className="hover:bg-transparent">
      <td
        className={cn(IDENTITY_CELL, "border-b border-r border-border", MONEY_TONE[tone].rowStripe)}
        style={{ paddingLeft: 28 }}
      >
        <EntityLink href={logisticsPath(row.kind === "plant" ? "plants" : "regions", row.id)}>{row.code}</EntityLink>
        <span className="ml-2 text-[11px] text-muted-foreground">{currency}</span>
      </td>
      <td className="border-b border-r border-border px-2 py-1" />
      <td className={cn(QTY_CELL, "border-b border-r border-border")} />
      <td className={cn(QTY_CELL, "border-b border-r border-border whitespace-nowrap")}>
        <div className="flex">
          <MoneyUnallocatedPopover
            row={row}
            amount={unallocatedCell.amount}
            entries={unallocatedCell.entries}
            productionCurrency={currency}
          />
        </div>
      </td>
      <td className={cn(QTY_CELL, "border-b border-r border-border")} />
      {columns.map((column) => {
        const cell = moneyPeriodCell(row, column.period, hiddenStatuses, currency, today);
        return (
          <td
            key={`${row.kind}-${row.id}-${column.key}`}
            className={cn(
              QTY_CELL,
              "border-b border-r border-border whitespace-nowrap",
              isCurrentColumn(column, currentKey, today) && "bg-zinc-50",
              cell.overdue && "bg-red-50 font-medium text-red-700",
            )}
          >
            <div className="flex min-h-[22px] items-center justify-end">
              <MoneyPeriodPopover
                title={`${row.kind === "plant" ? "Платежи" : "Поступления"} · ${columnTitle(column)}`}
                row={row}
                cell={cell}
                productionCurrency={currency}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
};

const MoneyGroupRows = ({
  id,
  title,
  rows,
  hiddenStatuses,
  empty,
  tone,
  ...ctx
}: RowContext & {
  id: string;
  title: string;
  rows: MoneyRow[];
  hiddenStatuses: UnpaidStatus[];
  empty: string;
  tone: MoneyTone;
}) => {
  const isCollapsed = ctx.collapsed.has(id);
  const stickyTop = ctx.stickyIds.has(id) ? groupStickyTop(0) : undefined;
  return (
    <Fragment>
      <GroupHeaderRow
        id={id}
        depth={0}
        title={title}
        count={`${pluralRows(rows.length, ["строка", "строки", "строк"])} · ${ctx.page.productionCurrency}`}
        cells={moneyTotalCells(rows, hiddenStatuses, tone, ctx)}
        collapsed={isCollapsed}
        stickyTop={stickyTop}
        onToggle={() => ctx.onToggleCollapse(id)}
        tone={tone}
      />
      {!isCollapsed ? (
        rows.length > 0 ? (
          rows.map((row) => (
            <MoneyRowView key={`${row.kind}-${row.id}`} row={row} hiddenStatuses={hiddenStatuses} {...ctx} />
          ))
        ) : (
          <tr className="hover:bg-transparent">
            <td
              className={cn(
                IDENTITY_CELL,
                "border-b border-r border-border text-muted-foreground",
                MONEY_TONE[tone].rowStripe,
              )}
              style={{ paddingLeft: 28 }}
            >
              {empty}
            </td>
            <td className="border-b border-border" colSpan={4 + ctx.columns.length} />
          </tr>
        )
      ) : null}
    </Fragment>
  );
};

const HEAD_CELL = "sticky top-0 z-20 border-b border-r border-border bg-zinc-50";

export const OutputCalendarMatrix = ({
  page,
  filter,
  plantId,
  plantPaymentsFilter,
  incomingFilter,
  collapsed,
  onToggleCollapse,
  onSetCollapsed,
  expandedMonths,
  onToggleMonth,
  onCreate,
}: OutputCalendarMatrixProps) => {
  const currentYm = currentYearMonth();
  const currentKey = ymKey(currentYm);
  const today = todayIso();
  const ownerSet = useMemo(() => buildOwnerSet(filter, page), [filter, page]);
  const months = useMemo(
    () => computeMonthRange(page.outputLines, new Date(), unpaidPaymentDueDates(page)),
    [page],
  );
  const columns = useMemo(() => buildCalendarColumns(months, expandedMonths), [months, expandedMonths]);
  const anyExpanded = months.some((ym) => expandedMonths.has(ymKey(ym)));
  const headRowSpan = anyExpanded ? 2 : 1;
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
  const plantRows = useMemo(() => plantMoneyRows(page, plantPaymentsFilter), [page, plantPaymentsFilter]);
  const regionRows = useMemo(() => regionMoneyRows(page, incomingFilter), [page, incomingFilter]);
  const { scrollRef, headRef, stickyIds, onScroll, scrollStyle } = useStickyCategoryRows({
    collapsed,
    roots,
    uncategorized,
  });

  const ctx: RowContext = { columns, currentKey, today, page, collapsed, onToggleCollapse, stickyIds };
  const groupProps = { ...ctx, ownerSet, plantId, onSetCollapsed, onCreate };
  const sectionColSpan = 5 + columns.length;

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className="max-h-[calc(100vh-180px)] overflow-auto rounded-md border border-border bg-background"
      style={scrollStyle}
    >
      <style>{`@keyframes flashPulse{0%{box-shadow:inset 0 0 0 2px #2563eb}100%{box-shadow:inset 0 0 0 0 transparent}}`}</style>
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
        <thead ref={headRef}>
          <tr>
            <th rowSpan={headRowSpan} className={cn(IDENTITY_HEAD, "sticky top-0 border-b border-r border-border")}>
              Товар
            </th>
            <th rowSpan={headRowSpan} className={cn(QTY_HEAD, HEAD_CELL, "text-left")}>
              Код завода
            </th>
            <th rowSpan={headRowSpan} className={cn(QTY_HEAD, HEAD_CELL)}>
              Остаток
            </th>
            <th rowSpan={headRowSpan} className={cn(QTY_HEAD, HEAD_CELL)}>
              Не распределено
            </th>
            <th rowSpan={headRowSpan} className={cn(QTY_HEAD, HEAD_CELL)}>
              Без срока
            </th>
            {months.map((ym) => {
              const key = ymKey(ym);
              const expanded = expandedMonths.has(key);
              return (
                <th
                  key={key}
                  rowSpan={expanded ? 1 : headRowSpan}
                  colSpan={expanded ? columns.filter((c) => c.kind === "day" && ymKey(c.ym) === key).length : 1}
                  className={cn(
                    QTY_HEAD,
                    HEAD_CELL,
                    "p-0",
                    key === currentKey && "bg-zinc-100",
                    expanded && "text-center",
                  )}
                >
                  <button
                    type="button"
                    aria-expanded={expanded}
                    title={expanded ? "Свернуть месяц" : "Раскрыть по дням"}
                    onClick={() => onToggleMonth(key)}
                    className={cn(
                      "inline-flex w-full items-center gap-1 px-2 py-1.5 whitespace-nowrap hover:bg-zinc-200/60",
                      expanded ? "justify-center" : "justify-end",
                    )}
                  >
                    {expanded ? (
                      <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
                    ) : (
                      <ChevronRight className="size-3 text-muted-foreground" aria-hidden />
                    )}
                    {formatYearMonthLabel(ym)}
                  </button>
                </th>
              );
            })}
          </tr>
          {anyExpanded ? (
            <tr>
              {columns.flatMap((column) =>
                column.kind === "day"
                  ? [
                      <th
                        key={column.key}
                        className={cn(
                          "sticky z-20 min-w-10 border-b border-r border-border bg-zinc-50 px-1 py-1 text-center text-[11px] font-medium text-zinc-700 tabular-nums",
                          column.iso === today && "bg-zinc-100 text-foreground",
                        )}
                        style={{ top: "var(--calendar-head-h-row, 0px)" }}
                        title={formatOutputDate(column.iso)}
                      >
                        {column.day}
                      </th>,
                    ]
                  : [],
              )}
            </tr>
          ) : null}
        </thead>
        <tbody>
          <SectionRow title="Деньги" colSpan={sectionColSpan} first />
          <MoneyGroupRows
            id={MONEY_PLANTS_GROUP_ID}
            title="Платежи заводам"
            rows={plantRows}
            hiddenStatuses={plantPaymentsFilter.hiddenStatuses}
            empty="Нет неоплаченных платежей заводам"
            tone="outgoing"
            {...ctx}
          />
        </tbody>
        <tbody>
          <MoneyGroupRows
            id={MONEY_REGIONS_GROUP_ID}
            title="Поступления от клиентов"
            rows={regionRows}
            hiddenStatuses={incomingFilter.hiddenStatuses}
            empty="Нет ожидаемых поступлений"
            tone="incoming"
            {...ctx}
          />
        </tbody>
        <tbody>
          <SectionRow title="Техника" colSpan={sectionColSpan} />
        </tbody>
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
