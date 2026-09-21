// english-ui:ignore-file
"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hrefForOwner, productionLineReservationBreakdown } from "@/features/logistics/logistics-availability";
import { formatQuantity, LEDGER_ASSIGNED_TO_KIND_LABELS } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById, productCode } from "@/features/logistics/logistics-lookups";
import type {
  LogisticsSnapshot,
  OwnerType,
  ProductionOrderLine,
  StockBalance,
} from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { cn } from "@/lib/utils";

type ReservationAssignment = {
  ownerType: OwnerType;
  ownerId: string;
  quantity: number;
};

const ReservationDetails = ({
  snapshot,
  productName,
  productCodeLabel,
  assignments,
  panelId,
}: {
  snapshot: LogisticsSnapshot;
  productName: string;
  productCodeLabel: string;
  assignments: ReservationAssignment[];
  panelId: string;
}) => {
  const label = `Резервы для ${productName}, ${productCodeLabel}`;
  return (
    <>
      <div className="hidden bg-muted/30 lg:block">
        <table id={panelId} className="w-full text-sm" aria-label={label}>
          <caption className="px-3 py-2 pl-10 text-left text-[10px] text-muted-foreground">
            {label}
          </caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 pl-10 text-left font-medium">
                Тип владельца
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                Код
              </th>
              <th scope="col" className="px-3 py-2 text-left font-medium">
                В резерве
              </th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((item) => (
              <tr key={`${item.ownerType}:${item.ownerId}`} className="border-t border-border/60">
                <td className="px-3 py-2 pl-10">{LEDGER_ASSIGNED_TO_KIND_LABELS[item.ownerType]}</td>
                <td className="px-3 py-2">
                  <LogisticsCodeBadge
                    code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                    href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
                  />
                </td>
                <td className="px-3 py-2 tabular-nums">{formatQuantity(item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-border/60 bg-muted/30 lg:hidden" aria-label={label}>
        {assignments.map((item) => (
          <li key={`${item.ownerType}:${item.ownerId}`} className="px-3 py-2 pl-8">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
              <div>
                <dt className="text-[10px] text-muted-foreground">Тип владельца</dt>
                <dd>{LEDGER_ASSIGNED_TO_KIND_LABELS[item.ownerType]}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">Код</dt>
                <dd>
                  <LogisticsCodeBadge
                    code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                    href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-muted-foreground">В резерве</dt>
                <dd className="font-medium tabular-nums">{formatQuantity(item.quantity)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
};

export const ProductionOrderProductManifest = ({
  snapshot,
  balances,
  lines,
  doneByLine,
  canMutate,
  onAddProduct,
  onReserve,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  lines: ProductionOrderLine[];
  doneByLine: Map<string, number>;
  canMutate: boolean;
  onAddProduct?: () => void;
  onReserve: (lineId: string) => void;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (lineId: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const action: ReactNode =
    canMutate && onAddProduct ? (
      <Button type="button" size="sm" className="h-11 min-w-11 md:h-8" onClick={onAddProduct}>
        Добавить товар
      </Button>
    ) : null;

  return (
    <section id="products" className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 tabIndex={-1} className="text-base font-semibold outline-none">
          Товары
        </h2>
        {action}
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">В заказе пока нет товаров.</p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Товар</TableHead>
                  <TableHead>План</TableHead>
                  <TableHead>Свободно</TableHead>
                  <TableHead>В резерве</TableHead>
                  <TableHead>Выпущено</TableHead>
                  <TableHead className="text-right">Действие</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const product = productById(snapshot, line.productId);
                  const name = product?.name ?? line.productId;
                  const code = productCode(snapshot, line.productId);
                  const outputted = doneByLine.get(line.id) ?? 0;
                  const breakdown = productionLineReservationBreakdown(line, balances);
                  const reservedTotal = breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0);
                  const assignments = [...breakdown.reserved].sort((left, right) =>
                    ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                      ownerLabel(snapshot, right.ownerType, right.ownerId),
                    ),
                  ) as ReservationAssignment[];
                  const hasReserves = assignments.length > 0;
                  const isOpen = hasReserves && expanded.has(line.id);
                  const panelId = `po-reserves-${line.id}`;
                  const showReserve = canMutate && breakdown.free > 0;
                  return (
                    <Fragment key={line.id}>
                      <TableRow className={isOpen ? "border-b-0" : undefined}>
                        <TableCell className="px-3 py-2">
                          <div className="flex items-start gap-1.5">
                            {hasReserves ? (
                              <button
                                type="button"
                                className="mt-0.5 inline-flex size-11 items-center justify-center rounded-md text-muted-foreground md:size-8"
                                aria-expanded={isOpen}
                                aria-controls={isOpen ? panelId : undefined}
                                aria-label={
                                  isOpen
                                    ? `Свернуть резервы ${name}, ${code}`
                                    : `Развернуть резервы ${name}, ${code}`
                                }
                                onClick={() => toggle(line.id)}
                              >
                                <ChevronRight
                                  className={cn("size-3.5 transition-transform motion-reduce:transition-none", isOpen && "rotate-90")}
                                  aria-hidden
                                />
                              </button>
                            ) : (
                              <span className="inline-block size-11 shrink-0 md:size-8" aria-hidden />
                            )}
                            <ProductIdentity snapshot={snapshot} productId={line.productId} nameAs="text" />
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums">
                          {formatQuantity(line.quantity, product?.unit)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums">
                          {formatQuantity(breakdown.free)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums">
                          {formatQuantity(reservedTotal)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-sm tabular-nums">
                          {formatQuantity(outputted)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right">
                          {showReserve ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-11 min-w-11 md:h-8"
                              onClick={() => onReserve(line.id)}
                            >
                              Зарезервировать
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                      {isOpen ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={6} className="p-0">
                            <ReservationDetails
                              snapshot={snapshot}
                              productName={name}
                              productCodeLabel={code}
                              assignments={assignments}
                              panelId={panelId}
                            />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {lines.map((line) => {
              const product = productById(snapshot, line.productId);
              const name = product?.name ?? line.productId;
              const code = productCode(snapshot, line.productId);
              const outputted = doneByLine.get(line.id) ?? 0;
              const breakdown = productionLineReservationBreakdown(line, balances);
              const reservedTotal = breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0);
              const assignments = [...breakdown.reserved].sort((left, right) =>
                ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                  ownerLabel(snapshot, right.ownerType, right.ownerId),
                ),
              ) as ReservationAssignment[];
              const hasReserves = assignments.length > 0;
              const isOpen = hasReserves && expanded.has(line.id);
              const panelId = `po-reserves-list-${line.id}`;
              const showReserve = canMutate && breakdown.free > 0;
              return (
                <li key={line.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{name}</h3>
                      <div className="mt-1">
                        <LogisticsCodeBadge code={code} />
                      </div>
                    </div>
                    {hasReserves ? (
                      <button
                        type="button"
                        className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground"
                        aria-expanded={isOpen}
                        aria-controls={isOpen ? panelId : undefined}
                        aria-label={
                          isOpen ? `Свернуть резервы ${name}, ${code}` : `Развернуть резервы ${name}, ${code}`
                        }
                        onClick={() => toggle(line.id)}
                      >
                        <ChevronRight
                          className={cn("size-4 transition-transform motion-reduce:transition-none", isOpen && "rotate-90")}
                          aria-hidden
                        />
                      </button>
                    ) : null}
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                    <div>
                      <dt className="text-[10px] text-muted-foreground">План</dt>
                      <dd className="text-sm tabular-nums">{formatQuantity(line.quantity, product?.unit)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Свободно</dt>
                      <dd className="text-sm tabular-nums">{formatQuantity(breakdown.free)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">В резерве</dt>
                      <dd className="text-sm tabular-nums">{formatQuantity(reservedTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Выпущено</dt>
                      <dd className="text-sm tabular-nums">{formatQuantity(outputted)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] text-muted-foreground">Действие</dt>
                      <dd className="text-sm">
                        {showReserve ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="mt-1 h-11"
                            onClick={() => onReserve(line.id)}
                          >
                            Зарезервировать
                          </Button>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                  {isOpen ? (
                    <div id={panelId}>
                      <ReservationDetails
                        snapshot={snapshot}
                        productName={name}
                        productCodeLabel={code}
                        assignments={assignments}
                        panelId={`${panelId}-inner`}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
