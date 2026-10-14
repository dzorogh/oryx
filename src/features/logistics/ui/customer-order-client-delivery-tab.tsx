"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_DELIVERY_PAYMENT_STATUS_LABELS,
  CLIENT_DELIVERY_PAYMENT_STATUSES,
  CLIENT_DELIVERY_STATUS_LABELS,
  CLIENT_DELIVERY_STATUSES,
  isClientDeliveryPaymentStatus,
  isClientDeliveryStatus,
  prepareMoneySave,
  validateExtrasAmount,
  type ClientDelivery,
  type ClientDeliveryMoney,
  type ClientDeliveryPaymentStatus,
  type ClientDeliveryStatus,
} from "@/features/logistics/customer-order-extras";
import { setCustomerOrderClientDelivery } from "@/features/logistics/logistics-api";
import { formatMoneyInput, formatOrderMoney, type OrderCurrency } from "@/features/logistics/order-money";
import { DocumentMetaDateInput } from "@/features/logistics/ui/document/document-meta-field";
import { DocumentSection } from "@/features/logistics/ui/document/document-section";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

const STATUS_NONE = "none";
const CURRENCY_NONE = "none";

const fieldClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2 text-sm font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 sm:w-40";

const refuse = (error: string) => {
  toast.error("Не удалось выполнить действие", { description: error });
};

const moneySame = (left: ClientDeliveryMoney, right: ClientDeliveryMoney): boolean => {
  if (left.currencyCode !== right.currencyCode) return false;
  if (left.amount == null || right.amount == null) return left.amount == null && right.amount == null;
  return Math.abs(left.amount - right.amount) < 0.0001;
};

const deliverySame = (left: ClientDelivery, right: ClientDelivery): boolean =>
  left.deliveryStatus === right.deliveryStatus &&
  left.paymentStatus === right.paymentStatus &&
  left.dueOn === right.dueOn &&
  moneySame(left.invoice, right.invoice) &&
  moneySame(left.paid, right.paid);

const ExtrasRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid gap-2 px-4 py-3 sm:grid-cols-[16rem_minmax(0,1fr)] sm:items-center">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="min-w-0">{children}</div>
  </div>
);

type StatusItem = { value: string; label: string };

const statusOptions = <T extends string>(statuses: readonly T[], labels: Record<T, string>): StatusItem[] => [
  { value: STATUS_NONE, label: "—" },
  ...statuses.map((status) => ({ value: status, label: labels[status] })),
];

const StatusSelectRow = ({
  label,
  items,
  value,
  pending,
  onChange,
}: {
  label: string;
  items: StatusItem[];
  value: string | null;
  pending: boolean;
  onChange: (value: string) => void;
}) => (
  <ExtrasRow label={label}>
    <Select
      items={items}
      value={value ?? STATUS_NONE}
      disabled={pending}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger className="h-8 w-full bg-background sm:w-72" aria-label={label}>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  </ExtrasRow>
);

