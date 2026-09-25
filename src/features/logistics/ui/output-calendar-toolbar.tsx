// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatLogisticsCode } from "@/features/logistics/logistics-codes";
import { PAYMENT_STATUS_LABELS } from "@/features/logistics/order-money";
import {
  incomingFilterChanged,
  incomingOrderOptions,
  incomingRegionOptions,
  outputsFilterChanged,
  outputsFilterSummary,
  plantPaymentOptions,
  plantPaymentsFilterChanged,
  UNPAID_STATUSES,
  type IncomingFilter,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage,
  type PlantPaymentsFilter,
  type UnpaidStatus,
} from "@/features/logistics/output-calendar";
import { CalendarMasterCheckbox } from "@/features/logistics/ui/output-calendar-master-checkbox";
import { cn } from "@/lib/utils";
import { ChevronsDownUp, ChevronsUpDown, ListFilter, RefreshCw } from "lucide-react";

export type CalendarPanel = "outputs" | "plants" | "incoming";

const PANEL_TITLES: Record<CalendarPanel, string> = {
  outputs: "Выпуски",
  plants: "Платежи заводам",
  incoming: "Поступления",
};

type OutputCalendarToolbarProps = {
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  plantPaymentsFilter: PlantPaymentsFilter;
  incomingFilter: IncomingFilter;
  panel: CalendarPanel | null;
  onTogglePanel: (panel: CalendarPanel) => void;
  onRefresh: () => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  refreshing?: boolean;
};

const FilterButton = ({
  label,
  open,
  changed,
  onClick,
}: {
  label: string;
  open: boolean;
  changed: boolean;
  onClick: () => void;
}) => (
  <Button
    type="button"
    size="sm"
    variant="outline"
    aria-pressed={open}
    onClick={onClick}
    className={cn("gap-1.5", open && "border-foreground/40 bg-muted")}
    title={changed ? "Фильтр изменён" : undefined}
  >
    <ListFilter
      aria-hidden
      className={cn("size-3.5", changed ? "text-foreground" : "text-muted-foreground/50")}
      strokeWidth={changed ? 2.6 : 2}
    />
    {label}
    {changed ? <span className="sr-only">(фильтр изменён)</span> : null}
  </Button>
);

export const OutputCalendarToolbar = ({
  page,
  filter,
  plantId,
  plantPaymentsFilter,
  incomingFilter,
  panel,
  onTogglePanel,
  onRefresh,
  onCollapseAll,
  onExpandAll,
  refreshing,
}: OutputCalendarToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Календарь выпусков</h1>
          <p className="text-xs text-muted-foreground">
            Приход по запланированным выпускам, платежи заводам и поступления от клиентов в{" "}
            {page.productionCurrency}
          </p>
        </div>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-wrap items-center gap-2">
        <FilterButton
          label={PANEL_TITLES.outputs}
          open={panel === "outputs"}
          changed={outputsFilterChanged(filter, page, plantId)}
          onClick={() => onTogglePanel("outputs")}
        />
        <FilterButton
          label={PANEL_TITLES.plants}
          open={panel === "plants"}
          changed={plantPaymentsFilterChanged(plantPaymentsFilter)}
          onClick={() => onTogglePanel("plants")}
        />
        <FilterButton
          label={PANEL_TITLES.incoming}
          open={panel === "incoming"}
          changed={incomingFilterChanged(incomingFilter)}
          onClick={() => onTogglePanel("incoming")}
        />

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw aria-hidden className={cn("size-3.5", refreshing && "animate-spin")} />
          Обновить
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCollapseAll} className="gap-1.5">
            <ChevronsDownUp aria-hidden className="size-3.5" />
            Свернуть все
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onExpandAll} className="gap-1.5">
            <ChevronsUpDown aria-hidden className="size-3.5" />
            Развернуть все
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{outputsFilterSummary(filter, page, plantId)}</p>
    </CardHeader>
  </Card>
);

const SidePanel = ({
  title,
  onClose,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}) => (
  <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-background shadow-[-8px_0_24px_rgba(24,24,27,0.08)]">
    <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Закрыть
      </Button>
    </div>
    <div className="flex-1 space-y-1 overflow-auto px-3.5 py-3 text-xs">{children}</div>
    <div className="flex gap-2 border-t border-border px-3.5 py-2.5">{footer}</div>
  </aside>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
  <div className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase first:mt-0">
    {children}
  </div>
);

const Divider = () => <div className="my-1.5 h-px bg-border" aria-hidden />;

const toggleIn = <T,>(list: T[], value: T, include: boolean): T[] => {
  const set = new Set(list);
  if (include) set.add(value);
  else set.delete(value);
  return Array.from(set);
};

