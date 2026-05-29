"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  getCategoryFilterLabel,
  getDefaultExpandedCategoryIds,
  getSortedCategoryTree,
  type CategoryTreeNode,
} from "@/features/store/category-tree";
import { ALL_VALUE } from "./catalog-helpers";

type CatalogCategoryTreeFilterProps = {
  value: string;
  onValueChange: (value: string | null) => void;
  ariaLabel: string;
  allLabel: string;
  placeholder: string;
  widthClassName?: string;
};

type CategoryTreeRowProps = {
  node: CategoryTreeNode;
  depth: number;
  selectedId: string;
  expandedIds: Set<string>;
  onSelect: (nodeId: string) => void;
  onToggleExpand: (nodeId: string) => void;
};

const CategoryTreeRow = ({ node, depth, selectedId, expandedIds, onSelect, onToggleExpand }: CategoryTreeRowProps) => {
  const hasChildren = Boolean(node.children?.length);
  const isSelected = selectedId === node.id;
  const isExpanded = expandedIds.has(node.id);

  const rowButton = (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      className={cn(
        "flex min-h-8 w-full items-center rounded-md py-1.5 text-left text-sm transition-colors",
        isSelected ? "bg-sky-100 font-medium text-sky-900" : "text-foreground hover:bg-muted",
      )}
      style={{ paddingLeft: `${8 + depth * 14}px`, paddingRight: "8px" }}
      aria-current={isSelected ? "true" : undefined}
    >
      {node.label}
    </button>
  );

  if (!hasChildren) {
    return <li>{rowButton}</li>;
  }

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={isExpanded ? `Collapse ${node.label}` : `Expand ${node.label}`}
          aria-expanded={isExpanded}
          onClick={() => onToggleExpand(node.id)}
        >
          {isExpanded ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
        </button>
        <div className="min-w-0 flex-1">{rowButton}</div>
      </div>
      {isExpanded ? (
        <ul className="flex flex-col gap-0.5 pb-0.5">
          {node.children?.map((child) => (
            <CategoryTreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export const CatalogCategoryTreeFilter = ({
  value,
  onValueChange,
  ariaLabel,
  allLabel,
  placeholder,
  widthClassName = "w-[220px]",
}: CatalogCategoryTreeFilterProps) => {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(getDefaultExpandedCategoryIds()));

  const tree = useMemo(() => getSortedCategoryTree(), []);
  const displayLabel = getCategoryFilterLabel(value, allLabel);

  const handleSelect = (nodeId: string) => {
    onValueChange(nodeId);
    setOpen(false);
  };

  const handleToggleExpand = (nodeId: string) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-8 justify-between gap-1.5 bg-background px-2.5 font-normal",
              widthClassName,
              value !== ALL_VALUE && "border-primary/40",
            )}
            aria-label={ariaLabel}
          />
        }
      >
        <span className="truncate">{displayLabel || placeholder}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-80 w-[min(100vw-2rem,280px)] overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          <li>
            <button
              type="button"
              onClick={() => handleSelect(ALL_VALUE)}
              className={cn(
                "flex min-h-8 w-full items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                value === ALL_VALUE ? "bg-sky-100 font-medium text-sky-900" : "text-foreground hover:bg-muted",
              )}
            >
              {allLabel}
            </button>
          </li>
          {tree.map((node) => (
            <CategoryTreeRow
              key={node.id}
              node={node}
              depth={0}
              selectedId={value}
              expandedIds={expandedIds}
              onSelect={handleSelect}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
