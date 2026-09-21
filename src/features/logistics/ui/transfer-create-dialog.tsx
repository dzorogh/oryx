"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { freeAtPlace, onHandAtPlace, reservedAtPlaceForOwner } from "@/features/logistics/logistics-availability";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { customerOrderById, productById, warehouseCode, warehouseSelectItems } from "@/features/logistics/logistics-lookups";
import type { CustomerOrderLine, LogisticsSnapshot, StockBalance } from "@/features/logistics/logistics-types";
import { ExpectedEndField } from "@/features/logistics/ui/expected-end-field";
import { FieldSelect } from "@/features/logistics/ui/field-select";
import { cn } from "@/lib/utils";

export type TransferCreateLineDraft = {
  key: string;
  productId: string;
  quantity: string;
};

export type TransferCreateSubmitValue = {
  fromWarehouseId: string;
  toWarehouseId: string;
  expectedEndOn: string | null;
  lines: Array<{ productId: string; quantity: number }>;
};

export type TransferCreateContext =
  | { kind: "free" }
  | { kind: "order"; customerOrderId: string; orderLines: CustomerOrderLine[] };

type TransferCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: LogisticsSnapshot;
  balances: StockBalance[];
  context: TransferCreateContext;
  onSubmit: (value: TransferCreateSubmitValue) => Promise<boolean>;
};

const emptyLine = (): TransferCreateLineDraft => ({
  key: `line-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`,
  productId: "",
  quantity: "1",
});

const formatUnits = (quantity: number, unit?: string): string => {
  const amount = Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2);
  return unit ? `${amount} ${unit}` : amount;
};

const formatExpectedSummary = (value: string): string =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const lineQuantity = (line: TransferCreateLineDraft): number => Number(line.quantity);

