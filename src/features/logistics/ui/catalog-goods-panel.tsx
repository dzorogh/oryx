"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

export const CatalogGoodsPanel = ({
  search,
  onSearch,
  allCollapsed,
  onToggleAll,
  onlySelected,
  onToggleSelected,
  extra,
}: {
  search: string;
  onSearch: (value: string) => void;
  allCollapsed: boolean;
  onToggleAll: () => void;
  onlySelected: boolean;
  onToggleSelected: () => void;
  extra?: ReactNode;
}) => (
  <>
    <span className="mr-2 text-sm font-semibold">Товары</span>
    <Input
      value={search}
      onChange={(event) => onSearch(event.target.value)}
      placeholder="Поиск"
      aria-label="Поиск"
      className="h-7 w-40 border-0 bg-background text-xs shadow-none"
    />
    <Button type="button" variant="ghost" size="xs" className="border-0" onClick={onToggleAll}>
      {allCollapsed ? "Развернуть все" : "Свернуть все"}
    </Button>
    <label className="inline-flex h-7 items-center gap-2 px-2 text-xs">
      <Switch size="sm" checked={onlySelected} onCheckedChange={() => onToggleSelected()} aria-label="Только выбранные" />
      Только выбранные
    </label>
    {extra}
  </>
);
