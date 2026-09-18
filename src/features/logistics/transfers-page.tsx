// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  cancelDocument,
  completeTransfer,
  deleteRows,
  insertRows,
  insertReturningId,
  sendTransfer,
  updateExpectedEnd,
  updateRow,
} from "@/features/logistics/logistics-api";
import { freeAtPlace, hrefForCustomerOrder, reservedOrderLinesAtWarehouse } from "@/features/logistics/logistics-availability";
import { formatExpectedEnd, formatQuantity } from "@/features/logistics/logistics-labels";
import {
  customerOrderById,
  productById,
  productIdentityLabel,
  warehouseCode,
  warehouseSelectItems,
} from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { assertAllocationWithinLine, assertEnoughStock } from "@/features/logistics/logistics-rules";
import type { LogisticsSnapshot, StockBalance, TransferLine, TransferStatus } from "@/features/logistics/logistics-types";
import { AvailabilityPanel } from "@/features/logistics/ui/availability-panel";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { isAllowedQuantity, QuantityField } from "@/features/logistics/ui/quantity-field";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsMetaField, LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { TransferStatusBadge } from "@/features/logistics/ui/status-badge";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";

const STATUS_FILTERS: Array<{ id: "all" | TransferStatus; label: string }> = [
  { id: "all", label: "Все" },
  { id: "draft", label: "Черновик" },
  { id: "sent", label: "Отправлено" },
  { id: "delivered", label: "Доставлено" },
  { id: "cancelled", label: "Отменён" },
];

const emptyTransferLine = () => ({
  productId: "",
  quantity: "1",
  allocLineId: "none",
  allocQty: "0",
});

type TransferDraftLine = ReturnType<typeof emptyTransferLine>;

const transferLineMax = (
  balances: StockBalance[],
  snapshot: LogisticsSnapshot,
  warehouseId: string,
  productId: string,
  allocLineId: string,
): number => {
  if (!productId || !warehouseId) {
    return 0;
  }
  const sourceFree = freeAtPlace(balances, productId, "warehouse", warehouseId);
  if (allocLineId && allocLineId !== "none") {
    const reserved =
      reservedOrderLinesAtWarehouse(snapshot, balances, warehouseId, productId).find(
        (item) => item.line.id === allocLineId,
      )?.reserved ?? 0;
    return reserved + sourceFree;
  }
  return sourceFree;
};

const validateTransferLines = (
  lines: TransferDraftLine[],
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  warehouseId: string,
): TransferDraftLine[] | null => {
  const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
  if (validLines.length === 0) {
    toast.error("Добавьте хотя бы одну строку с товаром и количеством");
    return null;
  }
  const productIds = validLines.map((line) => line.productId);
  if (new Set(productIds).size !== productIds.length) {
    toast.error("Один товар можно указать только один раз");
    return null;
  }
  for (const line of validLines) {
    const sendMax = transferLineMax(balances, snapshot, warehouseId, line.productId, line.allocLineId);
    if (!isAllowedQuantity(line.quantity, sendMax)) {
      toast.error("Нельзя переместить больше доступного на складе отправления");
      return null;
    }
    const allocated =
      line.allocLineId && line.allocLineId !== "none" && Number(line.allocQty) > 0 ? Number(line.allocQty) : 0;
    try {
      assertEnoughStock(sendMax, Number(line.quantity), "warehouse");
      assertAllocationWithinLine(Number(line.quantity), allocated);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Недостаточно остатка");
      return null;
    }
  }
  return validLines;
};

const draftFromSavedLine = (
  line: TransferLine,
  allocation?: { customerOrderLineId: string; quantity: number },
): TransferDraftLine => ({
  productId: line.productId,
  quantity: String(line.quantity),
  allocLineId: allocation?.customerOrderLineId ?? "none",
  allocQty: allocation ? String(allocation.quantity) : "0",
});

