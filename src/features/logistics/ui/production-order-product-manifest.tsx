// english-ui:ignore-file
"use client";

import { Fragment, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  hrefForOwner,
  productionProductOutputs,
  remainingPlanForProductionProduct,
  type ProductionLineReservation,
  type ProductionProductOutputRow,
} from "@/features/logistics/logistics-availability";
import { formatQuantity, LEDGER_ASSIGNED_TO_KIND_LABELS } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById, productCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, ProductionOrderLine } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { DOCUMENT_TABLE_HEAD_CLASS } from "@/features/logistics/ui/logistics-table-card";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import type { OutputReleaseTarget } from "@/features/logistics/ui/output-release-dialog";
import { OutputStatusBadge } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";

const Disclosure = ({
  open,
  label,
  controls,
  onToggle,
}: {
  open: boolean;
  label: string;
  controls: string;
  onToggle: () => void;
}) => (
  <button
    type="button"
    className="inline-flex size-11 shrink-0 items-center justify-center rounded-md text-foreground md:size-8"
    aria-expanded={open}
    aria-controls={open ? controls : undefined}
    aria-label={open ? `Свернуть ${label}` : `Развернуть ${label}`}
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
  released = false,
}: {
  snapshot: LogisticsSnapshot;
  assignment: ProductionLineReservation;
  released?: boolean;
}) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="text-sm text-muted-foreground">
      {released ? "Выпущено под: " : null}
      {LEDGER_ASSIGNED_TO_KIND_LABELS[assignment.ownerType]}
    </span>
    <LogisticsCodeBadge
      code={ownerLabel(snapshot, assignment.ownerType, assignment.ownerId)}
      href={hrefForOwner(assignment.ownerType, assignment.ownerId, snapshot) ?? undefined}
    />
  </div>
);

const outputHref = (row: ProductionProductOutputRow) => `/store/logistics/outputs/${row.output.sequenceNumber}`;

const sortedReserved = (snapshot: LogisticsSnapshot, row: ProductionProductOutputRow) =>
  [...row.reserved].sort((left, right) =>
    ownerLabel(snapshot, left.ownerType, left.ownerId).localeCompare(
      ownerLabel(snapshot, right.ownerType, right.ownerId),
    ),
  );

const reservedTotal = (row: ProductionProductOutputRow) =>
  row.reserved.reduce((sum, item) => sum + item.quantity, 0);

const NUM_CELL = "px-3 py-1.5 text-right text-sm tabular-nums";
const MUTED_ZERO = "text-muted-foreground/50";

type ReleaseHandler = (row: ProductionProductOutputRow, item: ProductionLineReservation) => void;

const ReleaseButton = ({
  row,
  item,
  onRelease,
  className,
}: {
  row: ProductionProductOutputRow;
  item: ProductionLineReservation;
  onRelease?: ReleaseHandler;
  className?: string;
}) =>
  onRelease && row.output.status === "draft" ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-7 shrink-0 px-2.5 text-xs", className)}
      aria-label={`Снять резерв в выпуске ${row.output.number}`}
      onClick={() => onRelease(row, item)}
    >
      Снять
    </Button>
  ) : null;

type ReserveHandler = (row: ProductionProductOutputRow) => void;

const ReserveInOutputButton = ({
  row,
  onReserve,
  className,
}: {
  row: ProductionProductOutputRow;
  onReserve?: ReserveHandler;
  className?: string;
}) =>
  onReserve && row.output.status === "draft" && row.free > 0 ? (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("h-7 shrink-0 px-2.5 text-xs", className)}
      aria-label={`Зарезервировать в выпуске ${row.output.number}`}
      onClick={() => onReserve(row)}
    >
      Зарезервировать
    </Button>
  ) : null;

