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
import { DOCUMENT_TABLE_HEAD_CLASS } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { cn } from "@/lib/utils";

type ReservationAssignment = {
  ownerType: OwnerType;
  ownerId: string;
  quantity: number;
};

const ReserveDisclosure = ({
  open,
  name,
  code,
  controls,
  onToggle,
}: {
  open: boolean;
  name: string;
  code: string;
  controls: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground md:size-8"
    aria-expanded={open}
    aria-controls={open ? controls : undefined}
    aria-label={open ? `Свернуть резервы ${name}, ${code}` : `Развернуть резервы ${name}, ${code}`}
    onClick={onToggle}
  >
    <ChevronRight
      className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-90")}
      aria-hidden
    />
  </button>
);

const ReservationOwner = ({
  snapshot,
  assignment,
  indent = false,
}: {
  snapshot: LogisticsSnapshot;
  assignment: ReservationAssignment;
  indent?: boolean;
}) => (
  <div className="flex min-w-0 items-center gap-2">
    {indent ? <span className="inline-block size-8 shrink-0" aria-hidden /> : null}
    <span className="text-sm text-muted-foreground">
      {LEDGER_ASSIGNED_TO_KIND_LABELS[assignment.ownerType]}
    </span>
    <LogisticsCodeBadge
      code={ownerLabel(snapshot, assignment.ownerType, assignment.ownerId)}
      href={hrefForOwner(assignment.ownerType, assignment.ownerId) ?? undefined}
    />
  </div>
);

export const ProductionOrderProductManifest = ({
  snapshot,
  balances,
  lines,
  doneByLine,
  canMutate,
  onAddProduct,
  onReserve,
  bare = false,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  lines: ProductionOrderLine[];
  doneByLine: Map<string, number>;
  canMutate: boolean;
  onAddProduct?: () => void;
  onReserve: (lineId: string) => void;
  bare?: boolean;
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
    !bare && canMutate && onAddProduct ? (
      <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onAddProduct}>
        Добавить товар
      </Button>
    ) : null;

  const tableBody =
    lines.length === 0 ? (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">В заказе пока нет товаров.</p>
    ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Товар</TableHead>
                  <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>План</TableHead>
                  <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Свободно</TableHead>
                  <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>В резерве</TableHead>
                  <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Выпущено</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const product = productById(snapshot, line.productId);
                  const unit = line.productUnit || product?.unit;
                  const name = line.productName || product?.name || line.productId;
                  const code = productCode(snapshot, line.productId);
                  const outputted = doneByLine.get(line.id) ?? 0;
                  const breakdown = productionLineReservationBreakdown(line, snapshot);
                  const reservedTotal = breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0);
                  const assignments = [...breakdown.reserved].sort((left, right) =>
                    ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                      ownerLabel(snapshot, right.ownerType, right.ownerId),
                    ),
                  ) as ReservationAssignment[];
                  const isOpen = expanded.has(line.id);
                  const panelId = `po-reserves-${line.id}`;
                  const showReserve = canMutate && breakdown.free > 0;
                  const q = (n: number) => formatQuantity(n, unit);
                  return (
                    <Fragment key={line.id}>
                      <TableRow className="group/row">
                        <TableCell className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-1.5">
                              <ReserveDisclosure
                                open={isOpen}
                                name={name}
                                code={code}
                                controls={panelId}
                                onToggle={() => toggle(line.id)}
                              />
                              <ProductIdentity
                                snapshot={snapshot}
                                productId={line.productId}
                                productName={line.productName}
                                nameAs="text"
                              />
                            </div>
                            {showReserve ? (
                              <div className="opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 shrink-0"
                                  onClick={() => onReserve(line.id)}
                                >
                                  Зарезервировать
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                          {q(line.quantity)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                          {q(breakdown.free)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                          {q(reservedTotal)}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                          {q(outputted)}
                        </TableCell>
                      </TableRow>
                      {isOpen
                        ? assignments.map((item, index) => (
                            <TableRow
                              key={`${item.ownerType}:${item.ownerId}`}
                              id={index === 0 ? panelId : undefined}
                              className="bg-muted/30 hover:bg-muted/30"
                              aria-label={`${LEDGER_ASSIGNED_TO_KIND_LABELS[item.ownerType]} ${ownerLabel(snapshot, item.ownerType, item.ownerId)}, в резерве ${q(item.quantity)}`}
                            >
                              <TableCell className="px-3 py-1.5">
                                <ReservationOwner snapshot={snapshot} assignment={item} indent />
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums">
                                {q(item.quantity)}
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                                {q(0)}
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-right text-sm font-semibold tabular-nums">
                                {q(item.quantity)}
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                                {q(0)}
                              </TableCell>
                            </TableRow>
                          ))
                        : null}
                      {isOpen && (assignments.length === 0 || breakdown.free > 0) ? (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell id={assignments.length === 0 ? panelId : undefined} className="px-3 py-1.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="inline-block size-8 shrink-0" aria-hidden />
                              <span className="text-sm text-muted-foreground">Свободно</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums">
                            {q(breakdown.free)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm font-semibold tabular-nums">
                            {q(breakdown.free)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                            {q(0)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                            {q(0)}
                          </TableCell>
                        </TableRow>
                      ) : null}
                      {isOpen && outputted > 0 ? (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell className="px-3 py-1.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="inline-block size-8 shrink-0" aria-hidden />
                              <span className="text-sm text-muted-foreground">Выпущено</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums">
                            {q(outputted)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                            {q(0)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm tabular-nums text-muted-foreground/50">
                            {q(0)}
                          </TableCell>
                          <TableCell className="px-3 py-1.5 text-right text-sm font-semibold tabular-nums">
                            {q(outputted)}
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
              const unit = line.productUnit || product?.unit;
              const name = line.productName || product?.name || line.productId;
              const code = productCode(snapshot, line.productId);
              const outputted = doneByLine.get(line.id) ?? 0;
              const breakdown = productionLineReservationBreakdown(line, snapshot);
              const reservedTotal = breakdown.reserved.reduce((sum, item) => sum + item.quantity, 0);
              const assignments = [...breakdown.reserved].sort((left, right) =>
                ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
                  ownerLabel(snapshot, right.ownerType, right.ownerId),
                ),
              ) as ReservationAssignment[];
              const isOpen = expanded.has(line.id);
              const panelId = `po-reserves-list-${line.id}`;
              const showReserve = canMutate && breakdown.free > 0;
              const q = (n: number) => formatQuantity(n, unit);
              return (
                <li key={line.id} className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <ReserveDisclosure
                      open={isOpen}
                      name={name}
                      code={code}
                      controls={panelId}
                      onToggle={() => toggle(line.id)}
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{name}</h3>
                      <div className="mt-1">
                        <LogisticsCodeBadge code={code} />
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">План</dt>
                      <dd className="text-sm tabular-nums">{q(line.quantity)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Свободно</dt>
                      <dd className="text-sm tabular-nums">{q(breakdown.free)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">В резерве</dt>
                      <dd className="text-sm tabular-nums">{q(reservedTotal)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Выпущено</dt>
                      <dd className="text-sm tabular-nums">{q(outputted)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Действие</dt>
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
                    {isOpen
                      ? assignments.map((item, index) => (
                          <div
                            key={`${item.ownerType}:${item.ownerId}`}
                            id={index === 0 ? panelId : undefined}
                            className={cn(
                              "col-span-full grid grid-cols-2 gap-x-3 bg-muted/30 py-2 sm:grid-cols-3",
                              index === 0 && "border-t border-border",
                            )}
                          >
                            <div className="col-span-full">
                              <ReservationOwner snapshot={snapshot} assignment={item} />
                            </div>
                            <div className="text-sm tabular-nums">{formatQuantity(item.quantity)}</div>
                            <div className="text-sm tabular-nums">0</div>
                            <div className="text-sm font-semibold tabular-nums">{formatQuantity(item.quantity)}</div>
                            <div className="text-sm tabular-nums">0</div>
                          </div>
                        ))
                      : null}
                    {isOpen && (assignments.length === 0 || breakdown.free > 0) ? (
                      <div
                        id={assignments.length === 0 ? panelId : undefined}
                        className={cn(
                          "col-span-full grid grid-cols-2 gap-x-3 bg-muted/30 py-2 sm:grid-cols-3",
                          assignments.length === 0 && "border-t border-border",
                        )}
                      >
                        <div className="col-span-full text-sm text-muted-foreground">Свободно</div>
                        <div className="text-sm tabular-nums">{formatQuantity(breakdown.free)}</div>
                        <div className="text-sm font-semibold tabular-nums">{formatQuantity(breakdown.free)}</div>
                        <div className="text-sm tabular-nums">0</div>
                        <div className="text-sm tabular-nums">0</div>
                      </div>
                    ) : null}
                    {isOpen && outputted > 0 ? (
                      <div className="col-span-full grid grid-cols-2 gap-x-3 bg-muted/30 py-2 sm:grid-cols-3">
                        <div className="col-span-full text-sm text-muted-foreground">Выпущено</div>
                        <div className="text-sm tabular-nums">{formatQuantity(outputted)}</div>
                        <div className="text-sm tabular-nums">0</div>
                        <div className="text-sm tabular-nums">0</div>
                        <div className="text-sm font-semibold tabular-nums">{formatQuantity(outputted)}</div>
                      </div>
                    ) : null}
                  </dl>
                </li>
              );
            })}
          </ul>
        </>
      );

  if (bare) {
    return tableBody;
  }

  return (
    <section id="products" className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 tabIndex={-1} className="text-base font-semibold outline-none">
          Товары
        </h2>
        {action}
      </div>
      {tableBody}
    </section>
  );
};