export const TransferCreateDialog = ({
  open,
  onOpenChange,
  snapshot,
  balances,
  context,
  onSubmit,
}: TransferCreateDialogProps) => {
  const liveId = useId();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [expectedEndOn, setExpectedEndOn] = useState("");
  const [lines, setLines] = useState<TransferCreateLineDraft[]>([emptyLine()]);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const order = context.kind === "order" ? customerOrderById(snapshot, context.customerOrderId) : undefined;
  const orderNumber = order?.number ?? (context.kind === "order" ? context.customerOrderId : "");
  const contextKey = context.kind === "order" ? `order:${context.customerOrderId}` : "free";

  useEffect(() => {
    if (!open) {
      return;
    }
    setFromId("");
    setToId("");
    setExpectedEndOn("");
    setLines([emptyLine()]);
    setFocusKey(null);
    setSubmitting(false);
  }, [open, contextKey]);

  const availableFor = (productId: string): number => {
    if (!productId || !fromId) {
      return 0;
    }
    if (context.kind === "order") {
      return reservedAtPlaceForOwner(balances, productId, "warehouse", fromId, "order", context.customerOrderId);
    }
    return freeAtPlace(balances, productId, "warehouse", fromId);
  };

  const eligibleProducts = useMemo(() => {
    if (!fromId) {
      return [];
    }
    if (context.kind === "order") {
      const seen = new Set<string>();
      return context.orderLines.flatMap((line) => {
        if (seen.has(line.productId)) {
          return [];
        }
        const reserved = reservedAtPlaceForOwner(
          balances,
          line.productId,
          "warehouse",
          fromId,
          "order",
          context.customerOrderId,
        );
        if (reserved <= 0) {
          return [];
        }
        const product = productById(snapshot, line.productId);
        if (!product) {
          return [];
        }
        seen.add(line.productId);
        return [product];
      });
    }
    return snapshot.products.filter((product) => freeAtPlace(balances, product.id, "warehouse", fromId) > 0);
  }, [balances, context, fromId, snapshot]);

  const usedProductIds = lines.map((line) => line.productId).filter(Boolean);
  const sameWarehouses = Boolean(fromId && toId && fromId === toId);
  const routeReady = Boolean(fromId && toId && !sameWarehouses);

  const inspected = lines.map((line) => {
    const qty = lineQuantity(line);
    const available = availableFor(line.productId);
    const over = line.productId && fromId && Number.isFinite(qty) && qty > 0 ? Math.max(0, qty - available) : 0;
    return { line, qty, available, over };
  });

  const validLines = inspected.filter(
    (item) => item.line.productId && Number.isFinite(item.qty) && item.qty > 0 && item.over === 0,
  );
  const duplicate = usedProductIds.length !== new Set(usedProductIds).size;
  const issueCount = inspected.filter((item) => item.over > 0).length + (sameWarehouses ? 1 : 0) + (duplicate ? 1 : 0);
  const canAdd = eligibleProducts.some((product) => !usedProductIds.includes(product.id));
  const canSubmit =
    routeReady && validLines.length > 0 && !duplicate && issueCount === 0 && !submitting && validLines.length === lines.filter((line) => line.productId).length;

  const totalUnits = validLines.reduce((sum, item) => sum + item.qty, 0);
  const fromCode = fromId ? warehouseCode(snapshot, fromId) : "—";
  const toCode = toId ? warehouseCode(snapshot, toId) : "—";

  const resetAndClose = () => {
    onOpenChange(false);
  };

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit({
      fromWarehouseId: fromId,
      toWarehouseId: toId,
      expectedEndOn: expectedEndOn || null,
      lines: validLines.map((item) => ({ productId: item.line.productId, quantity: item.qty })),
    });
    setSubmitting(false);
    if (ok) {
      onOpenChange(false);
    }
  };

  const updateLine = (key: string, next: Partial<TransferCreateLineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...next } : line)));
  };

  const addLine = () => {
    const next = emptyLine();
    setLines((current) => [...current, next]);
    setFocusKey(next.key);
  };

  const removeLine = (key: string) => {
    setLines((current) => {
      const remaining = current.filter((line) => line.key !== key);
      return remaining.length > 0 ? remaining : [emptyLine()];
    });
  };

  const title = "Create transfer";
  const primaryLabel =
    context.kind === "order" ? `Create and send for ${orderNumber}` : "Create and send transfer";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl max-md:top-auto max-md:bottom-0 max-md:translate-y-0 max-md:rounded-b-none max-md:max-w-full">
        <DialogHeader className="gap-1 border-b px-5 py-4">
          {context.kind === "order" ? (
            <p className="text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Customer order {orderNumber}
            </p>
          ) : null}
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr_1.1fr]">
            <FieldSelect
              label="From warehouse"
              value={fromId}
              items={
                context.kind === "order"
                  ? warehouseSelectItems(snapshot).filter((item) =>
                      context.orderLines.some(
                        (line) => reservedAtPlaceForOwner(balances, line.productId, "warehouse", item.value, "order", context.customerOrderId) > 0,
                      ),
                    )
                  : warehouseSelectItems(snapshot)
              }
              onChange={(value) => {
                setFromId(value);
                if (value === toId) {
                  setToId("");
                }
              }}
              placeholder="Select warehouse"
              emptyLabel="No warehouse with transferable stock"
              disabled={submitting}
              autoFocus
            />
            <div className="hidden pb-2 text-muted-foreground md:block" aria-hidden="true">
              <ArrowRight className="size-4" />
            </div>
            <div className="space-y-1">
              <FieldSelect
                label="To warehouse"
                value={toId}
                items={warehouseSelectItems(snapshot, fromId || undefined)}
                onChange={setToId}
                placeholder="Select warehouse"
                disabled={submitting}
              />
              {sameWarehouses ? (
                <p className="text-xs font-medium text-[#B91C1C]">Choose two different warehouses.</p>
              ) : null}
            </div>
            <ExpectedEndField
              label="Expected end"
              value={expectedEndOn}
              onChange={setExpectedEndOn}
              optional
            />
          </div>

          <div
            className={cn(
              "mt-3 rounded-md px-2.5 py-2 text-xs",
              context.kind === "order"
                ? "bg-[#F0FDF4] text-[#166534]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {context.kind === "order" ? (
              <p>
                <span className="font-semibold">Selected stock stays allocated to {orderNumber}</span>
                {" during transfer."}
              </p>
            ) : (
              <p>
                <span className="font-semibold text-foreground">Free stock only.</span>{" "}
                Customer-order reserved stock is excluded from availability.
              </p>
            )}
          </div>

          <div className="mt-3 overflow-hidden rounded-lg border border-border">
            <div className="hidden grid-cols-[minmax(12rem,1.8fr)_5.75rem_5.75rem_7.5rem_2.25rem] bg-[#F8FAFC] text-[10px] font-bold tracking-[0.05em] text-muted-foreground uppercase md:grid">
              <div className="px-2.5 py-2">Product</div>
              <div className="px-2.5 py-2 text-right">On hand</div>
              <div className="px-2.5 py-2 text-right">Available</div>
              <div className="px-2.5 py-2 text-right">Move</div>
              <div />
            </div>
            {lines.map((line, index) => {
              const product = productById(snapshot, line.productId);
              const available = availableFor(line.productId);
              const onHand = line.productId && fromId ? onHandAtPlace(balances, line.productId, "warehouse", fromId) : 0;
              const qty = lineQuantity(line);
              const over = line.productId && fromId && Number.isFinite(qty) && qty > 0 ? Math.max(0, qty - available) : 0;
              const chooserItems = eligibleProducts
                .filter((item) => item.id === line.productId || !usedProductIds.includes(item.id))
                .map((item) => ({
                  value: item.id,
                  label: item.sku ? `${item.name} · ${item.sku}` : item.name,
                }));
              const errorId = `${liveId}-${line.key}-error`;
              return (
                <div
                  key={line.key}
                  className={cn(
                    "border-t border-border first:border-t-0",
                    over > 0 && "bg-[#FEF2F2]",
                  )}
                >
                  <div className="grid grid-cols-1 gap-2 p-2.5 md:grid-cols-[minmax(12rem,1.8fr)_5.75rem_5.75rem_7.5rem_2.25rem] md:items-center md:gap-0 md:p-0">
                    <div className="min-w-0 md:px-2.5 md:py-2">
                      <FieldSelect
                        label={index === 0 ? "Product" : `Product ${index + 1}`}
                        labelClassName="font-medium md:sr-only"
                        value={line.productId}
                        items={chooserItems}
                        onChange={(productId) => {
                          const nextAvailable = availableFor(productId);
                          updateLine(line.key, {
                            productId,
                            quantity:
                              context.kind === "order" && nextAvailable > 0 ? String(nextAvailable) : line.quantity,
                          });
                        }}
                        placeholder={fromId ? "Select product" : "Choose a source warehouse first"}
                        emptyLabel={
                          fromId
                            ? context.kind === "order"
                              ? "No allocated stock is available to transfer from this order."
                              : "No products are available at this warehouse."
                            : "Choose a source warehouse first"
                        }
                        disabled={submitting || !fromId}
                        autoFocus={focusKey === line.key}
                      />
                      {product?.sku ? <p className="mt-1 hidden text-[10px] text-muted-foreground md:block">{product.sku}</p> : null}
                    </div>
                    <div className="flex items-center justify-between text-sm tabular-nums md:block md:px-2.5 md:py-2 md:text-right">
                      <span className="text-[10px] font-bold tracking-[0.05em] text-muted-foreground uppercase md:hidden">On hand</span>
                      <span className="text-xs font-medium">
                        {line.productId && fromId ? formatUnits(onHand, product?.unit) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm tabular-nums md:block md:px-2.5 md:py-2 md:text-right">
                      <span className="text-[10px] font-bold tracking-[0.05em] text-muted-foreground uppercase md:hidden">Available</span>
                      <span className={cn("text-xs font-semibold", over > 0 && "text-[#B91C1C]")}>
                        {line.productId && fromId ? formatUnits(available, product?.unit) : "—"}
                        {line.productId && fromId ? (
                          <span className="block text-[10px] font-normal text-muted-foreground">
                            {context.kind === "order" ? "reserved" : "free"}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="md:px-2.5 md:py-2 md:text-right">
                      <label className="flex items-center justify-between gap-2 md:block">
                        <span className="text-[10px] font-bold tracking-[0.05em] text-muted-foreground uppercase md:sr-only">Move</span>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={line.quantity}
                          disabled={submitting || !line.productId}
                          aria-label={product ? `Move ${product.name}` : "Move"}
                          aria-invalid={over > 0}
                          aria-describedby={over > 0 ? errorId : undefined}
                          className={cn(
                            "h-8 w-24 ml-auto text-right tabular-nums md:w-[4.9rem]",
                            over > 0 && "border-[#B91C1C] focus-visible:ring-[#FECACA]",
                          )}
                          onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                        />
                      </label>
                      {over > 0 ? (
                        <p id={errorId} className="mt-1 text-[10px] font-semibold text-[#B91C1C]">
                          {formatQuantity(over)} over available
                        </p>
                      ) : null}
                    </div>
                    <div className="flex justify-end md:justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="min-h-11 min-w-11 text-muted-foreground md:min-h-8 md:min-w-8"
                        disabled={submitting}
                        aria-label={product ? `Remove product: ${product.name}` : "Remove product"}
                        onClick={() => removeLine(line.key)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <Button type="button" variant="outline" size="sm" disabled={!canAdd || submitting} onClick={addLine}>
              Add product
            </Button>
            <p className="text-xs text-muted-foreground">
              {fromId
                ? `Availability shown at ${fromCode} before quantity entry`
                : "Choose a source warehouse to see availability"}
            </p>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 items-center justify-between gap-3 rounded-none bg-muted/50 sm:justify-between">
          <div className="min-w-0 text-left" aria-live="polite" id={liveId}>
            <p className="text-sm font-semibold">
              {validLines.length} {validLines.length === 1 ? "product" : "products"}
              {totalUnits > 0 ? ` · ${formatQuantity(totalUnits)} ${totalUnits === 1 ? "unit" : "units"}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {fromCode} → {toCode}
              {expectedEndOn ? ` · Expected ${formatExpectedSummary(expectedEndOn)}` : ""}
              {issueCount > 0 ? ` · ${issueCount} ${issueCount === 1 ? "line needs" : "lines need"} attention` : ""}
            </p>
          </div>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="button" variant="outline" disabled={submitting} onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="button" disabled={!canSubmit} onClick={() => void submit()}>
              {submitting ? "Sending…" : primaryLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
