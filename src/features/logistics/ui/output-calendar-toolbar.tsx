// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatEntityCode } from "@/lib/entity-codes";
import { PAYMENT_STATUS_LABELS } from "@/features/logistics/order-money";
import {
  searchCalendarCustomerOrders,
  searchCalendarRegions,
  type CalendarFilterScope,
} from "@/features/logistics/logistics-api";
import {
  defaultIncomingFilter,
  incomingFilterChanged,
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
import { AsyncMultiCombobox, type AsyncComboboxLoader } from "@/features/logistics/ui/async-multi-combobox";
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
          <h1 className="text-lg font-semibold text-foreground">Календарь производства</h1>
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
          changed={outputsFilterChanged(filter, plantId)}
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
  open,
  title,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  footer: ReactNode;
  children: ReactNode;
}) => (
  <Sheet
    open={open}
    onOpenChange={(next) => {
      if (!next) onClose();
    }}
  >
    <SheetContent side="right" className="w-full gap-0 px-0 sm:max-w-[380px]">
      <SheetHeader className="border-b border-border px-3.5 py-3 pr-12">
        <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
      </SheetHeader>
      <div className="flex-1 space-y-1 overflow-auto px-3.5 py-3 text-xs">{children}</div>
      <div className="flex gap-2 border-t border-border px-3.5 py-2.5">{footer}</div>
    </SheetContent>
  </Sheet>
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

const orderLoader =
  (scope: CalendarFilterScope): AsyncComboboxLoader =>
  async (args) =>
    (await searchCalendarCustomerOrders({ scope, ...args })).map((order) => ({
      value: order.id,
      label: order.number,
      hint: order.regionCode,
    }));

const regionLoader =
  (scope: CalendarFilterScope): AsyncComboboxLoader =>
  async (args) =>
    (await searchCalendarRegions({ scope, ...args })).map((region) => ({
      value: region.id,
      label: region.code,
      hint: region.name,
    }));

const loadCalendarOrders = orderLoader("calendar");
const loadCalendarRegions = regionLoader("calendar");
const loadMoneyOrders = orderLoader("money");
const loadMoneyRegions = regionLoader("money");

/** «Все …» checkbox over a picker: picking an item turns «Все» off, checking «Все» drops the picks. */
const AllOrPicked = ({
  allLabel,
  all,
  ids,
  onChange,
  loadOptions,
  placeholder,
  ariaLabel,
}: {
  allLabel: string;
  all: boolean;
  ids: string[];
  onChange: (all: boolean, ids: string[]) => void;
  loadOptions: AsyncComboboxLoader;
  placeholder: string;
  ariaLabel: string;
}) => (
  <>
    <label className="flex cursor-pointer items-start gap-2 py-1">
      <Checkbox checked={all} onCheckedChange={(v) => onChange(v === true, [])} />
      <span>{allLabel}</span>
    </label>
    <AsyncMultiCombobox
      value={all ? [] : ids}
      onValueChange={(next) => onChange(false, next)}
      loadOptions={loadOptions}
      placeholder={all ? allLabel : placeholder}
      ariaLabel={ariaLabel}
      className="mt-1"
    />
  </>
);

type OutputsPanelProps = {
  open: boolean;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  plantOptions: string[];
  onChange: (next: OutputCalendarOwnerFilter) => void;
  onPlantChange: (plantId: string | null) => void;
  onClose: () => void;
  onSelectAll: () => void;
  onReset: () => void;
};

/** «Выпуски»: для кого считаем + завод. Acts on product rows only. */
export const OutputCalendarOutputsPanel = ({
  open,
  filter,
  plantId,
  plantOptions,
  onChange,
  onPlantChange,
  onClose,
  onSelectAll,
  onReset,
}: OutputsPanelProps) => {
  return (
    <SidePanel
      open={open}
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
          ...plantOptions.map((id) => ({ value: id, label: formatEntityCode("plant", id) })),
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
              {formatEntityCode("plant", id)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <SectionTitle>Без резерва</SectionTitle>
      <label className="flex cursor-pointer items-start gap-2 py-1">
        <Checkbox checked={filter.free} onCheckedChange={(v) => onChange({ ...filter, free: v === true })} />
        <span>
          Свободные выпуски
          <span className="block text-xs text-muted-foreground">Не закреплены за регионом или заказом</span>
        </span>
      </label>

      <SectionTitle>Регионы</SectionTitle>
      <AllOrPicked
        allLabel="Все регионы"
        all={filter.allRegions}
        ids={filter.regionIds}
        onChange={(allRegions, regionIds) => onChange({ ...filter, allRegions, regionIds })}
        loadOptions={loadCalendarRegions}
        placeholder="Выберите регионы"
        ariaLabel="Регионы выпусков"
      />

      <div className="flex items-center justify-between gap-2 py-2">
        <span>С заказами клиентов региона</span>
        <Switch
          checked={filter.withRegionOrders}
          onCheckedChange={(v) => onChange({ ...filter, withRegionOrders: v })}
        />
      </div>

      <SectionTitle>Заказы клиента</SectionTitle>
      <AllOrPicked
        allLabel="Все заказы"
        all={filter.allOrders}
        ids={filter.orderIds}
        onChange={(allOrders, orderIds) => onChange({ ...filter, allOrders, orderIds })}
        loadOptions={loadCalendarOrders}
        placeholder="Выберите заказы"
        ariaLabel="Заказы клиента выпусков"
      />
    </SidePanel>
  );
};

/** «Платежи заводам»: заводы и статусы. Acts on the plant money group only. */
export const OutputCalendarPlantPaymentsPanel = ({
  open,
  page,
  filter,
  onChange,
  onClose,
}: {
  open: boolean;
  page: OutputCalendarPage;
  filter: PlantPaymentsFilter;
  onChange: (next: PlantPaymentsFilter) => void;
  onClose: () => void;
}) => (
  <SidePanel
    open={open}
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
      items={plantPaymentOptions(page).map((id) => ({ id, label: formatEntityCode("plant", id) }))}
      hidden={filter.hiddenPlantIds}
      onChange={(hiddenPlantIds) => onChange({ ...filter, hiddenPlantIds })}
    />
    <SectionTitle>Статусы</SectionTitle>
    <StatusChecks hidden={filter.hiddenStatuses} onChange={(hiddenStatuses) => onChange({ ...filter, hiddenStatuses })} />
  </SidePanel>
);

/** «Поступления»: регионы, заказы клиента, статусы. Acts on the incoming money group only. */
export const OutputCalendarIncomingPanel = ({
  open,
  filter,
  onChange,
  onClose,
}: {
  open: boolean;
  filter: IncomingFilter;
  onChange: (next: IncomingFilter) => void;
  onClose: () => void;
}) => (
  <SidePanel
    open={open}
    title={PANEL_TITLES.incoming}
    onClose={onClose}
    footer={
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange(defaultIncomingFilter())}>
        Сбросить
      </Button>
    }
  >
    <SectionTitle>Регионы</SectionTitle>
    <AsyncMultiCombobox
      value={filter.regionIds}
      onValueChange={(regionIds) => onChange({ ...filter, regionIds })}
      loadOptions={loadMoneyRegions}
      placeholder="Все регионы"
      ariaLabel="Регионы поступлений"
    />
    <SectionTitle>Заказы клиента</SectionTitle>
    <AsyncMultiCombobox
      value={filter.orderIds}
      onValueChange={(orderIds) => onChange({ ...filter, orderIds })}
      loadOptions={loadMoneyOrders}
      placeholder="Все заказы"
      ariaLabel="Заказы клиента поступлений"
    />
    <SectionTitle>Статусы</SectionTitle>
    <StatusChecks hidden={filter.hiddenStatuses} onChange={(hiddenStatuses) => onChange({ ...filter, hiddenStatuses })} />
  </SidePanel>
);
