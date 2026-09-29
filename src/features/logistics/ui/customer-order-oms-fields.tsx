"use client";

import { StickyNote } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyCustomerOrder, setDocumentDescription } from "@/features/logistics/logistics-api";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";
import { cn } from "@/lib/utils";

/** Order note under the header: amber block, «Изменить» / «Добавить заметку», textarea save. Closed orders are read-only. */
export const CustomerOrderNote = ({
  orderId,
  description,
  editable,
  reload,
}: {
  orderId: string;
  description: string;
  editable: boolean;
  reload: () => Promise<void>;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (draft != null) {
    const save = async () => {
      setPending(true);
      const ok = await runLogisticsAction(
        () => setDocumentDescription(orderId, draft),
        draft.trim() ? "Заметка сохранена" : "Заметка очищена",
        reload,
      );
      setPending(false);
      if (ok) setDraft(null);
    };
    return (
      <div className="flex flex-col gap-2 rounded-lg bg-amber-50/60 px-3 py-2 ring-1 ring-amber-100">
        <textarea
          aria-label="Заметка заказа"
          autoFocus
          rows={3}
          maxLength={4000}
          value={draft}
          disabled={pending}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setDraft(null);
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void save();
            }
          }}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="Например, условия поставки или договорённости с клиентом"
        />
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => void save()}>
            {pending ? "Сохраняем…" : "Сохранить"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setDraft(null)}>
            Отмена
          </Button>
        </div>
      </div>
    );
  }

  const hasNote = description.trim() !== "";

  if (!hasNote && !editable) return null;

  if (!hasNote) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
        onClick={() => setDraft("")}
      >
        <StickyNote className="size-3.5" aria-hidden />
        Добавить заметку
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-amber-50/60 px-3 py-2 text-sm text-foreground ring-1 ring-amber-100">
      <StickyNote className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
      <p className="min-w-0 flex-1 whitespace-pre-line">{description}</p>
      {editable ? (
        <button
          type="button"
          className={cn("shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground")}
          onClick={() => setDraft(description)}
        >
          Изменить
        </button>
      ) : null}
    </div>
  );
};

/** Controlled «Создать копию» confirmation → new draft opens. */
export const CopyCustomerOrderDialog = ({
  open,
  onOpenChange,
  orderId,
  orderNumber,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
}) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setError(null);
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next);
      }}
      size="sm"
      kicker={orderNumber}
      title="Создать копию заказа?"
      dismissLabel="Назад"
      submitLabel="Создать копию"
      pendingLabel="Создаём…"
      submitting={pending}
      serverError={error}
      onSubmit={() => {
        setPending(true);
        setError(null);
        void copyCustomerOrder(orderId)
          .then((created) => {
            toast.success("Копия заказа создана — черновик");
            onOpenChange(false);
            router.push(logisticsPath("customer-orders", created.sequenceNumber));
          })
          .catch((caught: unknown) => {
            setError(translateLogisticsError(caught instanceof Error ? caught.message : "Копия не создана"));
          })
          .finally(() => setPending(false));
      }}
    >
      <p className="text-sm">
        Новый черновик с тем же регионом, источником и строками. Заметка, платежи, файлы и комментарии не
        копируются.
      </p>
    </DialogShell>
  );
};