const allocationInsert = (
  snapshot: LogisticsSnapshot,
  lineId: string,
  line: TransferDraftLine,
): Record<string, unknown> | null => {
  if (!line.allocLineId || line.allocLineId === "none" || !(Number(line.allocQty) > 0)) {
    return null;
  }
  const orderLine = snapshot.customerOrderLines.find((item) => item.id === line.allocLineId);
  if (!orderLine) {
    return null;
  }
  return {
    line_id: lineId,
    customer_order_id: orderLine.orderId,
    customer_order_line_id: orderLine.id,
    quantity: Number(line.allocQty),
  };
};

export const TransfersPage = () => {
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [lines, setLines] = useState<TransferDraftLine[]>([emptyTransferLine()]);
  const [expectedEndOn, setExpectedEndOn] = useState("");

  const rows = snapshot.transfers.filter((item) => status === "all" || item.status === status);
  const usedProductIds = lines.map((line) => line.productId).filter(Boolean);
  const canAddLine = snapshot.products.some((product) => !usedProductIds.includes(product.id));
  const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
  const linesReady =
    validLines.length > 0 &&
    new Set(validLines.map((line) => line.productId)).size === validLines.length &&
    validLines.every((line) =>
      isAllowedQuantity(line.quantity, transferLineMax(balances, snapshot, fromId, line.productId, line.allocLineId)),
    );
  const canSubmit = Boolean(fromId && toId && fromId !== toId && linesReady);

  const resetForm = () => {
    setFromId("");
    setToId("");
    setExpectedEndOn("");
    setLines([emptyTransferLine()]);
  };

  const create = async () => {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Выберите два разных склада");
      return;
    }
    const prepared = validateTransferLines(lines, snapshot, balances, fromId);
    if (!prepared) {
      return;
    }
    const ok = await runLogisticsAction(
      async () => {
        const id = await insertReturningId("store_transfer", {
          from_warehouse_id: fromId,
          to_warehouse_id: toId,
          status: "draft",
          expected_end_on: expectedEndOn || null,
        });
        for (const line of prepared) {
          const lineId = await insertReturningId("store_transfer_line", {
            transfer_id: id,
            product_id: line.productId,
            quantity: Number(line.quantity),
          });
          const allocation = allocationInsert(snapshot, lineId, line);
          if (allocation) {
            await insertRows("store_transfer_allocation", allocation);
          }
        }
      },
      "Черновик перемещения создан",
      reload,
    );
    if (ok) {
      setOpen(false);
      resetForm();
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Перемещения" }]}>
      <LogisticsToolbar
        title="Перемещения"
        description="Со склада на склад. Несколько товаров в одном документе. Занятые части сохраняют заказ клиента на всём маршруте."
        actionLabel="Новое перемещение"
        onAction={() => setOpen(true)}
      >
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Статус перемещения">
          {STATUS_FILTERS.map((item) => (
            <HomeFilterChip
              key={item.id}
              active={status === item.id}
              role="tab"
              aria-selected={status === item.id}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </HomeFilterChip>
          ))}
        </div>
      </LogisticsToolbar>
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Номер", "Откуда", "Куда", "Товары", "Статус", "Ожидаемое окончание"]} isEmpty={rows.length === 0}>
          {rows.map((item) => {
            const itemLines = snapshot.transferLines.filter((line) => line.transferId === item.id);
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2">
                  <LogisticsCodeBadge
                    code={item.number}
                    href={`/store/logistics/transfers/${item.id}`}
                  />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <WarehouseLink snapshot={snapshot} warehouseId={item.fromWarehouseId} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  <WarehouseLink snapshot={snapshot} warehouseId={item.toWarehouseId} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm">
                  {itemLines
                    .map((line) => productById(snapshot, line.productId)?.name ?? line.productId)
                    .join(", ") || "—"}
                </TableCell>
                <TableCell className="px-3 py-2">
                  <TransferStatusBadge status={item.status} />
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">
                  {formatExpectedEnd(item.expectedEndOn)}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            resetForm();
          }
        }}
        title="Новое перемещение"
        description="Можно указать несколько товаров. Размещения — количества по заказу клиента; остаток строки остаётся свободным."
      >
        <div className="flex flex-col gap-3">
          <WarehouseSelect label="Склад отправления" value={fromId} onChange={setFromId} snapshot={snapshot} />
          <WarehouseSelect label="Склад назначения" value={toId} onChange={setToId} snapshot={snapshot} />
          <ExpectedEndField value={expectedEndOn} onChange={setExpectedEndOn} />
          {lines.map((line, index) => (
            <TransferLineFields
              key={`line-${index}`}
              snapshot={snapshot}
              balances={balances}
              warehouseId={fromId}
              line={line}
              usedProductIds={usedProductIds.filter((id) => id !== line.productId)}
              index={index}
              onChange={(next) => {
                setLines((current) => current.map((item, itemIndex) => (itemIndex === index ? next : item)));
              }}
            />
          ))}
          {canAddLine ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyTransferLine()])}
            >
              Добавить строку
            </Button>
          ) : null}
          <Button type="button" disabled={!canSubmit} onClick={() => void create()}>
            Сохранить черновик
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const TransferDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [lineOpen, setLineOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [formLine, setFormLine] = useState<TransferDraftLine>(emptyTransferLine());
  const doc = snapshot.transfers.find((item) => item.id === params.id);
  const lines = useMemo(
    () => snapshot.transferLines.filter((line) => line.transferId === params.id),
    [params.id, snapshot.transferLines],
  );
  const allocations = snapshot.transferAllocations.filter((item) =>
    lines.some((line) => line.id === item.lineId),
  );
  const occupiedProductIds = lines
    .filter((line) => line.id !== editingLineId)
    .map((line) => line.productId);
  const canEditLines = doc?.status === "draft";

  const resetLineDialog = () => {
    setLineOpen(false);
    setEditingLineId(null);
    setFormLine(emptyTransferLine());
  };

  const openAddLine = () => {
    setEditingLineId(null);
    setFormLine(emptyTransferLine());
    setLineOpen(true);
  };

  const openEditLine = (line: TransferLine) => {
    const allocation = allocations.find((item) => item.lineId === line.id);
    setEditingLineId(line.id);
    setFormLine(draftFromSavedLine(line, allocation));
    setLineOpen(true);
  };

  if (isLoading || error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Перемещения", href: "/store/logistics/transfers" }, { label: "Перемещение" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Перемещение не найдено."} />}
      </LogisticsPageShell>
    );
  }

  const saveLine = async () => {
    const prepared = validateTransferLines([formLine], snapshot, balances, doc.fromWarehouseId);
    if (!prepared) {
      return;
    }
    if (occupiedProductIds.includes(formLine.productId)) {
      toast.error("Один товар можно указать только один раз");
      return;
    }
    const ok = await runLogisticsAction(
      async () => {
        const lineId = editingLineId
          ?? await insertReturningId("store_transfer_line", {
            transfer_id: doc.id,
            product_id: formLine.productId,
            quantity: Number(formLine.quantity),
          });
        if (editingLineId) {
          await updateRow("store_transfer_line", lineId, {
            product_id: formLine.productId,
            quantity: Number(formLine.quantity),
          });
          await deleteRows("store_transfer_allocation", "line_id", lineId);
        }
        const allocation = allocationInsert(snapshot, lineId, formLine);
        if (allocation) {
          await insertRows("store_transfer_allocation", allocation);
        }
      },
      editingLineId ? "Строка перемещения обновлена" : "Товар добавлен в перемещение",
      reload,
    );
    if (ok) {
      resetLineDialog();
    }
  };

  const deleteLine = async () => {
    if (!editingLineId) {
      return;
    }
    const ok = await runLogisticsAction(
      () => deleteRows("store_transfer_line", "id", editingLineId),
      "Товар удалён из перемещения",
      reload,
    );
    if (ok) {
      resetLineDialog();
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Перемещения", href: "/store/logistics/transfers" }, { label: doc.number }]}>
      <LogisticsToolbar
        title={doc.number}
        description={`${warehouseCode(snapshot, doc.fromWarehouseId)} → ${warehouseCode(snapshot, doc.toWarehouseId)}`}
        actionLabel={doc.status === "draft" && lines.length > 0 ? "Отправить" : undefined}
        onAction={
          doc.status === "draft" && lines.length > 0
            ? () => {
              void runLogisticsAction(() => sendTransfer(doc.id), "Перемещение отправлено", reload);
            }
            : undefined
        }
        actions={
          doc.status === "sent" ? (
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  void runLogisticsAction(() => completeTransfer(doc.id), "Перемещение доставлено", reload);
                }}
              >
                Доставлено
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void runLogisticsAction(() => cancelDocument("transfer", doc.id), "Перемещение сторнировано", reload);
                }}
              >
                Отменить отправку
              </Button>
            </>
          ) : undefined
        }
      >
        <LogisticsMetaField label="Статус">
          <TransferStatusBadge status={doc.status} />
        </LogisticsMetaField>
        <ExpectedEndField
          layout="inline"
          value={doc.expectedEndOn ?? ""}
          onChange={(value) => {
            void runLogisticsAction(
              () => updateExpectedEnd("store_transfer", doc.id, value || null),
              "Срок перемещения обновлён",
              reload,
            );
          }}
        />
      </LogisticsToolbar>

      <LogisticsTableCard
        title="Товары"
        action={
          canEditLines ? (
            <Button type="button" size="sm" onClick={openAddLine}>
              Добавить товар
            </Button>
          ) : undefined
        }
        headers={
          canEditLines
            ? ["Товар", "Всего", "Размещено", "Свободно", "На складе А", ""]
            : ["Товар", "Всего", "Размещено", "Свободно", "На складе А"]
        }
        isEmpty={lines.length === 0}
        empty={canEditLines ? "Добавьте товар, пока перемещение в черновике." : "В этом перемещении нет товаров."}
      >
        {lines.map((line) => {
          const lineAllocations = allocations.filter((item) => item.lineId === line.id);
          const allocated = lineAllocations.reduce((sum, item) => sum + item.quantity, 0);
          const sourceFree = freeAtPlace(balances, line.productId, "warehouse", doc.fromWarehouseId);
          return (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2">
                <ProductIdentity
                  snapshot={snapshot}
                  productId={line.productId}
                  nameAs={canEditLines ? "text" : "link"}
                  name={
                    canEditLines ? (
                      <button
                        type="button"
                        className="text-left text-sm font-medium text-primary hover:underline"
                        onClick={() => openEditLine(line)}
                      >
                        {productById(snapshot, line.productId)?.name ?? line.productId}
                      </button>
                    ) : undefined
                  }
                />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(line.quantity)}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(allocated)}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(line.quantity - allocated)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(sourceFree)}</TableCell>
              {canEditLines ? (
                <TableCell className="px-3 py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => openEditLine(line)}>
                    Изменить
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          );
        })}
      </LogisticsTableCard>

      {allocations.length > 0 ? (
        <LogisticsTableCard title="Заказы клиента в перемещении" headers={["Заказ клиента", "Товар", "Количество"]}>
          {allocations.map((item) => {
            const line = lines.find((line) => line.id === item.lineId);
            const product = line ? productById(snapshot, line.productId) : undefined;
            const order = customerOrderById(snapshot, item.customerOrderId);
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2">
                  <LogisticsCodeBadge
                    code={order?.number ?? item.customerOrderId}
                    href={hrefForCustomerOrder(item.customerOrderId)}
                  />
                </TableCell>
                <TableCell className="px-3 py-2">
                  {line ? <ProductIdentity snapshot={snapshot} productId={line.productId} /> : "—"}
                </TableCell>
                <TableCell className="px-3 py-2 text-sm tabular-nums">
                  {formatQuantity(item.quantity, product?.unit)}
                </TableCell>
              </TableRow>
            );
          })}
        </LogisticsTableCard>
      ) : null}

      <DocumentLedger
        snapshot={snapshot}
        filter={(entry) =>
          entry.sourceId === doc.id ||
          (entry.locationType === "transfer" && entry.locationId === doc.id)
        }
      />

      <LogisticsDialog
        open={lineOpen}
        onOpenChange={(next) => {
          if (!next) {
            resetLineDialog();
            return;
          }
          setLineOpen(true);
        }}
        title={editingLineId ? "Изменить товар" : "Добавить товар"}
        description={
          editingLineId
            ? "Можно поменять товар, количество и размещение, пока перемещение в черновике."
            : "Строку можно добавить, пока перемещение в черновике."
        }
      >
        <div className="flex flex-col gap-3">
          <TransferLineFields
            snapshot={snapshot}
            balances={balances}
            warehouseId={doc.fromWarehouseId}
            line={formLine}
            usedProductIds={occupiedProductIds}
            onChange={setFormLine}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                !isAllowedQuantity(
                  formLine.quantity,
                  transferLineMax(balances, snapshot, doc.fromWarehouseId, formLine.productId, formLine.allocLineId),
                )
              }
              onClick={() => void saveLine()}
            >
              {editingLineId ? "Сохранить" : "Добавить"}
            </Button>
            {editingLineId ? (
              <Button type="button" variant="outline" onClick={() => void deleteLine()}>
                Удалить
              </Button>
            ) : null}
          </div>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

