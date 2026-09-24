// english-ui:ignore-file
"use client";

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
import {
  ownersChangedCount,
  summaryText,
  type OutputCalendarOwnerFilter,
  type OutputCalendarPage,
} from "@/features/logistics/output-calendar";
import { CalendarMasterCheckbox } from "@/features/logistics/ui/output-calendar-master-checkbox";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

type OutputCalendarToolbarProps = {
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  plantId: string | null;
  plantOptions: string[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  onPlantChange: (plantId: string | null) => void;
  onRefresh: () => void;
  refreshing?: boolean;
};

export const OutputCalendarToolbar = ({
  page,
  filter,
  plantId,
  plantOptions,
  panelOpen,
  onTogglePanel,
  onPlantChange,
  onRefresh,
  refreshing,
}: OutputCalendarToolbarProps) => {
  const changed = ownersChangedCount(filter, page);
  return (
    <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
      <CardHeader className="gap-0 space-y-2 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">Календарь выпусков</h1>
            <p className="text-xs text-muted-foreground">
              Приход по выпускам в статусах «Черновик» и «В работе» · единицы — шт
            </p>
          </div>
        </div>

        <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={panelOpen ? "default" : "outline"}
            onClick={onTogglePanel}
            className="gap-1.5"
          >
            Для кого считаем
            {changed > 0 ? (
              <span
                className={cn(
                  "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
                  panelOpen ? "bg-background text-foreground" : "bg-foreground text-background",
                )}
              >
                {changed}
              </span>
            ) : null}
          </Button>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Завод</span>
            <Select
              items={[
                { value: "all", label: "Все" },
                ...plantOptions.map((id) => ({
                  value: id,
                  label: formatLogisticsCode("plant", id),
                })),
              ]}
              value={plantId ?? "all"}
              onValueChange={(value) => onPlantChange(value == null || value === "all" ? null : value)}
            >
              <SelectTrigger size="sm" className="w-[10.5rem] bg-background">
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
          </label>

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
        </div>

        <p className="pb-1 text-xs text-muted-foreground">
          <span className="font-medium text-zinc-700">{summaryText(filter, plantId, page)}</span>
        </p>
      </CardHeader>
    </Card>
  );
};

type OutputCalendarOwnersPanelProps = {
  open: boolean;
  page: OutputCalendarPage;
  filter: OutputCalendarOwnerFilter;
  orderSearch: string;
  onOrderSearchChange: (value: string) => void;
  onChange: (next: OutputCalendarOwnerFilter) => void;
  onClose: () => void;
  onSelectAll: () => void;
  onReset: () => void;
};

export const OutputCalendarOwnersPanel = ({
  open,
  page,
  filter,
  orderSearch,
  onOrderSearchChange,
  onChange,
  onClose,
  onSelectAll,
  onReset,
}: OutputCalendarOwnersPanelProps) => {
  if (!open) return null;

  const regionSelected = filter.regionIds.length;
  const regionTotal = page.regions.length;
  const orderSelected = filter.orderIds.length;
  const orderTotal = page.customerOrders.length;
  const q = orderSearch.trim().toLowerCase();

  const toggleRegion = (id: string, checked: boolean) => {
    const set = new Set(filter.regionIds);
    if (checked) set.add(id);
    else set.delete(id);
    onChange({ ...filter, regionIds: Array.from(set) });
  };

  const toggleOrder = (id: string, checked: boolean) => {
    const set = new Set(filter.orderIds);
    if (checked) set.add(id);
    else set.delete(id);
    onChange({ ...filter, orderIds: Array.from(set) });
  };

  const regionById = new Map(page.regions.map((r) => [r.id, r]));

  return (
    <aside className="flex w-[380px] shrink-0 flex-col border-l border-border bg-background shadow-[-8px_0_24px_rgba(24,24,27,0.08)]">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <h2 className="text-sm font-semibold">Для кого считаем</h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Закрыть
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-auto px-3.5 py-3 text-xs">
        <label className="flex cursor-pointer items-start gap-2 py-1">
          <Checkbox
            checked={filter.free}
            onCheckedChange={(v) => onChange({ ...filter, free: v === true })}
          />
          <span>Свободно</span>
        </label>

        <div className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Регионы
        </div>
        <label className="flex cursor-pointer items-start gap-2 py-1 font-semibold">
          <CalendarMasterCheckbox
            checked={regionSelected === regionTotal && regionTotal > 0}
            indeterminate={regionSelected > 0 && regionSelected < regionTotal}
            onCheckedChange={(checked) =>
              onChange({
                ...filter,
                regionIds: checked ? page.regions.map((r) => r.id) : [],
              })
            }
          />
          <span>Все регионы</span>
        </label>
        <div className="my-1.5 h-px bg-border" aria-hidden />
        {page.regions.map((region) => (
          <label key={region.id} className="flex cursor-pointer items-start gap-2 py-1">
            <Checkbox
              checked={filter.regionIds.includes(region.id)}
              onCheckedChange={(v) => toggleRegion(region.id, v === true)}
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

        <div className="mt-3 mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Заказы клиента
        </div>
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
                onChange({
                  ...filter,
                  orderIds: checked ? page.customerOrders.map((o) => o.id) : [],
                })
              }
            />
            <span>Все заказы</span>
          </label>
          <div className="my-1.5 h-px bg-border" aria-hidden />
          {page.customerOrders.map((order) => {
            const regionName = regionById.get(order.regionId)?.name ?? "";
            const label = `${order.number} · ${regionName}`;
            if (q && !label.toLowerCase().includes(q)) return null;
            return (
              <label key={order.id} className="flex cursor-pointer items-start gap-2 py-1">
                <Checkbox
                  checked={filter.orderIds.includes(order.id)}
                  onCheckedChange={(v) => toggleOrder(order.id, v === true)}
                />
                <span>{label}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2 border-t border-border px-3.5 py-2.5">
        <Button type="button" size="sm" variant="outline" onClick={onSelectAll}>
          Выбрать всё
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onReset}>
          Сбросить
        </Button>
      </div>
    </aside>
  );
};
