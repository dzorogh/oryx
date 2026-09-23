// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hrefForOwner } from "@/features/logistics/logistics-availability";
import { OWNER_TYPE_LABELS, formatExpectedEnd, formatQuantity, formatTimestamp } from "@/features/logistics/logistics-labels";
import { ownerLabel, productById, productCode } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot, OwnerType, ProductionOutput, ProductionOutputLine } from "@/features/logistics/logistics-types";
import { isFreeOwner } from "@/features/logistics/logistics-types";
import { documentCompletedAt } from "@/features/logistics/document-timeline";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { OutputStatusBadge } from "@/features/logistics/ui/status-badge";
import { DOCUMENT_TABLE_HEAD_CLASS } from "@/features/logistics/ui/logistics-table-card";
import { cn } from "@/lib/utils";

const distinctOutputOwners = (
  lines: ProductionOutputLine[],
): Array<{ type: OwnerType; id: string }> => {
  const seen = new Map<string, { type: OwnerType; id: string }>();
  for (const line of lines) {
    if (isFreeOwner(line.toOwnerType, line.toOwnerId) || !line.toOwnerType || !line.toOwnerId) {
      continue;
    }
    const key = `${line.toOwnerType}:${line.toOwnerId}`;
    if (!seen.has(key)) {
      seen.set(key, { type: line.toOwnerType, id: line.toOwnerId });
    }
  }
  return [...seen.values()];
};

const AssignedOwners = ({
  snapshot,
  lines,
}: {
  snapshot: LogisticsSnapshot;
  lines: ProductionOutputLine[];
}) => {
  const owners = distinctOutputOwners(lines);
  if (owners.length === 0) {
    return <span className="text-muted-foreground/50">Свободно</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {owners.map((owner) => (
        <span key={`${owner.type}:${owner.id}`} className="inline-flex items-center gap-1.5">
          {owner.type === "region" ? (
            <span className="font-medium text-foreground">{OWNER_TYPE_LABELS.region}</span>
          ) : null}
          <LogisticsCodeBadge
            code={ownerLabel(snapshot, owner.type, owner.id)}
            href={hrefForOwner(owner.type, owner.id, snapshot) ?? undefined}
          />
        </span>
      ))}
    </span>
  );
};

const OutputLinesGroup = ({
  snapshot,
  outputId,
  lines,
  visualQuantityColumn,
}: {
  snapshot: LogisticsSnapshot;
  outputId: string;
  lines: Array<{ id: string; productId: string; quantity: number }>;
  visualQuantityColumn?: boolean;
}) => (
  <ul className="grid gap-1.5" aria-label={`Товары и количество выпуска ${outputId}`}>
    {lines.map((line) => {
      const product = productById(snapshot, line.productId);
      const name = product?.name ?? line.productId;
      const code = productCode(snapshot, line.productId);
      const qty = formatQuantity(line.quantity, product?.unit);
      return (
        <li key={line.id} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{name}</span>
          <LogisticsCodeBadge code={code} />
          {visualQuantityColumn ? (
            <span className="sr-only">{`Количество: ${qty}`}</span>
          ) : (
            <span className="text-sm tabular-nums">{qty}</span>
          )}
        </li>
      );
    })}
  </ul>
);

export const ProductionOrderOutputs = ({
  snapshot,
  outputs,
  canMutate,
  onCreate,
  bare = false,
}: {
  snapshot: LogisticsSnapshot;
  outputs: ProductionOutput[];
  canMutate: boolean;
  onCreate?: () => void;
  bare?: boolean;
}) => {
  const action: ReactNode =
    !bare && canMutate && onCreate ? (
      <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onCreate}>
        Новый выпуск
      </Button>
    ) : null;

  return (
    <section
      id="outputs"
      className={
        bare
          ? undefined
          : "scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card"
      }
    >
      {bare ? null : (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
          <h2 tabIndex={-1} className="text-base font-semibold outline-none">
            Выпуски
          </h2>
          {action}
        </div>
      )}

      {outputs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Выпусков пока нет.</p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Номер</TableHead>
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Товары</TableHead>
                  <TableHead className={cn(DOCUMENT_TABLE_HEAD_CLASS, "text-right")}>Количество</TableHead>
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Закреплено за</TableHead>
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Статус</TableHead>
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Ожидаемое окончание</TableHead>
                  <TableHead className={DOCUMENT_TABLE_HEAD_CLASS}>Завершён</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.map((item) => {
                  const itemLines = snapshot.outputLines.filter((line) => line.outputId === item.id);
                  const completed = documentCompletedAt(snapshot, item.id);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="px-3 py-2 align-top">
                        <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.sequenceNumber}`} />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <OutputLinesGroup
                          snapshot={snapshot}
                          outputId={item.number}
                          lines={itemLines}
                          visualQuantityColumn
                        />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top text-right" aria-hidden="true">
                        <div className="grid gap-1.5">
                          {itemLines.map((line) => {
                            const product = productById(snapshot, line.productId);
                            return (
                              <span key={line.id} className="text-sm tabular-nums">
                                {formatQuantity(line.quantity, product?.unit)}
                              </span>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <AssignedOwners snapshot={snapshot} lines={itemLines} />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <OutputStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top text-sm tabular-nums">
                        {formatExpectedEnd(item.expectedEndOn)}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top text-sm tabular-nums text-muted-foreground">
                        {completed ? formatTimestamp(completed) : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border lg:hidden">
            {outputs.map((item) => {
              const itemLines = snapshot.outputLines.filter((line) => line.outputId === item.id);
              return (
                <li key={item.id} className="px-4 py-3">
                  <article aria-labelledby={`output-heading-${item.id}`}>
                    <h3 id={`output-heading-${item.id}`} className="text-sm font-semibold">
                      Выпуск {item.number}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">Номер</dt>
                        <dd>
                          <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.sequenceNumber}`} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Статус</dt>
                        <dd>
                          <OutputStatusBadge status={item.status} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Закреплено за</dt>
                        <dd>
                          <AssignedOwners snapshot={snapshot} lines={itemLines} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Ожидаемое окончание</dt>
                        <dd className="text-sm tabular-nums">{formatExpectedEnd(item.expectedEndOn)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Завершён</dt>
                        <dd className="text-sm tabular-nums text-muted-foreground">
                          {(() => {
                            const completed = documentCompletedAt(snapshot, item.id);
                            return completed ? formatTimestamp(completed) : "—";
                          })()}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-muted-foreground">Товары и количество</h4>
                      <ul className="mt-2 grid gap-2">
                        {itemLines.map((line) => {
                          const product = productById(snapshot, line.productId);
                          return (
                            <li key={line.id}>
                              <dl className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
                                <div>
                                  <dt className="sr-only">Товар</dt>
                                  <dd>
                                    {product?.name ?? line.productId}{" "}
                                    <LogisticsCodeBadge code={productCode(snapshot, line.productId)} />
                                  </dd>
                                </div>
                                <div>
                                  <dt className="sr-only">Количество</dt>
                                  <dd className="font-medium tabular-nums">
                                    {formatQuantity(line.quantity, product?.unit)}
                                  </dd>
                                </div>
                              </dl>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
};