const MoneyPair = ({
  label,
  field,
  money,
  currencies,
  pending,
  onCommit,
}: {
  label: string;
  field: "invoice" | "paid";
  money: ClientDeliveryMoney;
  currencies: OrderCurrency[];
  pending: boolean;
  onCommit: (next: ClientDeliveryMoney) => void;
}) => {
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const [currencyHold, setCurrencyHold] = useState<string | null | undefined>(undefined);
  const discardRef = useRef(false);
  const savedKey = `${money.amount ?? ""}:${money.currencyCode ?? ""}`;
  const [seenKey, setSeenKey] = useState(savedKey);
  if (seenKey !== savedKey) {
    setSeenKey(savedKey);
    setAmountDraft(null);
    setCurrencyHold(undefined);
  }

  const currency = currencyHold === undefined ? money.currencyCode : currencyHold;
  const shownAmount =
    amountDraft ??
    (money.amount == null ? "" : currency ? formatOrderMoney(money.amount, currency) : formatMoneyInput(money.amount));
  const codes = [...currencies].sort((left, right) => left.code.localeCompare(right.code));
  if (currency && !codes.some((item) => item.code === currency)) {
    codes.unshift({ id: currency, code: currency, name: "" });
  }

  const apply = (rawAmount: string, nextCurrency: string | null, source: "amount" | "currency") => {
    const parsed = validateExtrasAmount(rawAmount);
    if (parsed.error) {
      refuse(parsed.error);
      return;
    }
    if (parsed.amount == null) {
      if (source === "currency") {
        setCurrencyHold(nextCurrency);
        return;
      }
      setAmountDraft(null);
      setCurrencyHold(undefined);
      onCommit({ amount: null, currencyCode: null });
      return;
    }
    const prepared = prepareMoneySave(field, rawAmount, nextCurrency);
    if (!prepared.ok) {
      refuse(prepared.error);
      if (source === "amount") setAmountDraft(rawAmount);
      return;
    }
    setAmountDraft(null);
    setCurrencyHold(undefined);
    onCommit(prepared.value);
  };

  return (
    <ExtrasRow label={label}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          disabled={pending}
          value={shownAmount}
          placeholder="—"
          onFocus={() => {
            if (amountDraft == null) setAmountDraft(formatMoneyInput(money.amount));
          }}
          onChange={(event) => setAmountDraft(event.target.value)}
          onBlur={(event) => {
            if (discardRef.current) {
              discardRef.current = false;
              setAmountDraft(null);
              return;
            }
            const raw = event.currentTarget.value;
            const plain = formatMoneyInput(money.amount);
            const formatted = money.amount == null ? "" : currency ? formatOrderMoney(money.amount, currency) : plain;
            if (raw === formatted || raw === plain) {
              setAmountDraft(null);
              return;
            }
            apply(raw, currency, "amount");
          }}
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
          className={fieldClassName}
        />
        <Select
          items={[
            { value: CURRENCY_NONE, label: "—" },
            ...codes.map((item) => ({
              value: item.code,
              label: item.name ? `${item.code} · ${item.name}` : item.code,
            })),
          ]}
          value={currency ?? CURRENCY_NONE}
          disabled={pending}
          onValueChange={(value) => {
            if (!value) return;
            const next = value === CURRENCY_NONE ? null : value;
            if (next === currency) return;
            const raw = amountDraft ?? (money.amount == null ? "" : formatMoneyInput(money.amount));
            apply(raw, next, "currency");
          }}
        >
          <SelectTrigger className="h-8 w-44 bg-background" aria-label={`Валюта: ${label}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={CURRENCY_NONE}>—</SelectItem>
              {codes.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {item.code}
                  {item.name ? ` · ${item.name}` : ""}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </ExtrasRow>
  );
};

/** «Доставка клиента»: the customer's own delivery status, cost and payment status. Editable at any order status. */
export const CustomerOrderClientDeliveryTab = ({
  orderId,
  delivery,
  currencies,
  reload,
}: {
  orderId: string;
  delivery: ClientDelivery;
  currencies: OrderCurrency[];
  reload: () => Promise<void>;
}) => {
  const [pending, setPending] = useState(false);
  const deliveryStatusItems = statusOptions(CLIENT_DELIVERY_STATUSES, CLIENT_DELIVERY_STATUS_LABELS);
  const paymentStatusItems = statusOptions(CLIENT_DELIVERY_PAYMENT_STATUSES, CLIENT_DELIVERY_PAYMENT_STATUS_LABELS);

  const persist = (next: ClientDelivery) => {
    if (deliverySame(next, delivery)) return;
    setPending(true);
    void runLogisticsAction(
      () => setCustomerOrderClientDelivery(orderId, next),
      "Доставка клиента сохранена",
      reload,
    ).finally(() => setPending(false));
  };

  const setDeliveryStatus = (value: string) => {
    const deliveryStatus: ClientDeliveryStatus | null = isClientDeliveryStatus(value) ? value : null;
    persist({ ...delivery, deliveryStatus });
  };

  const setPaymentStatus = (value: string) => {
    const paymentStatus: ClientDeliveryPaymentStatus | null = isClientDeliveryPaymentStatus(value) ? value : null;
    persist({ ...delivery, paymentStatus });
  };

  return (
    <DocumentSection title="Доставка клиента">
      <p className="border-b border-border/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        Доставку от склада отгрузки к себе клиент организует сам. Здесь он ведёт её статус, стоимость и статус оплаты
        для своего учёта. Не связано с перемещениями товаров между складами.
      </p>
      <div className="divide-y divide-border/60">
        <StatusSelectRow
          label="Статус доставки"
          items={deliveryStatusItems}
          value={delivery.deliveryStatus}
          pending={pending}
          onChange={setDeliveryStatus}
        />
        <StatusSelectRow
          label="Статус оплаты доставки"
          items={paymentStatusItems}
          value={delivery.paymentStatus}
          pending={pending}
          onChange={setPaymentStatus}
        />
        <MoneyPair
          label="Инвойс"
          field="invoice"
          money={delivery.invoice}
          currencies={currencies}
          pending={pending}
          onCommit={(invoice) => persist({ ...delivery, invoice })}
        />
        <MoneyPair
          label="Оплачено"
          field="paid"
          money={delivery.paid}
          currencies={currencies}
          pending={pending}
          onCommit={(paid) => persist({ ...delivery, paid })}
        />
        <ExtrasRow label="Срок оплаты">
          <DocumentMetaDateInput
            value={delivery.dueOn ?? ""}
            aria-label="Срок оплаты"
            disabled={pending}
            onChange={(value) => persist({ ...delivery, dueOn: value || null })}
          />
        </ExtrasRow>
      </div>
    </DocumentSection>
  );
};
