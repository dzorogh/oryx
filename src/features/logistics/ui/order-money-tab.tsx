// english-ui:ignore-file
"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import {
  deleteOrderPayment,
  saveOrderPayment,
  setOrderAmount,
  setOrderCurrency,
  setOrderRates,
} from "@/features/logistics/logistics-api";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { formatMetaTimestamp } from "@/features/logistics/logistics-labels";
import {
  allocatedAmount,
  formatMoneyInput,
  formatOrderMoney,
  isPaymentOverdue,
  parseMoneyInput,
  paymentHistoryChanges,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  summarizeOrderMoney,
  summarizePayments,
  todayIso,
  type OrderMoneyContext,
  type OrderPayment,
  type PaymentHistoryChange,
  type PaymentStatus,
} from "@/features/logistics/order-money";
import { formatOutputDate } from "@/features/logistics/output-calendar";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";

export { orderMoneyLines, summarizeOrderMoney, type OrderMoneySummary } from "@/features/logistics/order-money";

const PAYMENT_TONE: Record<PaymentStatus, string> = {
  planned: "draft",
  invoiced: "in_progress",
  paid: "done",
};

export const PaymentStatusPill = ({ status }: { status: PaymentStatus }) => (
  <StatusPill status={PAYMENT_TONE[status]} label={PAYMENT_STATUS_LABELS[status]} />
);

