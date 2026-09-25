// english-ui:ignore-file
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { pluralTovar } from "@/features/logistics/category-tree";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createAndPostReservation,
  createAndSendTransfer,
  createProductionForOrder,
  createProductionOutput,
  ProductionForOrderOutputError,
  reserveInProductionOutput,
} from "@/features/logistics/logistics-api";
import { openSentTransfer } from "@/features/logistics/transfer-direct-send";
import {
  freeInDraftOutput,
  freeTransfersForProduct,
  remainingPlanForProductionProduct,
  remainingToOutputForLine,
  remainingToReserveForLine,
  remainingToReserveInProductionOutputsForLine,
  reservedInActiveOutputsForOrderProduct,
} from "@/features/logistics/logistics-availability";
import { TransferCreateDialog } from "@/features/logistics/ui/transfer-create-dialog";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import {
  customerOrderById,
  plantIdsForProducts,
  plantSelectItems,
  productById,
  productsForPlant,
  productionOrderById,
} from "@/features/logistics/logistics-lookups";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { ContextRowsTable, type ContextQuantityRow } from "@/features/logistics/ui/context-rows-table";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { firstErrorKey, formatLimitNumber, parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { focusQuantityInput } from "@/features/logistics/ui/catalog-quantity-table";
import { openCreatedDocuments, reportPartialCreate } from "@/features/logistics/ui/open-created-documents";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";
import { LOGISTICS_PATHS, logisticsPath } from "@/features/logistics/logistics-paths";
import {
  type CustomerOrderLine,
  type LogisticsSnapshot,
  type StockBalance,
} from "@/features/logistics/logistics-types";

type ActionFormProps = {
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reload: () => Promise<void>;
  customerOrderId: string;
  lines: CustomerOrderLine[];
};

export const relativeDayLabel = (isoDate: string, now = new Date()): string | null => {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "сегодня";
  if (days === 1) return "через 1 день";
  if (days > 1) return `через ${days} дн.`;
  if (days === -1) return "вчера";
  return `${Math.abs(days)} дн. назад`;
};

const plantsForOpenLines = (snapshot: LogisticsSnapshot, productIds: string[]) => {
  if (productIds.length === 0) return [] as Array<{ value: string; label: string }>;
  const perProduct = productIds.map((productId) => plantIdsForProducts(snapshot, [productId]));
  if (perProduct.some((ids) => ids === null)) return plantSelectItems(snapshot);
  const union = new Set(perProduct.flatMap((ids) => ids ?? []));
  return snapshot.plants.filter((item) => union.has(item.id)).map((item) => ({ value: item.id, label: item.code }));
};

const enteredQty = (quantities: Record<string, string>, key: string) =>
  parseDecimalQuantity(quantities[key] ?? "") ?? 0;

const positiveEntries = (quantities: Record<string, string>) =>
  Object.entries(quantities).flatMap(([key, raw]) => {
    const quantity = parseDecimalQuantity(raw);
    if (quantity == null || quantity <= 0) return [];
    return [{ key, quantity }];
  });

const sharedPoolLimit = (
  base: number,
  siblingKeys: string[],
  quantities: Record<string, string>,
) => Math.max(0, base - siblingKeys.reduce((sum, key) => sum + enteredQty(quantities, key), 0));

export const ProductionFromOrderForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  const [plantId, setPlantId] = useState("");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const didOpen = useRef(false);

  const openLines = useMemo(
    () => lines.filter((line) => remainingToReserveInProductionOutputsForLine(line, balances, snapshot) > 0),
    [balances, lines, snapshot],
  );
  const plantItems = useMemo(
    () => plantsForOpenLines(snapshot, openLines.map((line) => line.productId)),
    [openLines, snapshot],
  );
  const plantLines = useMemo(() => {
    if (!plantId) return [] as CustomerOrderLine[];
    const allowed = new Set(productsForPlant(snapshot, plantId).map((product) => product.id));
    return openLines.filter((line) => allowed.has(line.productId));
  }, [plantId, openLines, snapshot]);

  const seedQuantities = (nextLines: CustomerOrderLine[]) =>
    Object.fromEntries(
      nextLines.map((line) => [
        line.id,
        formatLimitNumber(remainingToReserveInProductionOutputsForLine(line, balances, snapshot)),
      ]),
    );

  useEffect(() => {
    if (!open) {
      didOpen.current = false;
      return;
    }
    if (didOpen.current) return;
    didOpen.current = true;
    const defaultPlant = plantItems.length === 1 ? plantItems[0].value : "";
    setPlantId(defaultPlant);
    setExpectedEndOn("");
    setServerError(null);
    if (!defaultPlant) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForPlant(snapshot, defaultPlant).map((product) => product.id));
    setQuantities(
      Object.fromEntries(
        openLines
          .filter((line) => allowed.has(line.productId))
          .map((line) => [
            line.id,
            formatLimitNumber(remainingToReserveInProductionOutputsForLine(line, balances, snapshot)),
          ]),
      ),
    );
  }, [open, openLines, plantItems, snapshot, balances]);

  const selectPlant = (nextId: string) => {
    setPlantId(nextId);
    if (!nextId) {
      setQuantities({});
      return;
    }
    const allowed = new Set(productsForPlant(snapshot, nextId).map((product) => product.id));
    setQuantities(seedQuantities(openLines.filter((line) => allowed.has(line.productId))));
  };

  const rows: ContextQuantityRow[] = plantLines.map((line) => {
    const product = productById(snapshot, line.productId);
    const max = remainingToReserveInProductionOutputsForLine(line, balances, snapshot);
    return {
      key: line.id,
      title: product?.name ?? line.productName,
      subtitle: product?.code,
      limitLabel: formatQuantity(max, product?.unit),
      limitHint: `из ${formatQuantity(line.quantity, product?.unit)}`,
      limit: max,
      unit: product?.unit ?? line.productUnit,
    };
  });

  const payload = plantLines.flatMap((line) => {
    const quantity = parseDecimalQuantity(quantities[line.id] ?? "");
    if (quantity == null || quantity <= 0) return [];
    return [{ productId: line.productId, quantity }];
  });
  const customerOrderNumber = customerOrderById(snapshot, customerOrderId)?.number ?? customerOrderId;
  const plantLabel = plantItems.find((item) => item.value === plantId)?.label;
  const expectedRelative = relativeDayLabel(expectedEndOn);

  const submit = async () => {
    if (submitting) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    if (!plantId || payload.length === 0) return;
    setSubmitting(true);
    setServerError(null);
    try {
      const created = await createProductionForOrder({
        plantId,
        customerOrderId,
        expectedEndOn: expectedEndOn || null,
        lines: payload,
      });
      await reload();
      onOpenChange(false);
      openCreatedDocuments(
        (href) => router.push(href),
        {
          href: logisticsPath("production-orders", created.sequenceNumber ?? created.productionOrderId),
          label: "Заказ на производство",
        },
        [{ href: logisticsPath("outputs", created.outputId), label: "Запланированный выпуск" }],
      );
    } catch (caught: unknown) {
      if (caught instanceof ProductionForOrderOutputError) {
        await reload();
        onOpenChange(false);
        toast.error("Заказ на производство создан, выпуск не создан", {
          description: translateLogisticsError(caught.message),
        });
        router.push(
          caught.sequenceNumber
            ? logisticsPath("production-orders", caught.sequenceNumber)
            : LOGISTICS_PATHS.productionOrders,
        );
        return;
      }
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  const placeholder =
    plantItems.length === 0
      ? openLines.length === 0
        ? "Этот заказ уже полностью закрыт."
        : "Нет доступного производителя."
      : !plantId
        ? "Выберите завод, чтобы задать количества."
        : plantLines.length === 0
          ? "У этого завода нет открытых позиций в заказе."
          : null;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      kicker={customerOrderNumber}
      title="Запустить производство"
      header={
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldSelect
            label="Завод"
            value={plantId}
            items={plantItems}
            onChange={selectPlant}
            placeholder="Выберите завод"
            emptyLabel={openLines.length === 0 ? "Нечего производить" : "Ни один завод не выпускает эти товары"}
          />
          <ExpectedEndField
            label="Ожидаемое окончание"
            optional
            hint={expectedRelative ?? undefined}
            value={expectedEndOn}
            onChange={setExpectedEndOn}
            id="production-order-expected-end"
          />
        </div>
      }
      footerSummary={
        payload.length
          ? [plantLabel, pluralTovar(payload.length)].filter(Boolean).join(" · ")
          : "Нет строк"
      }
      submitLabel="Запустить"
      onSubmit={() => void submit()}
      submitDisabled={!plantId || payload.length === 0}
      disabledReason="Выберите завод и количество"
      submitting={submitting}
      serverError={serverError}
      dirty={payload.length > 0 || Boolean(expectedEndOn)}
    >
      <div className="flex flex-col gap-3">
        {placeholder ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{placeholder}</div>
        ) : (
          <ContextRowsTable
            rows={rows}
            quantities={quantities}
            onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
            quantityHeader="Произвести"
            limitHeader="Нужно"
          />
        )}
        {plantId && payload.length > 0 ? (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            Вместе с заказом на производство создадим запланированный выпуск на весь объём — выпуск будет связан с
            этим заказом клиента.
          </div>
        ) : null}
      </div>
    </DialogShell>
  );
};

