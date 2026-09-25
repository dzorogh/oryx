// english-ui:ignore-file
"use client";

import { DialogShell } from "@/features/logistics/ui/dialog-shell";

export const ProductionOrderCloseDialog = ({
  open,
  pending,
  error,
  kicker,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  kicker?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) => (
  <DialogShell
    open={open}
    onOpenChange={(next) => {
      if (pending) return;
      onOpenChange(next);
    }}
    size="sm"
    kicker={kicker}
    title="Закрыть заказ?"
    dismissLabel="Назад"
    submitLabel="Закрыть заказ"
    onSubmit={onConfirm}
    submitting={pending}
    pendingLabel="Закрываем…"
    serverError={error}
  >
    <p className="text-sm">Незакрытые строки перестанут попадать в новые выпуски.</p>
  </DialogShell>
);
