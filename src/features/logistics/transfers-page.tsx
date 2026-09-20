// english-ui:ignore-file
"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { cancelDocument, completeTransfer, createAndSendTransfer, updateExpectedEnd } from "@/features/logistics/logistics-api";
import { freeAtPlace, hrefForOwner, hrefForTransfer } from "@/features/logistics/logistics-availability";
import { formatExpectedEnd, formatQuantity } from "@/features/logistics/logistics-labels";
import {
  ownerLabel,
  productById,
  productIdentityLabel,
  warehouseCode,
  warehouseSelectItems,
} from "@/features/logistics/logistics-lookups";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { assertEnoughStock } from "@/features/logistics/logistics-rules";
import type { LogisticsSnapshot, StockBalance, TransferStatus } from "@/features/logistics/logistics-types";
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
import {
  freeTransferPayload,
  newTransferRequestKey,
  openSentTransfer,
} from "@/features/logistics/transfer-direct-send";

const STATUS_FILTERS: Array<{ id: "all" | TransferStatus; label: string }> = [
  { id: "all", label: "Все" },
  { id: "sent", label: "Отправлено" },
  { id: "delivered", label: "Доставлено" },
  { id: "cancelled", label: "Отменён" },
];

const emptyTransferLine = () => ({
  productId: "",
  quantity: "1",
});

type TransferDraftLine = ReturnType<typeof emptyTransferLine>;

const transferLineMax = (balances: StockBalance[], warehouseId: string, productId: string): number => {
  if (!productId || !warehouseId) {
    return 0;
  }
  return freeAtPlace(balances, productId, "warehouse", warehouseId);
};

const validateTransferLines = (
  lines: TransferDraftLine[],
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
    const sendMax = transferLineMax(balances, warehouseId, line.productId);
    if (!isAllowedQuantity(line.quantity, sendMax)) {
      toast.error("Нельзя переместить больше доступного на складе отправления");
      return null;
    }
    try {
      assertEnoughStock(sendMax, Number(line.quantity), "warehouse");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Недостаточно остатка");
      return null;
    }
  }
  return validLines;
};

export const TransfersPage = () => {
  const router = useRouter();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]["id"]>("all");
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [lines, setLines] = useState<TransferDraftLine[]>([emptyTransferLine()]);
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [requestKey, setRequestKey] = useState(newTransferRequestKey);

  const rows = snapshot.transfers.filter((item) => status === "all" || item.status === status);
  const usedProductIds = lines.map((line) => line.productId).filter(Boolean);
  const canAddLine = snapshot.products.some((product) => !usedProductIds.includes(product.id));
  const validLines = lines.filter((line) => line.productId && Number(line.quantity) > 0);
  const linesReady =
    validLines.length > 0 &&
    new Set(validLines.map((line) => line.productId)).size === validLines.length &&
    validLines.every((line) => isAllowedQuantity(line.quantity, transferLineMax(balances, fromId, line.productId)));
  const canSubmit = Boolean(fromId && toId && fromId !== toId && linesReady);

  const resetForm = () => {
    setFromId("");
    setToId("");
    setExpectedEndOn("");
    setLines([emptyTransferLine()]);
    setRequestKey(newTransferRequestKey());
  };

  const create = async () => {
    if (!fromId || !toId || fromId === toId) {
      toast.error("Выберите два разных склада");
      return;
    }
    const prepared = validateTransferLines(lines, balances, fromId);
    if (!prepared) {
      return;
    }
    const ok = await runLogisticsAction(
      async () => {
        const created = await createAndSendTransfer(
          freeTransferPayload({
            requestKey,
            fromWarehouseId: fromId,
            toWarehouseId: toId,
            expectedEndOn: expectedEndOn || null,
            lines: prepared.map((line) => ({
              productId: line.productId,
              quantity: Number(line.quantity),
            })),
          }),
        );
        openSentTransfer(created, (href) => router.push(href));
      },
      "Transfer sent",
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
        description="Со склада на склад. Несколько товаров в одном документе. Свободный остаток уезжает свободным."
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
                  <LogisticsCodeBadge code={item.number} href={hrefForTransfer(item.id)} />
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
        description="Уедет только свободный остаток. Создание сразу отправляет документ."
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
            Send
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const TransferDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const doc = snapshot.transfers.find((item) => item.id === params.id);
  const lines = useMemo(
    () => snapshot.transferLines.filter((line) => line.transferId === params.id),
    [params.id, snapshot.transferLines],
  );
  const allocations = snapshot.transferAllocations.filter((item) =>
    lines.some((line) => line.id === item.lineId),
  );

  if (isLoading || error || !doc) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Перемещения", href: "/store/logistics/transfers" }, { label: "Перемещение" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Перемещение не найдено."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Перемещения", href: "/store/logistics/transfers" }, { label: doc.number }]}>
      <LogisticsToolbar
        title={doc.number}
        description={`${warehouseCode(snapshot, doc.fromWarehouseId)} → ${warehouseCode(snapshot, doc.toWarehouseId)}`}
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
        headers={["Товар", "Всего", "Размещено", "Свободно", "На складе А"]}
        isEmpty={lines.length === 0}
        empty="В этом перемещении нет товаров."
      >
        {lines.map((line) => {
          const lineAllocations = allocations.filter((item) => item.lineId === line.id);
          const allocated = lineAllocations.reduce((sum, item) => sum + item.quantity, 0);
          const sourceFree = freeAtPlace(balances, line.productId, "warehouse", doc.fromWarehouseId);
          return (
            <TableRow key={line.id}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={line.productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(line.quantity)}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(allocated)}</TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(line.quantity - allocated)}
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">{formatQuantity(sourceFree)}</TableCell>
            </TableRow>
          );
        })}
      </LogisticsTableCard>

      {allocations.length > 0 ? (
        <LogisticsTableCard title="Заказы клиента в перемещении" headers={["Заказ клиента", "Товар", "Количество"]}>
          {allocations.map((item) => {
            const line = lines.find((line) => line.id === item.lineId);
            const product = line ? productById(snapshot, line.productId) : undefined;
            return (
              <TableRow key={item.id}>
                <TableCell className="px-3 py-2">
                  <LogisticsCodeBadge
                    code={ownerLabel(snapshot, item.ownerType, item.ownerId)}
                    href={hrefForOwner(item.ownerType, item.ownerId) ?? undefined}
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
  const sendMax = transferLineMax(balances, warehouseId, line.productId);
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