type ReserveTarget =
  | { kind: "new"; productionOrderId: string; available: number }
  | { kind: "draft"; outputId: string; productionOrderId: string; available: number };

const reserveTargetsForLine = (
  snapshot: LogisticsSnapshot,
  orderLine: CustomerOrderLine,
): ReserveTarget[] => {
  const result: ReserveTarget[] = [];
  const openProductions = snapshot.productionOrders.filter(
    (po) => po.status !== "closed" && po.status !== "cancelled" && po.status !== "done",
  );
  for (const po of openProductions) {
    const planLine = snapshot.productionOrderLines.find(
      (line) => line.orderId === po.id && line.productId === orderLine.productId,
    );
    if (!planLine) continue;
    const planRoom = remainingPlanForProductionProduct(snapshot, po.id, orderLine.productId, planLine.quantity);
    if (planRoom > 0) result.push({ kind: "new", productionOrderId: po.id, available: planRoom });
    for (const output of snapshot.outputs) {
      if (output.productionOrderId !== po.id || output.status !== "draft") continue;
      const free = freeInDraftOutput(snapshot, output.id, orderLine.productId);
      if (free > 0) {
        result.push({ kind: "draft", outputId: output.id, productionOrderId: po.id, available: free });
      }
    }
  }
  return result;
};

