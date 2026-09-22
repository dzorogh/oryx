// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatExpectedEnd, formatQuantity } from "@/features/logistics/logistics-labels";
import { productById, productCode } from "@/features/logistics/logistics-lookups";
import { relatedOrdersForOutput } from "@/features/logistics/logistics-related";
import type { LogisticsSnapshot, ProductionOutput } from "@/features/logistics/logistics-types";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { OutputStatusBadge } from "@/features/logistics/ui/status-badge";

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
}: {
  snapshot: LogisticsSnapshot;
  outputs: ProductionOutput[];
  canMutate: boolean;
  onCreate?: () => void;
}) => {
  const action: ReactNode =
    canMutate && onCreate ? (
      <Button type="button" size="sm" className="h-7 px-2.5 text-xs" onClick={onCreate}>
        Новый выпуск
      </Button>
    ) : null;

  return (
    <section id="outputs" className="scroll-mt-20 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
        <h2 tabIndex={-1} className="text-base font-semibold outline-none">
          Выпуски
        </h2>
        {action}
      </div>

      {outputs.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">Выпусков пока нет.</p>
      ) : (
        <>
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-3">Номер</TableHead>
                  <TableHead className="px-3">Товары</TableHead>
                  <TableHead className="px-3">Количество</TableHead>
                  <TableHead className="px-3">Под заказ клиента</TableHead>
                  <TableHead className="px-3">Статус</TableHead>
                  <TableHead className="px-3">Ожидаемое окончание</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outputs.map((item) => {
                  const itemLines = snapshot.outputLines.filter((line) => line.outputId === item.id);
                  const orders = relatedOrdersForOutput(snapshot, item.id);
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
                      <TableCell className="px-3 py-2 align-top" aria-hidden="true">
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
                        {orders.length === 0 ? (
                          "—"
                        ) : (
                          <span className="inline-flex flex-wrap items-center gap-1.5">
                            {orders.map((order) => (
                              <LogisticsCodeBadge key={order.id} code={order.label} href={order.href} />
                            ))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top">
                        <OutputStatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="px-3 py-2 align-top text-sm tabular-nums">
                        {formatExpectedEnd(item.expectedEndOn)}
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
              const orders = relatedOrdersForOutput(snapshot, item.id);
              return (
                <li key={item.id} className="px-4 py-3">
                  <article aria-labelledby={`output-heading-${item.id}`}>
                    <h3 id={`output-heading-${item.id}`} className="text-sm font-semibold">
                      Выпуск {item.number}
                    </h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Номер</dt>
                        <dd>
                          <LogisticsCodeBadge code={item.number} href={`/store/logistics/outputs/${item.sequenceNumber}`} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Статус</dt>
                        <dd>
                          <OutputStatusBadge status={item.status} />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Под заказ клиента</dt>
                        <dd>
                          {orders.length === 0 ? (
                            "—"
                          ) : (
                            <span className="inline-flex flex-wrap items-center gap-1.5">
                              {orders.map((order) => (
                                <LogisticsCodeBadge key={order.id} code={order.label} href={order.href} />
                              ))}
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] text-muted-foreground">Ожидаемое окончание</dt>
                        <dd className="text-sm tabular-nums">{formatExpectedEnd(item.expectedEndOn)}</dd>
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
