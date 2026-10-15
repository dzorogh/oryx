"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ChevronsLeftRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ListColumnAlign, ListSortDirection, ListSortType } from "./list-types";

export const sortDirectionLabel = (type: ListSortType | undefined, direction: ListSortDirection) => {
  if (type === "date") {
    return direction === "asc" ? "Сначала старые" : "Сначала новые";
  }
  if (type === "number") {
    return direction === "asc" ? "По возрастанию" : "По убыванию";
  }
  return direction === "asc" ? "А → Я" : "Я → А";
};

type ColumnMenuProps = {
  sortType?: ListSortType;
  onSort?: (direction: ListSortDirection) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onHide?: () => void;
  onExpandAll?: () => void;
};

const ColumnMenuItems = ({ sortType, onSort, collapsed, onToggleCollapsed, onHide, onExpandAll }: ColumnMenuProps) => (
  <>
    {onSort ? (
      <>
        <ContextMenuItem onClick={() => onSort("asc")}>
          <ArrowUp aria-hidden />
          {sortDirectionLabel(sortType, "asc")}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onSort("desc")}>
          <ArrowDown aria-hidden />
          {sortDirectionLabel(sortType, "desc")}
        </ContextMenuItem>
        <ContextMenuSeparator />
      </>
    ) : null}
    <ContextMenuItem onClick={onToggleCollapsed}>
      {collapsed ? "Развернуть колонку" : "Свернуть колонку"}
    </ContextMenuItem>
    {onHide ? <ContextMenuItem onClick={onHide}>Скрыть колонку</ContextMenuItem> : null}
    {onExpandAll ? (
      <>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onExpandAll}>Развернуть все колонки</ContextMenuItem>
      </>
    ) : null}
  </>
);

const HeaderContextMenu = ({ children, ...menu }: ColumnMenuProps & { children: ReactNode }) => (
  <ContextMenu>
    <ContextMenuTrigger render={<div className="contents" />}>{children}</ContextMenuTrigger>
    <ContextMenuContent className="min-w-52">
      <ColumnMenuItems {...menu} />
    </ContextMenuContent>
  </ContextMenu>
);

type ListColumnHeaderProps = {
  label: string;
  description?: string;
  align?: ListColumnAlign;
  sortType?: ListSortType;
  sortDirection?: ListSortDirection | null;
  onHeaderClick?: () => void;
  onSort?: (direction: ListSortDirection) => void;
  onCollapse: () => void;
  onHide?: () => void;
  onExpandAll?: () => void;
};

export const ListColumnHeader = ({
  label,
  description,
  align = "left",
  sortType,
  sortDirection = null,
  onHeaderClick,
  onSort,
  onCollapse,
  onHide,
  onExpandAll,
}: ListColumnHeaderProps) => {
  const arrow = sortDirection ? (
    sortDirection === "asc" ? (
      <ArrowUp aria-hidden className="size-3 shrink-0 text-foreground" />
    ) : (
      <ArrowDown aria-hidden className="size-3 shrink-0 text-foreground" />
    )
  ) : null;

  const text = description ? (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="cursor-help underline decoration-muted-foreground/60 decoration-dotted underline-offset-[3px]" />
        }
      >
        {label}
      </TooltipTrigger>
      <TooltipContent side="bottom" align={align === "right" ? "end" : "start"} className="max-w-64 text-left">
        {description}
      </TooltipContent>
    </Tooltip>
  ) : (
    <span>{label}</span>
  );

  return (
    <HeaderContextMenu
      sortType={sortType}
      onSort={onSort}
      collapsed={false}
      onToggleCollapsed={onCollapse}
      onHide={onHide}
      onExpandAll={onExpandAll}
    >
      <div className={cn("group/header relative flex h-9 items-center", align === "right" && "justify-end")}>
        {onHeaderClick ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground"
            onClick={onHeaderClick}
          >
            {align === "right" ? arrow : null}
            {text}
            {align === "right" ? null : arrow}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 whitespace-nowrap">{text}</span>
        )}
        <button
          type="button"
          className="absolute top-1/2 -right-2 z-10 hidden size-[18px] -translate-y-1/2 place-items-center rounded-[5px] border border-[var(--corportal-border-grey)] bg-background text-muted-foreground shadow-sm group-hover/header:grid hover:text-foreground focus-visible:grid"
          aria-label={`Свернуть колонку «${label}»`}
          onClick={(event) => {
            event.stopPropagation();
            onCollapse();
          }}
        >
          <ChevronLeft aria-hidden className="size-3" />
        </button>
      </div>
    </HeaderContextMenu>
  );
};

export const ListCollapsedColumnHeader = ({
  label,
  onExpand,
  onHide,
  onExpandAll,
}: {
  label: string;
  onExpand: () => void;
  onHide?: () => void;
  onExpandAll?: () => void;
}) => (
  <HeaderContextMenu collapsed onToggleCollapsed={onExpand} onHide={onHide} onExpandAll={onExpandAll}>
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="flex h-9 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={`Развернуть колонку «${label}»`}
            onClick={onExpand}
          />
        }
      >
        <ChevronsLeftRight aria-hidden className="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  </HeaderContextMenu>
);