/** Checkbox list over an exclusion set: checked = not hidden. */
const ExclusionList = ({
  allLabel,
  items,
  hidden,
  onChange,
}: {
  allLabel: string;
  items: Array<{ id: string; label: string }>;
  hidden: string[];
  onChange: (hidden: string[]) => void;
}) => {
  const hiddenInList = items.filter((item) => hidden.includes(item.id)).length;
  const shown = items.length - hiddenInList;
  return (
    <>
      <label className="flex cursor-pointer items-start gap-2 py-1 font-semibold">
        <CalendarMasterCheckbox
          checked={shown === items.length && items.length > 0}
          indeterminate={shown > 0 && shown < items.length}
          onCheckedChange={(checked) => {
            const ids = new Set(items.map((item) => item.id));
            const rest = hidden.filter((id) => !ids.has(id));
            onChange(checked ? rest : [...rest, ...ids]);
          }}
        />
        <span>{allLabel}</span>
      </label>
      <Divider />
      {items.length === 0 ? <p className="py-1 text-muted-foreground">Нет</p> : null}
      {items.map((item) => (
        <label key={item.id} className="flex cursor-pointer items-start gap-2 py-1">
          <Checkbox
            checked={!hidden.includes(item.id)}
            onCheckedChange={(v) => onChange(toggleIn(hidden, item.id, v !== true))}
          />
          <span>{item.label}</span>
        </label>
      ))}
    </>
  );
};

const StatusChecks = ({
  hidden,
  onChange,
}: {
  hidden: UnpaidStatus[];
  onChange: (hidden: UnpaidStatus[]) => void;
}) => (
  <>
    {UNPAID_STATUSES.map((status) => (
      <label key={status} className="flex cursor-pointer items-start gap-2 py-1">
        <Checkbox
          checked={!hidden.includes(status)}
          onCheckedChange={(v) => onChange(toggleIn(hidden, status, v !== true))}
        />
        <span>{PAYMENT_STATUS_LABELS[status]}</span>
      </label>
    ))}
    <p className="py-1 text-muted-foreground">Оплаченные платежи в календаре не показываются.</p>
  </>
);

type OutputsPanelProps = {
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  plantOptions: string[];
  orderSearch: string;
  onOrderSearchChange: (value: string) => void;
  onChange: (next: OutputCalendarOwnerFilter) => void;
  onPlantChange: (plantId: string | null) => void;
  onClose: () => void;
  onSelectAll: () => void;
  onReset: () => void;
};

