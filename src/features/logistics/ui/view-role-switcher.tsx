"use client";

import { Eye, EyeOff, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  VIEW_ROLE_LABELS,
  VIEW_ROLES,
  parseViewRole,
  type RoleVisibilityRule,
  type ViewRole,
} from "@/features/logistics/order-view-role";
import type { RoleVisibilityState } from "@/features/logistics/use-view-role";
import { cn } from "@/lib/utils";

const VisibilityMark = ({ visible, active }: { visible: boolean; active: boolean }) => {
  const Icon = visible ? Eye : EyeOff;
  return (
    <span
      className={cn(
        "grid size-6 place-items-center rounded-md",
        active ? "bg-muted" : "opacity-50",
        visible ? "text-green-700" : "text-muted-foreground",
      )}
      aria-label={visible ? "Видно" : "Скрыто"}
    >
      <Icon className="size-3.5" aria-hidden />
    </span>
  );
};

const RulesList = ({ rules, role }: { rules: RoleVisibilityRule[]; role: ViewRole }) => (
  <div className="-mx-2.5 max-h-80 overflow-y-auto border-t border-border/60">
    <div className="sticky top-0 grid grid-cols-[1fr_auto_auto] items-center gap-x-1 bg-popover px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
      <span>Элемент</span>
      {VIEW_ROLES.map((option) => (
        <span key={option} className={cn("w-6 text-center", option === role && "text-foreground")} title={VIEW_ROLE_LABELS[option]}>
          {VIEW_ROLE_LABELS[option].slice(0, 1)}
        </span>
      ))}
    </div>
    <ul className="divide-y divide-border/50">
      {rules.map((rule) => (
        <li key={rule.elementKey} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-1 px-2.5 py-1.5">
          <span className="min-w-0 text-xs leading-snug" title={rule.elementKey}>
            {rule.label}
          </span>
          <VisibilityMark visible={rule.managerVisible} active={role === "manager"} />
          <VisibilityMark visible={rule.customerVisible} active={role === "customer"} />
        </li>
      ))}
    </ul>
  </div>
);

/** Demo-only floating control: switches the page between manager and customer views. */
export const ViewRoleSwitcher = ({ state }: { state: RoleVisibilityState }) => {
  const { role, setRole, rules, isLoading, error } = state;
  const hiddenCount = rules.filter((rule) => !(role === "manager" ? rule.managerVisible : rule.customerVisible)).length;

  return (
    <div
      className={cn(
        "fixed right-4 bottom-4 z-40 flex items-center gap-1.5 rounded-xl border p-1.5 shadow-lg backdrop-blur",
        role === "customer" ? "border-amber-300 bg-amber-50/95" : "border-border bg-background/95",
      )}
      role="region"
      aria-label="Режим просмотра"
    >
      <span className="pl-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Вид</span>
      <ToggleGroup
        value={[role]}
        variant="outline"
        size="sm"
        spacing={0}
        className="bg-background"
        onValueChange={(value) => {
          const [next] = value;
          if (next) setRole(parseViewRole(next));
        }}
        aria-label="Роль просмотра"
      >
        {VIEW_ROLES.map((option) => (
          <ToggleGroupItem key={option} value={option} className="px-2.5">
            {VIEW_ROLE_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" aria-label="Правила видимости" />
          }
        >
          <ListChecks className="size-4" aria-hidden />
          {isLoading ? "…" : error ? "!" : hiddenCount > 0 ? `скрыто ${hiddenCount}` : "всё видно"}
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-96">
          <PopoverHeader>
            <PopoverTitle>Видимость: {VIEW_ROLE_LABELS[role].toLowerCase()}</PopoverTitle>
            <PopoverDescription>
              Правила берутся из таблицы store_role_visibility. Элемент без правила видит только менеджер.
            </PopoverDescription>
          </PopoverHeader>
          {error ? (
            <p className="text-xs text-red-700">Правила не загрузились: {error}. Заказчику скрыто всё настраиваемое.</p>
          ) : isLoading ? (
            <p className="text-xs text-muted-foreground">Загружаем правила…</p>
          ) : rules.length === 0 ? (
            <p className="text-xs text-muted-foreground">Для этой страницы правил нет.</p>
          ) : (
            <RulesList rules={rules} role={role} />
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};