const targetKeyOf = (target: ReserveTarget) =>
  target.kind === "new" ? `new:${target.productionOrderId}` : `draft:${target.outputId}`;

const targetLabel = (snapshot: LogisticsSnapshot, target: ReserveTarget) => {
  const po = productionOrderById(snapshot, target.productionOrderId);
  const poNumber = po?.number ?? target.productionOrderId;
  if (target.kind === "new") return `Новый выпуск · ${poNumber}`;
  const output = snapshot.outputs.find((item) => item.id === target.outputId);
  return `${output?.number ?? target.outputId} · ${poNumber}`;
};

export const ReserveOnProductionForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const base = useMemo(() => {
    return lines.flatMap((line) => {
      const cap = remainingToReserveInProductionOutputsForLine(line, balances, snapshot);
      if (cap <= 0) return [];
      const product = productById(snapshot, line.productId);
      return reserveTargetsForLine(snapshot, line).map((target) => ({
        key: `${line.id}:${targetKeyOf(target)}`,
        lineId: line.id,
        productId: line.productId,
        targetKey: targetKeyOf(target),
        title: product?.name ?? line.productName,
        subtitle: targetLabel(snapshot, target),
        unit: product?.unit ?? line.productUnit,
        lineCap: cap,
        targetAvailable: target.available,
        target,
      }));
    });
  }, [balances, lines, snapshot]);

  const rows: ContextQuantityRow[] = base.map((row) => {
    const lineSiblings = base.filter((item) => item.lineId === row.lineId && item.key !== row.key).map((item) => item.key);
    const targetSiblings = base
      .filter((item) => item.productId === row.productId && item.targetKey === row.targetKey && item.key !== row.key)
      .map((item) => item.key);
    const limit = Math.min(
      sharedPoolLimit(row.lineCap, lineSiblings, quantities),
      sharedPoolLimit(row.targetAvailable, targetSiblings, quantities),
    );
    return {
      key: row.key,
      title: row.title,
      subtitle: row.subtitle,
      limitLabel: formatQuantity(limit, row.unit),
      limit,
      unit: row.unit,
    };
  });

  const picked = positiveEntries(quantities);

  const submit = async () => {
    if (submitting || picked.length === 0) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const created: Array<{ href: string; label: string }> = [];
    try {
      const byTarget = new Map<string, Array<(typeof base)[number] & { quantity: number }>>();
      for (const entry of picked) {
        const row = base.find((item) => item.key === entry.key);
        if (!row) continue;
        const bucket = byTarget.get(row.targetKey) ?? [];
        bucket.push({ ...row, quantity: entry.quantity });
        byTarget.set(row.targetKey, bucket);
      }
      for (const bucket of byTarget.values()) {
        const first = bucket[0];
        if (!first) continue;
        const target = first.target;
        if (target.kind === "new") {
          const po = productionOrderById(snapshot, target.productionOrderId);
          const outputId = await createProductionOutput({
            orderId: target.productionOrderId,
            expectedEndOn: po?.expectedEndOn ?? null,
            complete: false,
            lines: bucket.map((row) => ({
              productId: row.productId,
              quantity: row.quantity,
              allocation: { ownerType: "order" as const, ownerId: customerOrderId, quantity: row.quantity },
            })),
          });
          created.push({ href: logisticsPath("outputs", outputId), label: po?.number ? `Выпуск к ${po.number}` : "Выпуск" });
          continue;
        }
        await reserveInProductionOutput({
          outputId: target.outputId,
          ownerType: "order",
          ownerId: customerOrderId,
          lines: bucket.map((row) => ({ productId: row.productId, quantity: row.quantity })),
        });
        const output = snapshot.outputs.find((item) => item.id === target.outputId);
        created.push({
          href: logisticsPath("outputs", target.outputId),
          label: output?.number ?? "Выпуск",
        });
      }
      onOpenChange(false);
      setQuantities({});
      const [main, ...rest] = created;
      if (main) openCreatedDocuments((href) => router.push(href), main, rest);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0) {
        onOpenChange(false);
        setQuantities({});
        await reportPartialCreate((href) => router.push(href), created, translateLogisticsError(raw), reload);
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuantities({});
        onOpenChange(next);
      }}
      size="lg"
      kicker={customerOrderById(snapshot, customerOrderId)?.number}
      title="Зарезервировать в выпуске"
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Зарезервировать"
      onSubmit={() => void submit()}
      submitDisabled={picked.length === 0}
      disabledReason="Введите количество"
      submitting={submitting}
      serverError={serverError}
      dirty={picked.length > 0}
    >
      <div className="flex flex-col gap-3">
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Резерв под производство держится в запланированном выпуске, а не на месте заказа на производство.
        </div>
        <ContextRowsTable
          rows={rows}
          quantities={quantities}
          onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
          limitHeader="Доступно к резерву"
          empty="Нет доступного заказа на производство или свободного запланированного выпуска"
        />
      </div>
    </DialogShell>
  );
};

