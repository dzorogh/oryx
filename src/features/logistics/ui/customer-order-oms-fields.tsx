"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { copyCustomerOrder, setDocumentDescription } from "@/features/logistics/logistics-api";
import { MIXED_OWNERS_WARNING } from "@/features/logistics/customer-order-oms";
import { logisticsPath } from "@/features/logistics/logistics-paths";
import { formatOrderMoney, type DeliverySummary, type PaymentsSummary } from "@/features/logistics/order-money";
import { formatOutputDate } from "@/features/logistics/output-calendar";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { DocumentMetaEmpty } from "@/features/logistics/ui/document/document-meta-field";
import { runLogisticsAction, translateLogisticsError } from "@/features/logistics/ui/run-action";
import { cn } from "@/lib/utils";

const OverdueChip = () => (
  <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
    просрочен
  </span>
);

/** «Оплачено X из Y · срок 28.09.2026 · просрочен». */
export const PaymentsMetaValue = ({ summary }: { summary: PaymentsSummary | null }) => {
  if (!summary) return <DocumentMetaEmpty />;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="tabular-nums">
        Оплачено {formatOrderMoney(summary.paid, summary.currencyCode)} из{" "}
        {formatOrderMoney(summary.total, summary.currencyCode)}
      </span>
      {summary.nextDueOn ? (
        <small
          className={cn("font-normal tabular-nums", summary.overdue ? "text-red-700" : "text-muted-foreground")}
        >
          · срок {formatOutputDate(summary.nextDueOn)}
        </small>
      ) : null}
      {summary.overdue ? <OverdueChip /> : null}
    </span>
  );
};

/** «оплачено X из Y» by the order's transfers; «—» without delivery payments. */
export const DeliveryMetaValue = ({
  summary,
  mixedOwners,
}: {
  summary: DeliverySummary | null;
  mixedOwners: boolean;
}) => (
  <span className="inline-flex min-w-0 items-center gap-1.5">
    {summary ? (
      <span className="tabular-nums">
        оплачено {formatOrderMoney(summary.paid, summary.currencyCode)} из{" "}
        {formatOrderMoney(summary.total, summary.currencyCode)}
      </span>
    ) : (
      <DocumentMetaEmpty />
    )}
    {mixedOwners ? (
      <span className="inline-flex items-center text-amber-700" title={MIXED_OWNERS_WARNING}>
        <TriangleAlert className="size-3.5" aria-hidden />
      </span>
    ) : null}
  </span>
);

/** Order note under the header: text, «Изменить заметку» → textarea with «Сохранить». Closed orders are read-only. */
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
      <div className="mt-1 flex max-w-3xl flex-col gap-2">
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

  return (
    <span className="inline-flex max-w-3xl flex-wrap items-baseline gap-x-2">
      {description ? <span className="whitespace-pre-line">{description}</span> : null}
      {editable ? (
        <button
          type="button"
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          onClick={() => setDraft(description)}
        >
          {description ? "Изменить заметку" : "Добавить заметку"}
        </button>
      ) : null}
    </span>
  );
};

/** «Создать копию» → confirmation → new draft opens. */
export const CopyCustomerOrderAction = ({ orderId, orderNumber }: { orderId: string; orderNumber: string }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Создать копию
      </Button>
      <DialogShell
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
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
              setOpen(false);
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
    </>
  );
};