const OutputsTable = ({
  snapshot,
  lineId,
  rows,
  unit,
  expandedOutputs,
  onToggleOutput,
  onRelease,
  onReserve,
}: {
  snapshot: LogisticsSnapshot;
  lineId: string;
  rows: ProductionProductOutputRow[];
  unit?: string;
  expandedOutputs: Set<string>;
  onToggleOutput: (key: string) => void;
  onRelease?: ReleaseHandler;
  onReserve?: ReserveHandler;
}) => {
  const q = (n: number) => formatQuantity(n, unit);
  if (rows.length === 0) {
    return <p className="px-3 py-3 text-sm text-muted-foreground">Выпусков с этим товаром пока нет.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Выпуск</TableHead>
          <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Статус</TableHead>
          <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Количество</TableHead>
          <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Свободно</TableHead>
          <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>В резерве</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const key = `${lineId}:${row.output.id}`;
          const isOpen = expandedOutputs.has(key);
          const panelId = `po-output-${key}`;
          const reserved = reservedTotal(row);
          return (
            <Fragment key={row.output.id}>
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-3 py-1.5">
                  <div className="flex items-center gap-1.5">
                    <Disclosure
                      open={isOpen}
                      label={`резервы выпуска ${row.output.number}`}
                      controls={panelId}
                      onToggle={() => onToggleOutput(key)}
                    />
                    <LogisticsCodeBadge code={row.output.number} href={outputHref(row)} />
                  </div>
                </TableCell>
                <TableCell className="px-3 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <OutputStatusBadge status={row.output.status} />
                    <ReserveInOutputButton row={row} onReserve={onReserve} />
                  </div>
                </TableCell>
                <TableCell className={NUM_CELL}>{q(row.quantity)}</TableCell>
                <TableCell className={cn(NUM_CELL, row.free > 0 ? undefined : MUTED_ZERO)}>{q(row.free)}</TableCell>
                <TableCell className={cn(NUM_CELL, reserved > 0 ? undefined : MUTED_ZERO)}>{q(reserved)}</TableCell>
              </TableRow>
              {isOpen
                ? sortedReserved(snapshot, row).map((item, index) => (
                    <TableRow
                      key={`${item.ownerType}:${item.ownerId}`}
                      id={index === 0 ? panelId : undefined}
                      className="bg-muted/40 hover:bg-muted/40"
                    >
                      <TableCell className="py-1.5 pl-14 pr-3" colSpan={3}>
                        <div className="flex items-center justify-between gap-2">
                          <ReservationOwner
                            snapshot={snapshot}
                            assignment={item}
                            released={row.output.status === "done"}
                          />
                          <ReleaseButton row={row} item={item} onRelease={onRelease} />
                        </div>
                      </TableCell>
                      <TableCell className={cn(NUM_CELL, MUTED_ZERO)}>—</TableCell>
                      <TableCell className={cn(NUM_CELL, "font-semibold")}>{q(item.quantity)}</TableCell>
                    </TableRow>
                  ))
                : null}
              {isOpen && (row.reserved.length === 0 || row.free > 0) ? (
                <TableRow id={row.reserved.length === 0 ? panelId : undefined} className="bg-muted/40 hover:bg-muted/40">
                  <TableCell className="py-1.5 pl-14 pr-3 text-sm text-muted-foreground" colSpan={3}>
                    Свободно
                  </TableCell>
                  <TableCell className={cn(NUM_CELL, "font-semibold")}>{q(row.free)}</TableCell>
                  <TableCell className={cn(NUM_CELL, MUTED_ZERO)}>—</TableCell>
                </TableRow>
              ) : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};

const OutputsList = ({
  snapshot,
  lineId,
  rows,
  unit,
  expandedOutputs,
  onToggleOutput,
  onRelease,
  onReserve,
}: {
  snapshot: LogisticsSnapshot;
  lineId: string;
  rows: ProductionProductOutputRow[];
  unit?: string;
  expandedOutputs: Set<string>;
  onToggleOutput: (key: string) => void;
  onRelease?: ReleaseHandler;
  onReserve?: ReserveHandler;
}) => {
  const q = (n: number) => formatQuantity(n, unit);
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Выпусков с этим товаром пока нет.</p>;
  }
  return (
    <ul className="grid gap-2">
      {rows.map((row) => {
        const key = `${lineId}:${row.output.id}`;
        const isOpen = expandedOutputs.has(key);
        const panelId = `po-output-list-${key}`;
        return (
          <li key={row.output.id} className="rounded-md bg-muted/30 p-2">
            <div className="flex items-center gap-1.5">
              <Disclosure
                open={isOpen}
                label={`резервы выпуска ${row.output.number}`}
                controls={panelId}
                onToggle={() => onToggleOutput(key)}
              />
              <LogisticsCodeBadge code={row.output.number} href={outputHref(row)} />
              <OutputStatusBadge status={row.output.status} />
              <ReserveInOutputButton row={row} onReserve={onReserve} className="ml-auto h-11" />
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-x-3">
              <div>
                <dt className="text-xs text-muted-foreground">Количество</dt>
                <dd className="text-sm tabular-nums">{q(row.quantity)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Свободно</dt>
                <dd className="text-sm tabular-nums">{q(row.free)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">В резерве</dt>
                <dd className="text-sm tabular-nums">{q(reservedTotal(row))}</dd>
              </div>
            </dl>
            {isOpen ? (
              <ul id={panelId} className="mt-2 grid gap-1.5 border-t border-border pt-2">
                {sortedReserved(snapshot, row).map((item) => (
                  <li key={`${item.ownerType}:${item.ownerId}`} className="flex items-center justify-between gap-2">
                    <ReservationOwner
                      snapshot={snapshot}
                      assignment={item}
                      released={row.output.status === "done"}
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">{q(item.quantity)}</span>
                      <ReleaseButton row={row} item={item} onRelease={onRelease} className="h-11" />
                    </div>
                  </li>
                ))}
                {row.reserved.length === 0 || row.free > 0 ? (
                  <li className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Свободно</span>
                    <span className="text-sm font-semibold tabular-nums">{q(row.free)}</span>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

export const ProductionOrderProductManifest = ({
  snapshot,
  lines,
  canMutate,
  onAddProduct,
  onEdit,
  onReserve,
  onReleaseReservation,
  onReserveInOutput,
  bare = false,
}: {
  snapshot: LogisticsSnapshot;
  lines: ProductionOrderLine[];
  canMutate: boolean;
  onAddProduct?: () => void;
  onEdit?: (lineId: string) => void;
  onReserve: (lineId: string) => void;
  onReleaseReservation?: (target: OutputReleaseTarget) => void;
  onReserveInOutput?: (outputId: string, productId: string) => void;
  bare?: boolean;
}) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(() => new Set());

  const toggleIn = (setter: typeof setExpanded) => (key: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  const toggle = toggleIn(setExpanded);
  const toggleOutput = toggleIn(setExpandedOutputs);

  const action: ReactNode =
    !bare && canMutate && onAddProduct ? (
      <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onAddProduct}>
        Добавить товар
      </Button>
    ) : null;

  const lineView = (line: ProductionOrderLine) => {
    const product = productById(snapshot, line.productId);
    const unit = line.productUnit || product?.unit;
    const name = line.productName || product?.name || line.productId;
    const code = productCode(snapshot, line.productId);
    const outputs = productionProductOutputs(snapshot, line.orderId, line.productId);
    const planRoom = remainingPlanForProductionProduct(snapshot, line.orderId, line.productId, line.quantity);
    const draftFree = outputs.rows.some((row) => row.output.status === "draft" && row.free > 0);
    const onRelease: ReleaseHandler | undefined =
      canMutate && onReleaseReservation
        ? (row, item) =>
            onReleaseReservation({
              outputId: row.output.id,
              outputNumber: row.output.number,
              ownerType: item.ownerType,
              ownerId: item.ownerId,
              productId: line.productId,
              quantity: item.quantity,
            })
        : undefined;
    const onReserveRow: ReserveHandler | undefined =
      canMutate && onReserveInOutput ? (row) => onReserveInOutput(row.output.id, line.productId) : undefined;
    return {
      unit,
      name,
      code,
      outputs,
      onRelease,
      onReserveRow,
      showReserve: canMutate && (planRoom > 0 || draftFree),
      q: (n: number) => formatQuantity(n, unit),
    };
  };

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
                <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>В выпусках</TableHead>
                <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Выпущено</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const view = lineView(line);
                const isOpen = expanded.has(line.id);
                const panelId = `po-outputs-${line.id}`;
                return (
                  <Fragment key={line.id}>
                    <TableRow className="group/row">
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-1.5">
                            <Disclosure
                              open={isOpen}
                              label={`выпуски ${view.name}, ${view.code}`}
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
                          {view.showReserve || onEdit ? (
                            <div className="flex gap-1 opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 motion-reduce:transition-none">
                              {onEdit ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 shrink-0"
                                  onClick={() => onEdit(line.id)}
                                >
                                  Изменить
                                </Button>
                              ) : null}
                              {view.showReserve ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-8 shrink-0"
                                  onClick={() => onReserve(line.id)}
                                >
                                  Зарезервировать
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm tabular-nums">{view.q(line.quantity)}</TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                        {view.q(view.outputs.inOutputs)}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-right text-sm tabular-nums">
                        {view.q(view.outputs.outputted)}
                      </TableCell>
                    </TableRow>
                    {isOpen ? (
                      <TableRow id={panelId} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={4} className="py-2 pl-12 pr-3">
                          <div className="overflow-hidden rounded-md border border-border bg-card">
                            <OutputsTable
                              snapshot={snapshot}
                              lineId={line.id}
                              rows={view.outputs.rows}
                              unit={view.unit}
                              expandedOutputs={expandedOutputs}
                              onToggleOutput={toggleOutput}
                              onRelease={view.onRelease}
                              onReserve={view.onReserveRow}
                            />
                          </div>
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
            const view = lineView(line);
            const isOpen = expanded.has(line.id);
            const panelId = `po-outputs-list-${line.id}`;
            return (
              <li key={line.id} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <Disclosure
                    open={isOpen}
                    label={`выпуски ${view.name}, ${view.code}`}
                    controls={panelId}
                    onToggle={() => toggle(line.id)}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">{view.name}</h3>
                    <div className="mt-1">
                      <LogisticsCodeBadge code={view.code} />
                    </div>
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-x-3 gap-y-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">План</dt>
                    <dd className="text-sm tabular-nums">{view.q(line.quantity)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">В выпусках</dt>
                    <dd className="text-sm tabular-nums">{view.q(view.outputs.inOutputs)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Выпущено</dt>
                    <dd className="text-sm tabular-nums">{view.q(view.outputs.outputted)}</dd>
                  </div>
                </dl>
                {onEdit || view.showReserve ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onEdit ? (
                      <Button type="button" size="sm" variant="outline" className="h-11" onClick={() => onEdit(line.id)}>
                        Изменить
                      </Button>
                    ) : null}
                    {view.showReserve ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-11"
                        onClick={() => onReserve(line.id)}
                      >
                        Зарезервировать
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {isOpen ? (
                  <div id={panelId} className="mt-3">
                    <OutputsList
                      snapshot={snapshot}
                      lineId={line.id}
                      rows={view.outputs.rows}
                      unit={view.unit}
                      expandedOutputs={expandedOutputs}
                      onToggleOutput={toggleOutput}
                      onRelease={view.onRelease}
                      onReserve={view.onReserveRow}
                    />
                  </div>
                ) : null}
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