export const OutputFromOrderForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const base = useMemo(() => {
    return lines.flatMap((orderLine) => {
      const orderCap = remainingToReserveInProductionOutputsForLine(orderLine, balances, snapshot);
      const product = productById(snapshot, orderLine.productId);
      return snapshot.productionOrderLines.flatMap((line) => {
        if (line.productId !== orderLine.productId) return [];
        const production = productionOrderById(snapshot, line.orderId);
        if (!production || production.status === "closed" || production.status === "cancelled" || production.status === "done") {
          return [];
        }
        const remaining = remainingToOutputForLine(snapshot, line.id, line.quantity);
        const planRoom = remainingPlanForProductionProduct(snapshot, line.orderId, line.productId, line.quantity);
        const room = Math.min(remaining, planRoom);
        if (room <= 0 || orderCap <= 0) return [];
        return [
          {
            key: `${orderLine.id}:${line.id}`,
            lineId: orderLine.id,
            productId: line.productId,
            productionOrderId: line.orderId,
            title: product?.name ?? orderLine.productName,
            subtitle: production.number,
            unit: product?.unit ?? orderLine.productUnit,
            room,
            orderCap,
          },
        ];
      });
    });
  }, [balances, lines, snapshot]);

  const rows: ContextQuantityRow[] = base.map((row) => {
    const siblings = base.filter((item) => item.lineId === row.lineId && item.key !== row.key).map((item) => item.key);
    const limit = Math.min(row.room, sharedPoolLimit(row.orderCap, siblings, quantities));
    return {
      key: row.key,
      title: row.title,
      subtitle: row.subtitle,
      limitLabel: formatQuantity(limit, row.unit),
      limit,
      unit: row.unit,
    };
  });
  const picked = positiveEntries(quantities);
  const blockedHint =
    lines.some(
      (line) => reservedInActiveOutputsForOrderProduct(snapshot, line.orderId, line.productId) > 0,
    ) && rows.length === 0
      ? "Весь план уже в запланированных выпусках — завершите выпуск на его странице"
      : "Нет доступного заказа на производство";

  const submit = async () => {
    if (submitting || picked.length === 0) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const created: Array<{ href: string; label: string }> = [];
    try {
      const byOrder = new Map<string, Array<{ productId: string; quantity: number }>>();
      for (const entry of picked) {
        const row = base.find((item) => item.key === entry.key);
        if (!row) continue;
        const bucket = byOrder.get(row.productionOrderId) ?? [];
        bucket.push({ productId: row.productId, quantity: entry.quantity });
        byOrder.set(row.productionOrderId, bucket);
      }
      for (const [orderId, orderLines] of byOrder) {
        const production = productionOrderById(snapshot, orderId);
        const outputId = await createProductionOutput({
          orderId,
          expectedEndOn: expectedEndOn || null,
          lines: orderLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            allocation: { ownerType: "order" as const, ownerId: customerOrderId, quantity: line.quantity },
          })),
        });
        created.push({
          href: logisticsPath("outputs", outputId),
          label: production?.number ? `Выпуск · ${production.number}` : "Выпуск",
        });
      }
      onOpenChange(false);
      setQuantities({});
      const [main, ...rest] = created;
      if (main) openCreatedDocuments((href) => router.push(href), main, rest);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0) {
        onOpenChange(false);
        setQuantities({});
        await reportPartialCreate((href) => router.push(href), created, translateLogisticsError(raw), reload);
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuantities({});
          setExpectedEndOn("");
        }
        onOpenChange(next);
      }}
      size="lg"
      kicker={customerOrderById(snapshot, customerOrderId)?.number}
      title="Выпустить под заказ"
      header={
        <ExpectedEndField
          label="Ожидаемое окончание"
          optional
          value={expectedEndOn}
          onChange={setExpectedEndOn}
        />
      }
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Выпустить"
      onSubmit={() => void submit()}
      submitDisabled={picked.length === 0}
      disabledReason="Введите количество"
      submitting={submitting}
      serverError={serverError}
      dirty={picked.length > 0 || Boolean(expectedEndOn)}
    >
      <ContextRowsTable
        rows={rows}
        quantities={quantities}
        onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
        limitHeader="Доступно к выпуску"
        empty={blockedHint}
      />
    </DialogShell>
  );
};

