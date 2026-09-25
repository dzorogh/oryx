// english-ui:ignore-file
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseDecimalQuantity } from "@/features/logistics/ui/catalog-quantity-model";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";

export type OrderLineDialogMode = "add" | "edit" | "delete";

export type OrderLineProductOption = {
  id: string;
  label: string;
};

export const OrderLineDialog = ({
  open,
  onOpenChange,
  mode,
  products = [],
  productId,
  productLabel,
  quantity,
  hint,
  pending = false,
  error,
  onProductIdChange,
  onQuantityChange,
  onDelete,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: OrderLineDialogMode;
  products?: OrderLineProductOption[];
  productId: string;
  productLabel?: string;
  quantity: string;
  hint?: string | null;
  pending?: boolean;
  error?: string | null;
  onProductIdChange?: (productId: string) => void;
  onQuantityChange?: (quantity: string) => void;
  onDelete?: () => void;
  onSubmit: () => void;
}) => {
  const title =
    mode === "add" ? "Добавить товар" : mode === "delete" ? "Удалить товар?" : "Изменить количество";
  const submitLabel = mode === "add" ? "Добавить" : mode === "delete" ? "Удалить" : "Сохранить";
  const quantityOk = (parseDecimalQuantity(quantity) ?? 0) > 0;
  const canSubmit = mode === "delete" || (Boolean(productId) && quantityOk && (mode !== "add" || products.length > 0));

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        onOpenChange(next);
      }}
      size="sm"
      title={title}
      dismissLabel={mode === "delete" ? "Назад" : undefined}
      footerSummary={mode === "delete" ? undefined : productLabel}
      submitLabel={submitLabel}
      onSubmit={onSubmit}
      submitDisabled={!canSubmit}
      disabledReason={mode === "delete" ? undefined : "Введите количество"}
      submitting={pending}
      pendingLabel={mode === "delete" ? "Удаляем…" : "Сохраняем…"}
      serverError={error}
      dirty={mode !== "delete" && quantity.trim().length > 0}
    >
      <div className="flex flex-col gap-3">
        {mode === "add" ? (
          products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных товаров.</p>
          ) : (
            <label className="space-y-1.5 text-sm">
              <span className="text-muted-foreground">Товар</span>
              <Select
                items={products.map((item) => ({ value: item.id, label: item.label }))}
                value={productId}
                disabled={pending}
                onValueChange={(value) => onProductIdChange?.(value ?? "")}
              >
                <SelectTrigger className="w-full bg-background" aria-label="Товар">
                  <SelectValue placeholder="Выберите товар" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {products.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
          )
        ) : (
          <p className="text-sm font-medium">{productLabel}</p>
        )}
        {mode === "delete" ? (
          <p className="text-sm">Строка будет удалена из заказа.</p>
        ) : (
          <label className="space-y-1.5 text-sm">
            <span className="text-muted-foreground">Количество</span>
            <Input
              type="text"
              inputMode="decimal"
              value={quantity}
              disabled={pending || (mode === "add" && products.length === 0)}
              onChange={(event) => onQuantityChange?.(event.target.value)}
              aria-label="Количество"
            />
          </label>
        )}
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {mode === "edit" && onDelete ? (
          <Button type="button" variant="outline" disabled={pending} onClick={onDelete}>
            Удалить
          </Button>
        ) : null}
      </div>
    </DialogShell>
  );
};