/** «Выпуски»: для кого считаем + завод. Acts on product rows only. */
export const OutputCalendarOutputsPanel = ({
  page,
  filter,
  plantId,
  plantOptions,
  orderSearch,
  onOrderSearchChange,
  onChange,
  onPlantChange,
  onClose,
  onSelectAll,
  onReset,
}: OutputsPanelProps) => {
  const regionSelected = filter.regionIds.length;
  const regionTotal = page.regions.length;
  const orderSelected = filter.orderIds.length;
  const orderTotal = page.customerOrders.length;
  const q = orderSearch.trim().toLowerCase();
  const regionById = new Map(page.regions.map((r) => [r.id, r]));

  return (
    <SidePanel
      title={PANEL_TITLES.outputs}
      onClose={onClose}
      footer={
        <>
          <Button type="button" size="sm" variant="outline" onClick={onSelectAll}>
            Выбрать всё
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>
            Сбросить
          </Button>
        </>
      }
    >
      <SectionTitle>Завод</SectionTitle>
      <Select
        items={[
          { value: "all", label: "Все" },
          ...plantOptions.map((id) => ({ value: id, label: formatLogisticsCode("plant", id) })),
        ]}
        value={plantId ?? "all"}
        onValueChange={(value) => onPlantChange(value == null || value === "all" ? null : value)}
      >
        <SelectTrigger size="sm" className="w-full bg-background" aria-label="Завод выпусков">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все</SelectItem>
          {plantOptions.map((id) => (
            <SelectItem key={id} value={id}>
              {formatLogisticsCode("plant", id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SectionTitle>Для кого считаем</SectionTitle>
      <label className="flex cursor-pointer items-start gap-2 py-1">
        <Checkbox checked={filter.free} onCheckedChange={(v) => onChange({ ...filter, free: v === true })} />
        <span>Свободно</span>
      </label>

      <SectionTitle>Регионы</SectionTitle>
      <label className="flex cursor-pointer items-start gap-2 py-1 font-semibold">
        <CalendarMasterCheckbox
          checked={regionSelected === regionTotal && regionTotal > 0}
          indeterminate={regionSelected > 0 && regionSelected < regionTotal}
          onCheckedChange={(checked) =>
            onChange({ ...filter, regionIds: checked ? page.regions.map((r) => r.id) : [] })
          }
        />
        <span>Все регионы</span>
      </label>
      <Divider />
      {page.regions.map((region) => (
        <label key={region.id} className="flex cursor-pointer items-start gap-2 py-1">
          <Checkbox
            checked={filter.regionIds.includes(region.id)}
            onCheckedChange={(v) => onChange({ ...filter, regionIds: toggleIn(filter.regionIds, region.id, v === true) })}
          />
          <span>{region.name}</span>
        </label>
      ))}

      <div className="flex items-center justify-between gap-2 py-2">
        <span>С заказами клиентов региона</span>
        <Switch
          checked={filter.withRegionOrders}
          onCheckedChange={(v) => onChange({ ...filter, withRegionOrders: v })}
        />
      </div>

      <SectionTitle>Заказы клиента</SectionTitle>
      <Input
        className="mb-1.5 h-8 bg-background text-xs"
        aria-label="Поиск заказа клиента"
        placeholder="Поиск OMS…"
        value={orderSearch}
        onChange={(e) => onOrderSearchChange(e.target.value)}
      />
      <div className="max-h-[220px] overflow-auto">
        <label className="flex cursor-pointer items-start gap-2 py-1 font-semibold">
          <CalendarMasterCheckbox
            checked={orderSelected === orderTotal && orderTotal > 0}
            indeterminate={orderSelected > 0 && orderSelected < orderTotal}
            onCheckedChange={(checked) =>
              onChange({ ...filter, orderIds: checked ? page.customerOrders.map((o) => o.id) : [] })
            }
          />
          <span>Все заказы</span>
        </label>
        <Divider />
        {page.customerOrders.map((order) => {
          const regionName = regionById.get(order.regionId)?.name ?? "";
          const label = `${order.number} · ${regionName}`;
          if (q && !label.toLowerCase().includes(q)) return null;
          return (
            <label key={order.id} className="flex cursor-pointer items-start gap-2 py-1">
              <Checkbox
                checked={filter.orderIds.includes(order.id)}
                onCheckedChange={(v) => onChange({ ...filter, orderIds: toggleIn(filter.orderIds, order.id, v === true) })}
              />
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </SidePanel>
  );
};

/** «Платежи заводам»: заводы и статусы. Acts on the plant money group only. */
export const OutputCalendarPlantPaymentsPanel = ({
  page,
  filter,
  onChange,
  onClose,
}: {
  page: OutputCalendarPage;
  filter: PlantPaymentsFilter;
  onChange: (next: PlantPaymentsFilter) => void;
  onClose: () => void;
}) => (
  <SidePanel
    title={PANEL_TITLES.plants}
    onClose={onClose}
    footer={
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ hiddenPlantIds: [], hiddenStatuses: [] })}>
        Сбросить
      </Button>
    }
  >
    <SectionTitle>Заводы</SectionTitle>
    <ExclusionList
      allLabel="Все заводы"
      items={plantPaymentOptions(page).map((id) => ({ id, label: formatLogisticsCode("plant", id) }))}
      hidden={filter.hiddenPlantIds}
      onChange={(hiddenPlantIds) => onChange({ ...filter, hiddenPlantIds })}
    />
    <SectionTitle>Статусы</SectionTitle>
    <StatusChecks hidden={filter.hiddenStatuses} onChange={(hiddenStatuses) => onChange({ ...filter, hiddenStatuses })} />
  </SidePanel>
);

/** «Поступления»: регионы, заказы клиента, статусы. Acts on the incoming money group only. */
export const OutputCalendarIncomingPanel = ({
  page,
  filter,
  orderSearch,
  onOrderSearchChange,
  onChange,
  onClose,
}: {
  page: OutputCalendarPage;
  filter: IncomingFilter;
  orderSearch: string;
  onOrderSearchChange: (value: string) => void;
  onChange: (next: IncomingFilter) => void;
  onClose: () => void;
}) => {
  const regions = incomingRegionOptions(page);
  const regionCode = new Map(page.regions.map((region) => [region.id, region.code]));
  const q = orderSearch.trim().toLowerCase();
  const orders = incomingOrderOptions(page).map((order) => ({
    id: order.id,
    label: `${order.number} · ${regionCode.get(order.regionId ?? "") ?? ""}`,
  }));
  return (
    <SidePanel
      title={PANEL_TITLES.incoming}
      onClose={onClose}
      footer={
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange({ hiddenRegionIds: [], hiddenOrderIds: [], hiddenStatuses: [] })}
        >
          Сбросить
        </Button>
      }
    >
      <SectionTitle>Регионы</SectionTitle>
      <ExclusionList
        allLabel="Все регионы"
        items={regions.map((region) => ({ id: region.id, label: region.code }))}
        hidden={filter.hiddenRegionIds}
        onChange={(hiddenRegionIds) => onChange({ ...filter, hiddenRegionIds })}
      />
      <SectionTitle>Заказы клиента</SectionTitle>
      <Input
        className="mb-1.5 h-8 bg-background text-xs"
        aria-label="Поиск заказа клиента"
        placeholder="Поиск OMS…"
        value={orderSearch}
        onChange={(e) => onOrderSearchChange(e.target.value)}
      />
      <div className="max-h-[260px] overflow-auto">
        <ExclusionList
          allLabel="Все заказы"
          items={q ? orders.filter((order) => order.label.toLowerCase().includes(q)) : orders}
          hidden={filter.hiddenOrderIds}
          onChange={(hiddenOrderIds) => onChange({ ...filter, hiddenOrderIds })}
        />
      </div>
      <SectionTitle>Статусы</SectionTitle>
      <StatusChecks hidden={filter.hiddenStatuses} onChange={(hiddenStatuses) => onChange({ ...filter, hiddenStatuses })} />
    </SidePanel>
  );
};
