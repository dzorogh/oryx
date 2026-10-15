"use client";

import { ArrowDown, ArrowDownUp, ArrowUp, Check, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { sortDirectionLabel } from "./list-column-header";
import type { ListGroupDef } from "./list-types";
import type { ListViewController } from "./use-list-view";

const IconMenuTrigger = ({ label, active, icon }: { label: string; active: boolean; icon: React.ReactNode }) => (
  <Tooltip>
    <DropdownMenuTrigger
      render={
        <TooltipTrigger
          render={<Button type="button" variant={active ? "default" : "outline"} size="icon" aria-label={label} />}
        />
      }
    >
      {icon}
    </DropdownMenuTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export const ListSortMenu = <TRow,>({ view }: { view: ListViewController<TRow> }) => {
  const active = view.sortDefs.find((def) => def.id === view.sortState?.field);
  const label = active
    ? `Сортировка: ${active.label}, ${sortDirectionLabel(active.type, view.sortState!.direction).toLowerCase()}`
    : "Сортировка";

  return (
    <DropdownMenu>
      <IconMenuTrigger label={label} active={view.hasCustomSort} icon={<ArrowDownUp aria-hidden />} />
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Поле</DropdownMenuLabel>
          {view.sortDefs.map((def) => (
            <DropdownMenuItem key={def.id} closeOnClick={false} onClick={() => view.setSortField(def.id)}>
              <span className="flex-1">{def.label}</span>
              {def.id === active?.id ? <Check aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {active ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Направление</DropdownMenuLabel>
              <div className="grid grid-cols-2 gap-1 p-1">
                {(["asc", "desc"] as const).map((direction) => (
                  <Button
                    key={direction}
                    type="button"
                    size="sm"
                    variant={view.sortState?.direction === direction ? "default" : "outline"}
                    onClick={() => view.setSortDirection(direction)}
                    className={cn("justify-start gap-1 px-2 text-xs")}
                  >
                    {direction === "asc" ? <ArrowUp aria-hidden /> : <ArrowDown aria-hidden />}
                    {sortDirectionLabel(active.type, direction)}
                  </Button>
                ))}
              </div>
            </DropdownMenuGroup>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const ListGroupMenu = <TRow,>({
  view,
  groupDefs,
}: {
  view: ListViewController<TRow>;
  groupDefs: ListGroupDef<TRow>[];
}) => {
  const active = groupDefs.find((def) => def.id === view.groupId);
  const options = [{ id: null, label: "Без группировки" }, ...groupDefs.map((def) => ({ id: def.id, label: def.label }))];

  return (
    <DropdownMenu>
      <IconMenuTrigger
        label={active ? `Группировка: ${active.label}` : "Группировка"}
        active={Boolean(active)}
        icon={<Rows3 aria-hidden />}
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Группировка</DropdownMenuLabel>
          {options.map((option) => (
            <DropdownMenuItem key={option.id ?? "none"} onClick={() => view.setGroupId(option.id)}>
              <span className="flex-1">{option.label}</span>
              {option.id === (active?.id ?? null) ? <Check aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
