// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import { Columns3, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import type { ListToggleOption } from "./list-types";

type ListToolbarProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actions?: ReactNode;
  toggleOptions?: ListToggleOption[];
  toggleValue?: string;
  onToggleChange?: (value: string) => void;
  toggleAriaLabel?: string;
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  quickControls?: ReactNode;
  /** Sort and group menus, rendered before the filter and column buttons. */
  viewControls?: ReactNode;
  filtersActive?: boolean;
  columnsActive?: boolean;
  onOpenFilters?: () => void;
  onOpenColumns?: () => void;
};

const IconButton = ({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger
      render={
        <Button type="button" variant={active ? "default" : "outline"} size="icon" aria-label={label} onClick={onClick} />
      }
    >
      {children}
    </TooltipTrigger>
    <TooltipContent side="bottom">{label}</TooltipContent>
  </Tooltip>
);

export const ListToolbar = ({
  title,
  actionLabel,
  onAction,
  actionDisabled,
  actions,
  toggleOptions,
  toggleValue,
  onToggleChange,
  toggleAriaLabel,
  search,
  quickControls,
  viewControls,
  filtersActive = false,
  columnsActive = false,
  onOpenFilters,
  onOpenColumns,
}: ListToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-2 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h1 className="min-w-0 text-lg font-semibold text-foreground">{title}</h1>
        {actions ??
          (actionLabel && onAction ? (
            <Button type="button" size="sm" onClick={onAction} disabled={actionDisabled} className="shrink-0">
              {actionLabel}
            </Button>
          ) : null)}
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <TooltipProvider delay={300}>
        <div className="flex flex-wrap items-center gap-2">
          {toggleOptions && toggleOptions.length > 0 && onToggleChange ? (
            <ToggleGroup
              value={toggleValue ? [toggleValue] : []}
              variant="outline"
              size="default"
              spacing={0}
              onValueChange={(value) => {
                const [next] = value;
                if (next) {
                  onToggleChange(next);
                }
              }}
              aria-label={toggleAriaLabel ?? "Фильтр списка"}
            >
              {toggleOptions.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          ) : null}

          {search ? (
            <label className="relative w-full sm:w-[260px]">
              <span className="sr-only">Поиск</span>
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder ?? "Поиск: номер, товар"}
                className="bg-background pl-8"
              />
            </label>
          ) : null}

          {quickControls}

          <div className="ml-auto flex items-center gap-2">
            {viewControls}
            {onOpenFilters ? (
              <IconButton label="Фильтры" active={filtersActive} onClick={onOpenFilters}>
                <SlidersHorizontal aria-hidden />
              </IconButton>
            ) : null}
            {onOpenColumns ? (
              <IconButton label="Колонки" active={columnsActive} onClick={onOpenColumns}>
                <Columns3 aria-hidden />
              </IconButton>
            ) : null}
          </div>
        </div>
      </TooltipProvider>
    </CardHeader>
  </Card>
);