const TransferLineFields = ({
  snapshot,
  balances,
  warehouseId,
  line,
  usedProductIds,
  index,
  onChange,
}: {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  warehouseId: string;
  line: TransferDraftLine;
  usedProductIds: string[];
  index?: number;
  onChange: (next: TransferDraftLine) => void;
}) => {
  const reservedHere =
    line.productId && warehouseId
      ? reservedOrderLinesAtWarehouse(snapshot, balances, warehouseId, line.productId)
      : [];
  const sendMax = transferLineMax(balances, snapshot, warehouseId, line.productId, line.allocLineId);
  const suffix = index != null ? ` ${index + 1}` : "";

  return (
    <div className="space-y-2">
      <FieldSelect
        label={index === 0 ? "Товар" : `Товар${suffix}`}
        value={line.productId}
        items={snapshot.products
          .filter((item) => item.id === line.productId || !usedProductIds.includes(item.id))
          .map((item) => ({
            value: item.id,
            label: productIdentityLabel(
              item,
              item.id,
              warehouseId ? `свободно ${formatQuantity(freeAtPlace(balances, item.id, "warehouse", warehouseId))}` : undefined,
            ),
          }))}
        onChange={(productId) => {
          onChange({ ...emptyTransferLine(), productId, quantity: line.quantity });
        }}
      />
      {line.productId && !warehouseId ? (
        <AvailabilityPanel snapshot={snapshot} balances={balances} productId={line.productId} />
      ) : null}
      <QuantityField
        label="Общее количество"
        value={line.quantity}
        onChange={(quantity) => onChange({ ...line, quantity })}
        max={line.productId && warehouseId ? sendMax : undefined}
      />
      <FieldSelect
        label="Занято под строку заказа клиента"
        value={line.allocLineId}
        items={[
          { value: "none", label: "Нет — оставить свободным" },
          ...reservedHere.map((item) => ({
            value: item.line.id,
            label: `${customerOrderById(snapshot, item.line.orderId)?.number ?? item.line.orderId} · занято ${formatQuantity(item.reserved)}`,
          })),
        ]}
        onChange={(allocLineId) => onChange({ ...line, allocLineId, allocQty: allocLineId === "none" ? "0" : line.allocQty })}
      />
      {line.allocLineId && line.allocLineId !== "none" ? (
        <QuantityField
          label="Размещённое количество"
          value={line.allocQty}
          onChange={(allocQty) => onChange({ ...line, allocQty })}
          min={0}
          max={Math.min(
            reservedHere.find((item) => item.line.id === line.allocLineId)?.reserved ?? 0,
            Number(line.quantity) || 0,
          )}
        />
      ) : null}
    </div>
  );
};

const WarehouseSelect = ({
  label,
  value,
  onChange,
  snapshot,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  snapshot: ReturnType<typeof useLogisticsStore>["snapshot"];
}) => (
  <label className="space-y-1 text-sm">
    <span className="font-medium">{label}</span>
    <Select
      items={warehouseSelectItems(snapshot)}
      value={value}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger className="w-full bg-background" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {snapshot.warehouses.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.code}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  </label>
);
