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
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";

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
    mode === "add" ? "Добавить товар" : mode === "delete" ? "Удалить товар" : "Изменить количество";
  const submitLabel = mode === "add" ? "Добавить" : mode === "delete" ? "Удалить" : "Сохранить";
  const canSubmit =
    !pending &&
    (mode === "delete" || (Boolean(productId) && Number(quantity) > 0)) &&
    (mode !== "add" || products.length > 0);

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={(next) => {
        if (pending) {
          return;
        }
        onOpenChange(next);
      }}
      title={title}
    >
      <div className="flex flex-col gap-3">
        {mode === "add" ? (
          products.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет доступных товаров.</p>
          ) : (
            <label className="space-y-1 text-sm">
              <span className="font-medium">Товар</span>
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
          <p className="text-sm text-muted-foreground">Строка будет удалена из заказа.</p>
        ) : (
          <label className="space-y-1 text-sm">
            <span className="font-medium">Количество</span>
            <Input
              type="number"
              min={1}
              value={quantity}
              disabled={pending || (mode === "add" && products.length === 0)}
              aria-invalid={error ? true : undefined}
              onChange={(event) => onQuantityChange?.(event.target.value)}
              aria-label="Количество"
            />
          </label>
        )}
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {mode === "edit" && onDelete ? (
            <Button type="button" variant="outline" disabled={pending} onClick={onDelete}>
              Удалить
            </Button>
          ) : null}
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={onSubmit}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </LogisticsDialog>
  );
};