/** Ghost input for «Сумма заказа»: empty — the estimated cost is used. */
export const OrderAmountInput = ({
  documentId,
  amount,
  estimated,
  currencyCode,
  reload,
  variant = "field",
  readOnly = false,
}: {
  documentId: string;
  amount: number | null;
  estimated: number;
  currencyCode: string;
  reload: () => Promise<void>;
  /** `panel` — large ghost value that fits its text, for the customer-order header. */
  variant?: "field" | "meta" | "panel";
  readOnly?: boolean;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const discardRef = useRef(false);
  const shown = draft ?? (amount == null ? "" : formatOrderMoney(amount, currencyCode));

  const commit = () => {
    if (discardRef.current) {
      discardRef.current = false;
      setDraft(null);
      return;
    }
    if (draft == null) return;
    const trimmed = draft.trim();
    setDraft(null);
    const next = trimmed === "" ? null : parseMoneyInput(trimmed);
    if (trimmed !== "" && next == null) {
      toast.error("Не удалось выполнить действие", { description: "Сумма заказа — число не меньше нуля" });
      return;
    }
    if (next === amount || (next != null && amount != null && Math.abs(next - amount) < 0.005)) return;
    setPending(true);
    void runLogisticsAction(
      () => setOrderAmount(documentId, next),
      next == null ? "Сумма заказа равна расчётной" : "Сумма заказа сохранена",
      reload,
    ).finally(() => setPending(false));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label="Сумма заказа"
      disabled={pending}
      readOnly={readOnly}
      value={shown}
      placeholder={
        variant === "field"
          ? `${formatOrderMoney(estimated, currencyCode)} · расчётная`
          : formatOrderMoney(estimated, currencyCode)
      }
      title={amount == null ? "Равна расчётной стоимости" : undefined}
      onFocus={() => {
        if (!readOnly) setDraft(formatMoneyInput(amount));
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
        if (event.key === "Escape") {
          discardRef.current = true;
          event.currentTarget.blur();
        }
      }}
      className={cn(
        "h-8 min-w-0 rounded-lg border px-2 text-sm font-medium tabular-nums outline-none placeholder:font-normal placeholder:text-muted-foreground",
        "focus-visible:border-border focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40",
        variant === "field" && "w-full border-input bg-background",
        variant === "meta" &&
          "-ml-2 w-full max-w-[14rem] border-transparent bg-transparent hover:border-border hover:bg-muted/50",
        variant === "panel" &&
          "-ml-2 h-9 w-auto max-w-[calc(100%+0.5rem)] border-transparent bg-transparent text-xl font-semibold tracking-tight [field-sizing:content] placeholder:font-semibold placeholder:text-foreground hover:border-border hover:bg-muted/50",
        readOnly &&
          "pointer-events-none border-transparent bg-transparent hover:border-transparent hover:bg-transparent",
      )}
    />
  );
};

const SummaryCell = ({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) => (
  <div className="min-w-0 space-y-1 border-l border-border/60 px-4 py-3 first:border-l-0">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="flex min-h-8 items-center text-sm font-medium">{children}</div>
    {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
  </div>
);

const DUE_ON_MIN = "2000-01-01";
const DUE_ON_MAX = "2099-12-31";

type PaymentDraft = {
  id: string | null;
  dueOn: string;
  amount: string;
  status: PaymentStatus;
};

const PaymentDialog = ({
  draft,
  currencyCode,
  currencyLabel,
  onClose,
  onSubmit,
}: {
  draft: PaymentDraft | null;
  currencyCode: string;
  currencyLabel: string;
  onClose: () => void;
  onSubmit: (draft: PaymentDraft) => Promise<boolean>;
}) => {
  const [form, setForm] = useState<PaymentDraft | null>(draft);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [seed, setSeed] = useState(draft);
  if (draft !== seed) {
    setSeed(draft);
    setForm(draft);
    setServerError(null);
  }
  if (!form) return null;
  const amount = parseMoneyInput(form.amount);
  const invalidReason = !form.dueOn
    ? "Укажите срок оплаты"
    : form.dueOn < DUE_ON_MIN || form.dueOn > DUE_ON_MAX
      ? "Проверьте год в сроке оплаты"
      : amount == null || amount <= 0
        ? "Сумма больше нуля"
        : null;

  return (
    <DialogShell
      open={Boolean(draft)}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
      size="sm"
      kicker={`${currencyLabel} ${currencyCode}`}
      title={form.id ? "Изменить платёж" : "Новый платёж"}
      footerSummary={amount && amount > 0 ? formatOrderMoney(amount, currencyCode) : ""}
      submitLabel={form.id ? "Сохранить" : "Добавить"}
      pendingLabel="Сохраняем…"
      submitDisabled={invalidReason != null}
      disabledReason={invalidReason ?? undefined}
      submitting={submitting}
      serverError={serverError}
      onSubmit={() => {
        if (invalidReason) return;
        setSubmitting(true);
        setServerError(null);
        void onSubmit(form)
          .then((ok) => {
            if (!ok) setServerError("Платёж не сохранён");
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="grid gap-3 py-1">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Срок оплаты</span>
          <Input
            type="date"
            min={DUE_ON_MIN}
            max={DUE_ON_MAX}
            value={form.dueOn}
            onChange={(event) => setForm({ ...form, dueOn: event.target.value })}
            className="h-8"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Сумма, {currencyCode}</span>
          <Input
            inputMode="decimal"
            value={form.amount}
            onChange={(event) => setForm({ ...form, amount: event.target.value })}
            className="h-8 tabular-nums"
            placeholder="0"
          />
        </label>
        <div className="space-y-1 text-sm">
          <span className="block font-medium">Статус</span>
          <div className="inline-flex h-8 items-center rounded-lg border bg-muted p-0.5 text-[13px]">
            {PAYMENT_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                className={
                  form.status === status
                    ? "h-full rounded bg-foreground px-3 text-background"
                    : "h-full rounded px-3 text-muted-foreground"
                }
                onClick={() => setForm({ ...form, status })}
              >
                {PAYMENT_STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DialogShell>
  );
};

const savePaymentDraft = async (documentId: string, draft: PaymentDraft, reload: () => Promise<void>) => {
  const amount = parseMoneyInput(draft.amount);
  if (amount == null) return false;
  return runLogisticsAction(
    () =>
      saveOrderPayment({
        documentId,
        paymentId: draft.id,
        dueOn: draft.dueOn,
        amount,
        status: draft.status,
      }),
    draft.id ? "Платёж сохранён" : "Платёж добавлен",
    reload,
  );
};

const newPaymentDraft = (suggestedAmount: number): PaymentDraft => ({
  id: null,
  dueOn: "",
  amount: suggestedAmount > 0 ? formatMoneyInput(suggestedAmount) : "",
  status: "planned",
});

/** «Новый платёж» outside the «Деньги» tab (customer-order header menu). */
export const AddPaymentDialog = ({
  open,
  onOpenChange,
  documentId,
  currencyCode,
  suggestedAmount,
  reload,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currencyCode: string;
  /** Prefilled amount — «Не распределено» of the order; ≤ 0 leaves the field empty. */
  suggestedAmount: number;
  reload: () => Promise<void>;
}) => {
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setDraft(open ? newPaymentDraft(suggestedAmount) : null);
  }

  return (
    <PaymentDialog
      draft={draft}
      currencyCode={currencyCode}
      currencyLabel={TEXTS.order.currencyLabel}
      onClose={() => onOpenChange(false)}
      onSubmit={async (next) => {
        const ok = await savePaymentDraft(documentId, next, reload);
        if (ok) onOpenChange(false);
        return ok;
      }}
    />
  );
};

const HISTORY_FIELD_LABEL: Record<PaymentHistoryChange["field"], string> = {
  status: "Статус",
  dueOn: "Срок оплаты",
  amount: "Сумма",
};

const historySideText = (
  change: PaymentHistoryChange,
  side: "from" | "to",
  currencyCode: string,
): string | null => {
  if (change.field === "status") {
    const value = side === "from" ? change.from : change.to;
    return value == null ? null : PAYMENT_STATUS_LABELS[value];
  }
  if (change.field === "dueOn") {
    const value = side === "from" ? change.from : change.to;
    return value == null ? null : formatOutputDate(value);
  }
  const value = side === "from" ? change.from : change.to;
  return value == null ? null : formatOrderMoney(value, currencyCode);
};

/** Read-only chronology of one payment: creation, then each change of status, due date or amount. */
const PaymentHistoryDialog = ({
  open,
  payment,
  currencyCode,
  userName,
  onClose,
}: {
  open: boolean;
  /** Stays set while closing so the content does not blank during the close animation. */
  payment: OrderPayment | null;
  currencyCode: string;
  /** null — authors are hidden for the current role. */
  userName: ((userId: string) => string) | null;
  onClose: () => void;
}) => (
  <DialogShell
    open={open && payment != null}
    onOpenChange={(next) => {
      if (!next) onClose();
    }}
    size="md"
    title="История платежа"
    kicker={
      payment
        ? `${formatOutputDate(payment.dueOn)} · ${formatOrderMoney(payment.amount, currencyCode)}`
        : undefined
    }
    dismissLabel="Закрыть"
  >
    {payment == null ? null : payment.history.length === 0 ? (
      <p className="py-6 text-sm text-muted-foreground">Истории пока нет.</p>
    ) : (
      <ol className="list-none">
        {payment.history.map((event, index) => {
          const changes = paymentHistoryChanges(event);
          return (
            <li
              key={`${event.kind}-${event.changedAt}-${index}`}
              className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold">{event.kind === "create" ? "Создан" : "Изменён"}</div>
                {event.kind === "create" ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <PaymentStatusPill status={event.status} />
                    <span className="tabular-nums">{formatOutputDate(event.dueOn)}</span>
                    <span className="tabular-nums">{formatOrderMoney(event.amount, currencyCode)}</span>
                  </div>
                ) : (
                  <dl className="mt-1.5 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3.5 gap-y-1 text-sm">
                    {changes.map((change) => {
                      const from = historySideText(change, "from", currencyCode);
                      const to = historySideText(change, "to", currencyCode);
                      return (
                        <div key={change.field} className="contents">
                          <dt className="text-muted-foreground">{HISTORY_FIELD_LABEL[change.field]}</dt>
                          <dd className="m-0 flex flex-wrap items-center gap-1.5">
                            {from != null ? (
                              <s className="text-muted-foreground/60">{from}</s>
                            ) : null}
                            <span aria-hidden>→</span>
                            <span className="font-medium">{to}</span>
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
              <div className="shrink-0 pt-0.5 text-right text-xs whitespace-nowrap text-muted-foreground">
                <div className="font-medium tabular-nums text-foreground/80">{formatMetaTimestamp(event.changedAt)}</div>
                {userName ? <div>{userName(event.changedBy)}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    )}
  </DialogShell>
);

const parseRate = (raw: string): number | null => {
  const value = Number(raw.replace(/[\s\u00a0]/g, "").replace(",", "."));
  return raw.trim() && Number.isFinite(value) && value > 0 ? value : null;
};

const RatesDialog = ({
  open,
  codes,
  rates,
  nameByCode,
  kicker,
  description,
  onClose,
  onSubmit,
}: {
  kicker: string;
  description: string;
  open: boolean;
  codes: string[];
  rates: Record<string, number>;
  nameByCode: Map<string, string>;
  onClose: () => void;
  onSubmit: (changed: Record<string, number>) => Promise<boolean>;
}) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDrafts({});
      setServerError(null);
    }
  }

  const changed: Record<string, number> = {};
  const invalid: string[] = [];
  for (const [code, raw] of Object.entries(drafts)) {
    const value = parseRate(raw);
    if (value == null) invalid.push(code);
    else if (value !== rates[code]) changed[code] = value;
  }
  const changedCount = Object.keys(changed).length;
  const invalidReason =
    invalid.length > 0
      ? `Курс ${invalid.join(", ")} — число больше нуля`
      : changedCount === 0
        ? "Курсы не изменены"
        : null;

  return (
    <DialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
      size="lg"
      kicker={kicker}
      title="Курсы валют"
      description={description}
      footerSummary={changedCount > 0 ? `Изменено курсов: ${changedCount}` : undefined}
      submitLabel="Сохранить"
      pendingLabel="Сохраняем…"
      submitDisabled={invalidReason != null}
      disabledReason={invalidReason ?? undefined}
      submitting={submitting}
      serverError={serverError}
      dirty={Object.keys(drafts).length > 0}
      onSubmit={() => {
        if (invalidReason) return;
        setSubmitting(true);
        setServerError(null);
        void onSubmit(changed)
          .then((ok) => {
            if (!ok) setServerError("Курсы не сохранены");
          })
          .finally(() => setSubmitting(false));
      }}
    >
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 py-1 sm:grid-cols-2">
        {codes.map((code) => {
          const readOnly = code === "USD";
          return (
            <label key={code} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium">{code}</span>
                {nameByCode.get(code) ? <span className="text-muted-foreground"> · {nameByCode.get(code)}</span> : null}
              </span>
              <Input
                aria-label={`Курс ${code}`}
                inputMode="decimal"
                readOnly={readOnly}
                value={drafts[code] ?? String(rates[code])}
                onChange={(event) => setDrafts({ ...drafts, [code]: event.target.value })}
                className={cn(
                  "h-8 w-32 shrink-0 text-right tabular-nums",
                  readOnly && "bg-muted/40 text-muted-foreground",
                  invalid.includes(code) && "border-destructive",
                )}
              />
            </label>
          );
        })}
      </div>
    </DialogShell>
  );
};

const TEXTS = {
  order: {
    missing: "Деньги заказа не найдены.",
    currencyLabel: "Валюта заказа",
    currencyHint: "Числа суммы и платежей не пересчитываются",
    ratesKicker: "Снимок на момент создания заказа",
    ratesDescription: "Единиц валюты за 1 USD. Новые курсы меняют расчётную стоимость и суммы в календаре.",
    sectionTitle: "Сумма заказа",
  },
  transfer: {
    missing: "Деньги перемещения не найдены.",
    currencyLabel: "Валюта перемещения",
    currencyHint: "Числа платежей не пересчитываются",
    ratesKicker: "Снимок на момент создания перемещения",
    ratesDescription: "Единиц валюты за 1 USD. Сводка доставки в заказе пересчитывает платежи по снимку заказа.",
    sectionTitle: "Оплата доставки",
  },
} as const;

/**
 * «Деньги» of a production order, customer order (`variant="order"`) or transfer (`variant="transfer"`:
 * delivery payments only — no estimated cost, amount or «Не распределено»).
 */
export const OrderMoneyTab = ({
  snapshot,
  documentId,
  context,
  reload,
  variant = "order",
  editable = true,
  showEstimate = true,
  showAuthors = true,
}: {
  snapshot: LogisticsSnapshot;
  documentId: string;
  context: OrderMoneyContext;
  reload: () => Promise<void>;
  variant?: "order" | "transfer";
  /** Currency, rates, amount and payments can be changed. */
  editable?: boolean;
  /** «Расчётная стоимость» cell and the rates button. */
  showEstimate?: boolean;
  /** Payment authors in «Создан» and the history window. */
  showAuthors?: boolean;
}) => {
  const texts = TEXTS[variant];
  const isTransfer = variant === "transfer";
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [historyPaymentId, setHistoryPaymentId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusPending, setStatusPending] = useState<string | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);
  const { money, payments, currencies } = context;
  const summary = summarizeOrderMoney(snapshot, documentId, context);

  if (!money || !summary) {
    return (
      <DocumentSection title="Деньги">
        <p className="px-4 py-6 text-sm text-muted-foreground">{texts.missing}</p>
      </DocumentSection>
    );
  }

  const currencyCode = money.currencyCode;
  const userName = (userId: string) => snapshot.users.find((user) => user.id === userId)?.name ?? "—";
  const nameByCode = new Map(currencies.map((currency) => [currency.code, currency.name]));
  const snapshotCodes = Object.keys(money.rates).sort((a, b) =>
    a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b),
  );
  const currencyItems = snapshotCodes.map((code) => ({ value: code, label: code }));
  const today = todayIso();
  const paymentsSummary = summarizePayments(payments, allocatedAmount(payments), currencyCode, today);

  const saveRates = async (changed: Record<string, number>) => {
    const ok = await runLogisticsAction(() => setOrderRates(documentId, changed), "Курсы сохранены", reload);
    if (ok) setRatesOpen(false);
    return ok;
  };

  const submitPayment = async (draft: PaymentDraft) => {
    const ok = await savePaymentDraft(documentId, draft, reload);
    if (ok) setPaymentDraft(null);
    return ok;
  };

  const setStatus = (payment: OrderPayment, status: PaymentStatus) => {
    if (status === payment.status) return;
    setStatusPending(payment.id);
    void runLogisticsAction(
      () =>
        saveOrderPayment({
          documentId,
          paymentId: payment.id,
          dueOn: payment.dueOn,
          amount: payment.amount,
          status,
        }),
      "Статус платежа сохранён",
      reload,
    ).finally(() => setStatusPending(null));
  };

  return (
    <div className="flex flex-col gap-4">
      <DocumentSection title={texts.sectionTitle}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCell label={texts.currencyLabel} hint={editable ? texts.currencyHint : undefined}>
            {editable ? (
              <Select
                items={currencyItems}
                value={currencyCode}
                onValueChange={(value) => {
                  if (!value || value === currencyCode) return;
                  void runLogisticsAction(
                    () => setOrderCurrency(documentId, value),
                    `${texts.currencyLabel} — ${value}`,
                    reload,
                  );
                }}
              >
                <SelectTrigger className="h-8 w-40 bg-background" aria-label={texts.currencyLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {snapshotCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                        {nameByCode.get(code) ? ` · ${nameByCode.get(code)}` : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            ) : (
              <span>
                {currencyCode}
                {nameByCode.get(currencyCode) ? ` · ${nameByCode.get(currencyCode)}` : ""}
              </span>
            )}
            {editable && showEstimate ? (
              <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => setRatesOpen(true)}>
                Курсы
              </Button>
            ) : null}
          </SummaryCell>
          {isTransfer ? (
            <SummaryCell label="Оплачено" hint="Платежи со статусом «Оплачен» из всех платежей перемещения">
              <span className="tabular-nums">
                {formatOrderMoney(paymentsSummary.paid, currencyCode)} из{" "}
                {formatOrderMoney(paymentsSummary.total, currencyCode)}
              </span>
            </SummaryCell>
          ) : null}
          {isTransfer ? null : (
            <>
              {showEstimate ? (
                <SummaryCell label="Расчётная стоимость" hint="Цены строк по снимку курсов заказа">
                  <span className="tabular-nums">{formatOrderMoney(summary.estimated, currencyCode)}</span>
                </SummaryCell>
              ) : null}
              <SummaryCell
                label="Сумма заказа"
                hint={
                  !editable
                    ? undefined
                    : money.amount == null
                      ? "Пусто — равна расчётной"
                      : "Очистите, чтобы вернуть расчётную"
                }
              >
                <OrderAmountInput
                  documentId={documentId}
                  amount={money.amount}
                  estimated={summary.estimated}
                  currencyCode={currencyCode}
                  readOnly={!editable}
                  reload={reload}
                />
              </SummaryCell>
              <SummaryCell label="Не распределено" hint="Сумма заказа минус все платежи">
                <span className={cn("tabular-nums", summary.rest < 0 && "font-semibold text-red-700")}>
                  {formatOrderMoney(summary.rest, currencyCode)}
                </span>
              </SummaryCell>
            </>
          )}
        </div>
      </DocumentSection>

      <DocumentSection
        title="Платежи"
        tools={
          editable ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setPaymentDraft(newPaymentDraft(isTransfer ? 0 : summary.rest))}
            >
              Добавить платёж
            </Button>
          ) : null
        }
      >
        {payments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">Платежей пока нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="w-48 px-4 py-2 font-medium whitespace-nowrap">Срок оплаты</th>
                  <th className="w-36 px-4 py-2 text-right font-medium whitespace-nowrap">Сумма</th>
                  <th className="w-44 px-4 py-2 font-medium">Статус</th>
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Создан</th>
                  <th className="w-px px-4 py-2" aria-label="Действия" />
                  <th aria-hidden />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const overdue = isPaymentOverdue(payment, today);
                  return (
                    <tr key={payment.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-4 py-2">
                        <span className={cn("tabular-nums", overdue && "font-medium text-red-700")}>
                          {formatOutputDate(payment.dueOn)}
                        </span>
                        {overdue ? (
                          <span className="ml-2 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            просрочен
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">{formatOrderMoney(payment.amount, currencyCode)}</td>
                      <td className="px-4 py-2">
                        {editable ? (
                          <Select
                            items={PAYMENT_STATUSES.map((status) => ({ value: status, label: PAYMENT_STATUS_LABELS[status] }))}
                            value={payment.status}
                            disabled={statusPending === payment.id}
                            onValueChange={(value) => {
                              if (value) setStatus(payment, value as PaymentStatus);
                            }}
                          >
                            <SelectTrigger
                              className="-ml-2 h-8 w-auto gap-1.5 border-transparent bg-transparent px-2 shadow-none hover:border-border hover:bg-muted/50"
                              aria-label="Статус платежа"
                            >
                              <PaymentStatusPill status={payment.status} />
                              <SelectValue className="sr-only" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                {PAYMENT_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {PAYMENT_STATUS_LABELS[status]}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        ) : (
                          <PaymentStatusPill status={payment.status} />
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="tabular-nums whitespace-nowrap">{formatMetaTimestamp(payment.createdAt)}</div>
                        {showAuthors ? (
                          <div className="text-xs text-muted-foreground">{userName(payment.createdBy)}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                          setHistoryPaymentId(payment.id);
                          setHistoryOpen(true);
                        }}
                        >
                          История
                        </Button>
                        {editable ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setPaymentDraft({
                                  id: payment.id,
                                  dueOn: payment.dueOn,
                                  amount: formatMoneyInput(payment.amount),
                                  status: payment.status,
                                })
                              }
                            >
                              Изменить
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() =>
                                void runLogisticsAction(() => deleteOrderPayment(payment.id), "Платёж удалён", reload)
                              }
                            >
                              Удалить
                            </Button>
                          </>
                        ) : null}
                      </td>
                      <td aria-hidden />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DocumentSection>

      <RatesDialog
        open={ratesOpen}
        codes={snapshotCodes}
        rates={money.rates}
        nameByCode={nameByCode}
        kicker={texts.ratesKicker}
        description={texts.ratesDescription}
        onClose={() => setRatesOpen(false)}
        onSubmit={saveRates}
      />

      <PaymentDialog
        draft={paymentDraft}
        currencyCode={currencyCode}
        currencyLabel={texts.currencyLabel}
        onClose={() => setPaymentDraft(null)}
        onSubmit={submitPayment}
      />

      <PaymentHistoryDialog
        open={historyOpen}
        payment={payments.find((payment) => payment.id === historyPaymentId) ?? null}
        currencyCode={currencyCode}
        userName={showAuthors ? userName : null}
        onClose={() => setHistoryOpen(false)}
      />
    </div>
  );
};
