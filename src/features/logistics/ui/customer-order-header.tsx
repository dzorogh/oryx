"use client";

import {
  AlarmClock,
  Ban,
  CalendarClock,
  CalendarPlus,
  Copy,
  Factory,
  MoreHorizontal,
  PackageCheck,
  Plus,
  ShoppingCart,
  Wallet,
  Warehouse,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deadlineCountdown,
  deadlineCountdownLabel,
  deadlineProgress,
  fulfillmentSegments,
  paymentProgress,
  summarizeOrderFulfillment,
  type DeadlineCountdown,
  type HeaderTone,
  type OrderFulfillmentSummary,
} from "@/features/logistics/customer-order-oms";
import type { CancelGuidance, CancelGuidanceAction } from "@/features/logistics/logistics-cancel-guidance";
import { CUSTOMER_ORDER_STATUS_LABELS, formatMetaTimestamp, formatQuantity } from "@/features/logistics/logistics-labels";
import type { CustomerOrderLine, CustomerOrderStatus, StockBalance } from "@/features/logistics/logistics-types";
import { formatOrderMoney, type PaymentsSummary } from "@/features/logistics/order-money";
import { CopyCustomerOrderDialog, CustomerOrderNote } from "@/features/logistics/ui/customer-order-oms-fields";
import { DocumentCancelDialog } from "@/features/logistics/ui/document-cancel-guidance";
import {
  DocumentMetaDateInput,
  DocumentMetaEmpty,
  pluralPositions,
} from "@/features/logistics/ui/document/document-meta-field";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { openDocumentTab } from "@/features/logistics/ui/document/document-tab-hash";
import { AddPaymentDialog, OrderAmountInput } from "@/features/logistics/ui/order-money-tab";
import { StatusPill } from "@/features/logistics/ui/status-badge";
import { cn } from "@/lib/utils";

const TONE_CLASS: Record<HeaderTone, string> = {
  neutral: "text-muted-foreground",
  warning: "text-amber-700",
  danger: "text-red-700",
};

const PANEL_LINK_CLASS =
  "cursor-pointer rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

/** `onClick` — the title opens the related tab; `action` sits on the right without changing the row height. */
const PanelTitle = ({
  icon: Icon,
  children,
  onClick,
  action,
}: {
  icon: typeof PackageCheck;
  children: ReactNode;
  onClick?: () => void;
  action?: ReactNode;
}) => {
  const content = (
    <>
      <Icon className="size-3.5" aria-hidden />
      {children}
    </>
  );
  return (
    <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {onClick ? (
        <button
          type="button"
          className={cn("inline-flex items-center gap-1.5 uppercase transition-colors", PANEL_LINK_CLASS)}
          onClick={onClick}
        >
          {content}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1.5">{content}</span>
      )}
      {action ? <div className="-my-1 shrink-0 normal-case">{action}</div> : null}
    </div>
  );
};

const HEADER_BADGE_CLASS = "h-6 px-2.5";

const ORDER_TYPE = {
  hub: { label: "Склад региона", icon: Warehouse, className: "border-sky-200 bg-sky-50 text-sky-800" },
  plant: { label: "Производственная площадка", icon: Factory, className: "border-violet-200 bg-violet-50 text-violet-800" },
} as const;

/** Checkout method of the order: regional hub stock or a production site. */
const OrderTypeBadge = ({ kind, code }: { kind: "plant" | "hub" | null; code: string | null }) => {
  if (!kind) return null;
  const type = ORDER_TYPE[kind];
  const Icon = type.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border text-xs font-medium whitespace-nowrap",
        HEADER_BADGE_CLASS,
        type.className,
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {type.label}
      {code ? <span className="font-mono text-[11px] font-semibold tracking-wide opacity-80">{code}</span> : null}
    </span>
  );
};

/** Same height in every panel so the progress bars under it line up. */
const PanelValue = ({ children }: { children: ReactNode }) => (
  <div className="flex h-9 items-center">{children}</div>
);

const LegendDot = ({ className }: { className: string }) => (
  <span className={cn("inline-block size-2 rounded-full", className)} aria-hidden />
);

