"use client";

import { useState } from "react";
import { Check, ChevronDown, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { planStatus } from "@/features/logistics/order-plan/order-plan-model";
import type { OrderPlan } from "@/features/logistics/order-plan/order-plan-types";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { logisticsCardClass } from "@/features/logistics/ui/logistics-panel";
import { cn } from "@/lib/utils";

const pad = (value: number) => String(value).padStart(2, "0");

export const formatDayMonth = (iso: string): string => {
  const date = new Date(iso);
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}`;
};

export const formatDayMonthTime = (iso: string): string => {
  const date = new Date(iso);
  return `${formatDayMonth(iso)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const StateChip = ({ plan, full }: { plan: OrderPlan; full?: boolean }) => {
  const status = planStatus(plan);
  const dark = status === "launched";
  const label =
    status === "archived"
      ? "Архив"
      : status === "launched"
        ? full && plan.launchedAt
          ? `Запущен ${formatDayMonthTime(plan.launchedAt)}`
          : "Запущен"
        : "Черновик";
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-full border px-2 text-[11.5px] leading-none font-medium whitespace-nowrap",
        dark ? "border-zinc-900 bg-zinc-900 text-white" : "border-border bg-zinc-50 text-zinc-600",
      )}
    >
      {label}
    </span>
  );
};

const byNewest = (left: OrderPlan, right: OrderPlan) => right.createdAt.localeCompare(left.createdAt);

export const OrderPlanBar = ({
  plans,
  current,
  canAct,
  unsaved = false,
  onSelect,
  onCreate,
  onCopy,
  onRename,
  onArchive,
}: {
  plans: OrderPlan[];
  current: OrderPlan | null;
  canAct: boolean;
  /** Черновик «План 1» ещё не записан в базу. */
  unsaved?: boolean;
  onSelect: (planId: string) => void;
  onCreate: () => void;
  onCopy: (planId: string) => void;
  onRename: (planId: string, name: string) => Promise<boolean>;
  onArchive: (planId: string, archived: boolean) => void;
}) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const active = plans.filter((plan) => !plan.archivedAt).sort(byNewest);
  const archived = plans.filter((plan) => plan.archivedAt).sort(byNewest);
  const status = current ? planStatus(current) : null;
  const draft = status === "draft";
  const canRename = draft && canAct;

  return (
    <Card
      size="sm"
      className={cn(
        logisticsCardClass,
        "h-12 flex-row items-center gap-2 px-2 py-0 shadow-sm data-[size=sm]:gap-2 data-[size=sm]:py-0",
      )}
    >
      {unsaved && !current ? (
        <span className="inline-flex h-8 items-center gap-2 px-2.5 text-[13px] font-semibold whitespace-nowrap">
          План 1
          <span className="inline-flex h-5 items-center rounded-full border border-border bg-zinc-50 px-2 text-[11.5px] leading-none font-medium text-zinc-600">
            Черновик
          </span>
        </span>
      ) : current ? (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-white pr-2 pl-2.5 text-[13px] font-semibold whitespace-nowrap hover:bg-zinc-50 aria-expanded:border-zinc-900 aria-expanded:ring-3 aria-expanded:ring-zinc-900/10"
                />
              }
            >
              {current.name}
              <StateChip plan={current} full />
              <ChevronDown className="size-3.5 text-zinc-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {active.map((plan) => (
                <DropdownMenuItem key={plan.id} onClick={() => onSelect(plan.id)} className="gap-2 py-1.5">
                  <span className="flex w-3.5 justify-center">
                    {plan.id === current.id ? <Check className="size-3.5" /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{plan.name}</span>
                    <span className="block text-xs text-zinc-400 tabular-nums">создан {formatDayMonth(plan.createdAt)}</span>
                  </span>
                  <StateChip plan={plan} />
                </DropdownMenuItem>
              ))}
              {archived.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Архив</DropdownMenuLabel>
                    {archived.map((plan) => (
                      <DropdownMenuItem key={plan.id} onClick={() => onSelect(plan.id)} className="gap-2 py-1.5">
                        <span className="flex w-3.5 justify-center">
                          {plan.id === current.id ? <Check className="size-3.5" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-zinc-500">{plan.name}</span>
                          <span className="block text-xs text-zinc-400 tabular-nums">создан {formatDayMonth(plan.createdAt)}</span>
                        </span>
                        <button
                          type="button"
                          className="rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
                          onClick={(event) => {
                            event.stopPropagation();
                            onArchive(plan.id, false);
                          }}
                        >
                          Вернуть
                        </button>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-xs whitespace-nowrap text-zinc-500">создан {formatDayMonth(current.createdAt)}</span>
          {draft ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button type="button" variant="ghost" size="icon" aria-label="Действия с планом" />}
              >
                <MoreHorizontal />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                {canRename ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setName(current.name);
                      setRenameOpen(true);
                    }}
                  >
                    Переименовать
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onClick={() => onCopy(current.id)}>Копировать в новый черновик</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onArchive(current.id, true)}>В архив</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </>
      ) : null}
      <span className="flex-1" />
      {canAct && plans.length > 0 ? (
        <Button type="button" variant="ghost" onClick={onCreate} className="text-zinc-600">
          <Plus />
          Новый план
        </Button>
      ) : null}

      <LogisticsDialog open={renameOpen} onOpenChange={setRenameOpen} title="Переименовать план">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!current || !name.trim()) {
              return;
            }
            setRenaming(true);
            void onRename(current.id, name.trim())
              .then((ok) => {
                if (ok) {
                  setRenameOpen(false);
                }
              })
              .finally(() => setRenaming(false));
          }}
        >
          <Input value={name} maxLength={80} autoFocus onChange={(event) => setName(event.target.value)} aria-label="Название плана" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={renaming || !name.trim()}>
              Сохранить
            </Button>
          </div>
        </form>
      </LogisticsDialog>
    </Card>
  );
};