export const TransferReservedForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  return (
    <TransferCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      snapshot={snapshot}
      balances={balances}
      context={{ kind: "order", customerOrderId, orderLines: lines }}
      onSubmit={async (value) => {
        const created = await createAndSendTransfer({
          fromWarehouseId: value.fromWarehouseId,
          toWarehouseId: value.toWarehouseId,
          expectedEndOn: value.expectedEndOn,
          lines: value.lines,
        });
        await reload();
        openSentTransfer(created, (href) => router.push(href));
        return true;
      }}
    />
  );
};

export const ReserveOnTransferForm = ({
  snapshot,
  balances,
  open,
  onOpenChange,
  reload,
  customerOrderId,
  lines,
}: ActionFormProps) => {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const base = useMemo(() => {
    return lines.flatMap((line) => {
      const cap = remainingToReserveForLine(line, balances);
      if (cap <= 0) return [];
      const product = productById(snapshot, line.productId);
      return freeTransfersForProduct(balances, line.productId).flatMap((place) => {
        const transfer = snapshot.transfers.find((item) => item.id === place.locationId);
        if (transfer?.status !== "sent") return [];
        return [
          {
            key: `${line.id}:${place.locationId}`,
            lineId: line.id,
            productId: line.productId,
            transferId: place.locationId,
            title: product?.name ?? line.productName,
            subtitle: transfer.number,
            unit: product?.unit ?? line.productUnit,
            lineCap: cap,
            placeQty: place.quantity,
          },
        ];
      });
    });
  }, [balances, lines, snapshot]);

  const rows: ContextQuantityRow[] = base.map((row) => {
    const lineSiblings = base.filter((item) => item.lineId === row.lineId && item.key !== row.key).map((item) => item.key);
    const placeSiblings = base
      .filter((item) => item.transferId === row.transferId && item.productId === row.productId && item.key !== row.key)
      .map((item) => item.key);
    const limit = Math.min(
      sharedPoolLimit(row.lineCap, lineSiblings, quantities),
      sharedPoolLimit(row.placeQty, placeSiblings, quantities),
    );
    return {
      key: row.key,
      title: row.title,
      subtitle: row.subtitle,
      limitLabel: formatQuantity(limit, row.unit),
      limit,
      unit: row.unit,
    };
  });
  const picked = positiveEntries(quantities);

  const submit = async () => {
    if (submitting || picked.length === 0) return;
    const errorKey = firstErrorKey(
      rows.map((row) => ({ key: row.key, raw: quantities[row.key] ?? "", limit: row.limit, mode: "hard" as const })),
    );
    if (errorKey) {
      focusQuantityInput(errorKey);
      return;
    }
    setSubmitting(true);
    setServerError(null);
    const created: Array<{ href: string; label: string }> = [];
    try {
      const byTransfer = new Map<string, Array<{ productId: string; quantity: number }>>();
      for (const entry of picked) {
        const row = base.find((item) => item.key === entry.key);
        if (!row) continue;
        const bucket = byTransfer.get(row.transferId) ?? [];
        bucket.push({ productId: row.productId, quantity: entry.quantity });
        byTransfer.set(row.transferId, bucket);
      }
      for (const [transferId, transferLines] of byTransfer) {
        const id = await createAndPostReservation({
          locationType: "transfer",
          locationId: transferId,
          toOwnerType: "order",
          toOwnerId: customerOrderId,
          lines: transferLines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            fromOwnerType: null,
            fromOwnerId: null,
          })),
        });
        const transfer = snapshot.transfers.find((item) => item.id === transferId);
        created.push({ href: logisticsPath("reservations", id), label: transfer?.number ?? "Резерв" });
      }
      onOpenChange(false);
      setQuantities({});
      const [main, ...rest] = created;
      if (main) openCreatedDocuments((href) => router.push(href), main, rest);
    } catch (caught: unknown) {
      const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
      if (created.length > 0) {
        onOpenChange(false);
        setQuantities({});
        await reportPartialCreate((href) => router.push(href), created, translateLogisticsError(raw), reload);
        return;
      }
      setServerError(translateLogisticsError(raw));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuantities({});
        onOpenChange(next);
      }}
      size="lg"
      kicker={customerOrderById(snapshot, customerOrderId)?.number}
      title="Зарезервировать в перемещении"
      footerSummary={picked.length ? pluralTovar(picked.length) : "Нет строк"}
      submitLabel="Зарезервировать"
      onSubmit={() => void submit()}
      submitDisabled={picked.length === 0}
      disabledReason="Введите количество"
      submitting={submitting}
      serverError={serverError}
      dirty={picked.length > 0}
    >
      <ContextRowsTable
        rows={rows}
        quantities={quantities}
        onQuantityChange={(key, raw) => setQuantities((current) => ({ ...current, [key]: raw }))}
        limitHeader="Доступно к резерву"
        empty="Нет свободного остатка в пути"
      />
    </DialogShell>
  );
};