const FulfillmentPanel = ({ fulfillment, open }: { fulfillment: OrderFulfillmentSummary; open: boolean }) => {
  const { positions, ordered, shipped, reserved, inProduction, uncovered } = fulfillment;
  const empty = positions === 0;
  const segments = fulfillmentSegments(fulfillment);

  return (
    <section className="px-6 py-4">
      <PanelTitle icon={PackageCheck}>Выполнение</PanelTitle>
      <PanelValue>
        {empty ? (
          <span className="text-xl font-semibold tracking-tight text-muted-foreground">Товаров нет</span>
        ) : (
          <span className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-tight tabular-nums">{formatQuantity(shipped)}</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              из {formatQuantity(ordered)} шт отгружено
            </span>
          </span>
        )}
      </PanelValue>
      <div className="mt-2.5 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-muted">
        <div className="bg-green-600" style={{ width: `${segments.shipped}%` }} />
        <div className="bg-blue-500" style={{ width: `${segments.reserved}%` }} />
        {inProduction > 0 ? <div className="bg-violet-500" style={{ width: `${segments.inProduction}%` }} /> : null}
        {open && uncovered > 0 ? <div className="bg-amber-400" style={{ width: `${segments.uncovered}%` }} /> : null}
      </div>
      {!empty ? (
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-1.5">
            <LegendDot className="bg-blue-500" />В резерве {formatQuantity(reserved)}
          </span>
          {inProduction > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <LegendDot className="bg-violet-500" />В производстве {formatQuantity(inProduction)}
            </span>
          ) : null}
          {open ? (
            <span className="inline-flex items-center gap-1.5">
              <LegendDot className="bg-amber-400" />Не обеспечено {formatQuantity(uncovered)}
            </span>
          ) : null}
          <span className="text-muted-foreground/70">{pluralPositions(positions)}</span>
        </div>
      ) : null}
    </section>
  );
};

const PaymentPanel = ({
  orderId,
  money,
  paymentsSummary,
  paymentCount,
  reload,
}: {
  orderId: string;
  /** `rest` — «Не распределено»: order amount minus all payments. */
  money: { amount: number | null; estimated: number; currencyCode: string; rest: number } | null;
  paymentsSummary: PaymentsSummary | null;
  paymentCount: number;
  reload: () => Promise<void>;
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const progress = paymentsSummary ? paymentProgress(paymentsSummary, paymentCount) : null;
  const paidPct = progress?.paidPct ?? 0;
  const openMoney = () => openDocumentTab("money");

  return (
    <section className="px-6 py-4">
      <PanelTitle
        icon={Wallet}
        onClick={openMoney}
        action={
          money ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="ghost" size="icon-xs" aria-label="Действия с оплатой">
                    <MoreHorizontal className="size-4" aria-hidden />
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuItem onClick={() => setAddOpen(true)}>
                  <Plus className="size-4" aria-hidden />
                  Добавить платёж
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null
        }
      >
        Оплата
      </PanelTitle>
      <PanelValue>
        {money ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <OrderAmountInput
              variant="panel"
              documentId={orderId}
              amount={money.amount}
              estimated={money.estimated}
              currencyCode={money.currencyCode}
              reload={reload}
            />
            {money.amount == null ? <span className="text-xs text-muted-foreground">расчётная</span> : null}
          </span>
        ) : (
          <span className="text-xl font-semibold tracking-tight">
            <DocumentMetaEmpty />
          </span>
        )}
      </PanelValue>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-1.5 rounded-full bg-green-600" style={{ width: `${paidPct}%` }} />
      </div>
      {paymentsSummary && progress ? (
        <>
          <button
            type="button"
            className={cn("mt-2.5 block text-left text-xs text-muted-foreground tabular-nums", PANEL_LINK_CLASS)}
            onClick={openMoney}
          >
            Оплачено{" "}
            <span className="font-semibold text-foreground">
              {formatOrderMoney(paymentsSummary.paid, paymentsSummary.currencyCode)}
            </span>{" "}
            · {paidPct}%
          </button>
          {paymentCount > 0 ? (
            <div
              className={cn(
                "mt-1 flex items-center gap-1.5 text-xs whitespace-nowrap tabular-nums",
                progress.overdue
                  ? "font-medium text-red-700"
                  : progress.muted
                    ? "text-muted-foreground/70"
                    : "text-muted-foreground",
              )}
            >
              {progress.overdue ? <AlarmClock className="size-3 shrink-0" aria-hidden /> : null}
              {progress.dueText}
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-2.5 text-xs text-muted-foreground/70">
          <DocumentMetaEmpty />
        </div>
      )}
      {money ? (
        <AddPaymentDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          documentId={orderId}
          currencyCode={money.currencyCode}
          suggestedAmount={money.rest}
          reload={reload}
        />
      ) : null}
    </section>
  );
};

const DEADLINE_BAR_CLASS: Record<HeaderTone, string> = {
  neutral: "bg-foreground/60",
  warning: "bg-amber-400",
  danger: "bg-red-500",
};

/** Native date picker opened from a visible button; the input sits under the button so the picker anchors to it. */
const SetDateButton = ({ onChange }: { onChange: (value: string | null) => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };
  return (
    <span className="relative inline-flex">
      <Button type="button" variant="outline" className="gap-1.5" onClick={openPicker}>
        <CalendarPlus className="size-4" aria-hidden />
        Установить дату
      </Button>
      <input
        ref={inputRef}
        type="date"
        tabIndex={-1}
        aria-label="Ожидаемое окончание"
        className="pointer-events-none absolute inset-0 opacity-0"
        onChange={(event) => onChange(event.target.value || null)}
      />
    </span>
  );
};

const DatesPanel = ({
  expectedEndOn,
  countdown,
  createdAt,
  completedAt,
  open,
  onExpectedEndChange,
}: {
  expectedEndOn: string | null;
  countdown: DeadlineCountdown | null;
  createdAt: string;
  completedAt: string | null;
  open: boolean;
  onExpectedEndChange: (value: string | null) => void;
}) => {
  const countdownView = countdown ? deadlineCountdownLabel(countdown) : null;
  const overdue = countdown?.kind === "overdue";
  const progress = open ? deadlineProgress(createdAt, expectedEndOn) : completedAt ? 100 : null;
  const openHistory = () => openDocumentTab("history");

  return (
    <section className="px-6 py-4">
      <PanelTitle icon={CalendarClock} onClick={openHistory}>
        Сроки
      </PanelTitle>
      <PanelValue>
        {open && !expectedEndOn ? (
          <SetDateButton onChange={onExpectedEndChange} />
        ) : (
          <span
            className={cn(
              "[&_input]:text-xl [&_input]:font-semibold [&_input]:tracking-tight",
              overdue && "[&_input]:text-red-700",
            )}
          >
            <DocumentMetaDateInput
              value={expectedEndOn ?? ""}
              aria-label="Ожидаемое окончание"
              overdueDays={0}
              onChange={(value) => onExpectedEndChange(value || null)}
            />
          </span>
        )}
      </PanelValue>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-1.5 rounded-full",
            open ? DEADLINE_BAR_CLASS[countdownView?.tone ?? "neutral"] : "bg-green-600",
          )}
          style={{ width: `${progress ?? 0}%` }}
        />
      </div>
      <button
        type="button"
        className={cn("mt-2.5 block text-left text-xs tabular-nums", PANEL_LINK_CLASS)}
        onClick={openHistory}
      >
        {!open && completedAt ? (
          <span className="text-muted-foreground">Завершён {formatMetaTimestamp(completedAt)}</span>
        ) : countdownView ? (
          <span className={cn("font-medium", TONE_CLASS[countdownView.tone])}>{countdownView.text}</span>
        ) : (
          <span className="text-muted-foreground/70">{expectedEndOn ? "—" : "Не задан"}</span>
        )}
      </button>
    </section>
  );
};

export const CustomerOrderHeader = ({
  orderId,
  number,
  status,
  regionCode,
  regionHref,
  tenant,
  sourceKind,
  sourceCode,
  authorName,
  description,
  canAct,
  createdAt,
  completedAt,
  expectedEndOn,
  lines,
  balances,
  plannedByProduct,
  money,
  paymentsSummary,
  paymentCount,
  cancelGuidance,
  reload,
  onExpectedEndChange,
  onStart,
  onClose,
  onCancelFollowUp,
}: {
  orderId: string;
  number: string;
  status: CustomerOrderStatus;
  regionCode: string;
  regionHref: string;
  tenant: string;
  sourceKind: "plant" | "hub" | null;
  /** `WH-n` for a hub, `PLT-n` for a plant. */
  sourceCode: string | null;
  authorName: string | null;
  description: string;
  canAct: boolean;
  createdAt: string;
  completedAt: string | null;
  expectedEndOn: string | null;
  lines: CustomerOrderLine[];
  balances: StockBalance[];
  /** Product id → quantity in draft outputs assigned to the order. */
  plannedByProduct: ReadonlyMap<string, number>;
  /** `rest` — «Не распределено»: order amount minus all payments. */
  money: { amount: number | null; estimated: number; currencyCode: string; rest: number } | null;
  paymentsSummary: PaymentsSummary | null;
  paymentCount: number;
  cancelGuidance: CancelGuidance;
  reload: () => Promise<void>;
  onExpectedEndChange: (value: string | null) => void;
  onStart: () => void;
  onClose: () => void;
  onCancelFollowUp: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
}) => {
  const [copyOpen, setCopyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const fulfillment = summarizeOrderFulfillment(lines, balances, canAct, plannedByProduct);
  const countdown = deadlineCountdown(expectedEndOn, canAct);
  const showCancel = cancelGuidance.mode !== "hidden";

  const contextRows: Array<{ label: string; value: ReactNode }> = [
    {
      label: "Регион",
      value: <LogisticsCodeBadge code={regionCode} href={regionHref} />,
    },
    { label: "Тенант", value: tenant },
    { label: "Автор", value: authorName ?? <DocumentMetaEmpty /> },
    { label: "Создан", value: <span className="tabular-nums">{formatMetaTimestamp(createdAt)}</span> },
    ...(completedAt
      ? [{ label: "Завершён", value: <span className="tabular-nums">{formatMetaTimestamp(completedAt)}</span> }]
      : []),
  ];

  return (
    <Card
      size="sm"
      className={cn(
        logisticsCardClass,
        "gap-0 overflow-hidden rounded-xl py-0 shadow-sm data-[size=sm]:gap-0 data-[size=sm]:py-0",
      )}
    >
      <div className="px-6 pt-5 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShoppingCart className="size-3.5" aria-hidden />
              Заказ клиента
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] leading-none font-semibold tracking-tight">{number}</h1>
              <StatusPill status={status} label={CUSTOMER_ORDER_STATUS_LABELS[status]} className={HEADER_BADGE_CLASS} />
              <OrderTypeBadge kind={sourceKind} code={sourceCode} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button type="button" variant="outline" className="gap-1.5">
                    <MoreHorizontal className="size-4" aria-hidden />
                    Ещё
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem onClick={() => setCopyOpen(true)}>
                  <Copy className="size-4" aria-hidden />
                  Создать копию
                </DropdownMenuItem>
                {showCancel ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setCancelOpen(true)}>
                      <Ban className="size-4" aria-hidden />
                      Отменить заказ
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
            {canAct && status === "draft" ? (
              <Button type="button" onClick={onStart}>
                В работу
              </Button>
            ) : null}
            {canAct ? (
              <Button type="button" variant={status === "draft" ? "outline" : "default"} onClick={onClose}>
                Закрыть заказ клиента
              </Button>
            ) : null}
          </div>
        </div>

        <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          {contextRows.map((row) => (
            <div key={row.label} className="flex items-center gap-1.5">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {canAct || description.trim() ? (
          <div className="mt-3">
            <CustomerOrderNote
              key={description}
              orderId={orderId}
              description={description}
              editable={canAct}
              reload={reload}
            />
          </div>
        ) : null}
      </div>

      <div className="grid divide-y border-t md:grid-cols-3 md:divide-x md:divide-y-0">
        <FulfillmentPanel fulfillment={fulfillment} open={canAct} />
        <PaymentPanel
          orderId={orderId}
          money={money}
          paymentsSummary={paymentsSummary}
          paymentCount={paymentCount}
          reload={reload}
        />
        <DatesPanel
          expectedEndOn={expectedEndOn}
          countdown={countdown}
          createdAt={createdAt}
          completedAt={completedAt}
          open={canAct}
          onExpectedEndChange={onExpectedEndChange}
        />
      </div>

      <CopyCustomerOrderDialog
        open={copyOpen}
        onOpenChange={setCopyOpen}
        orderId={orderId}
        orderNumber={number}
      />
      <DocumentCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        guidance={cancelGuidance}
        kicker={number}
        reload={reload}
        onFollowUp={onCancelFollowUp}
      />
    </Card>
  );
};
