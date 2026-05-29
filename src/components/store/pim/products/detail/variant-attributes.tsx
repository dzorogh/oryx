"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { ProductAttributeGroup, ProductAttributeRow } from "./product-detail-demo-data";

type VariantAttributesProps = {
  attributeGroups: ProductAttributeGroup[];
  logistics: ProductAttributeRow[];
};

type DetailTab = "attributes" | "logistics";

const AttributeCell = ({ row }: { row: ProductAttributeRow }) => (
  <div className="space-y-0.5 rounded-lg border border-[var(--corportal-border-grey)] bg-muted/10 px-3 py-2">
    <p className="text-[11px] leading-snug text-muted-foreground">{row.label}</p>
    <p className="truncate text-sm font-medium tabular-nums text-foreground">{row.value}</p>
  </div>
);

const ATTRIBUTE_LIST_CLASS = "grid gap-2 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]";

export const VariantAttributes = ({ attributeGroups, logistics }: VariantAttributesProps) => {
  const [activeTab, setActiveTab] = useState<DetailTab>("attributes");
  const [activeGroupId, setActiveGroupId] = useState(attributeGroups[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");

  const activeGroup = attributeGroups.find((group) => group.id === activeGroupId) ?? attributeGroups[0];
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredRows = useMemo(() => {
    if (!activeGroup) {
      return [];
    }
    if (!normalizedQuery) {
      return activeGroup.rows;
    }
    return activeGroup.rows.filter((row) => row.label.toLowerCase().includes(normalizedQuery));
  }, [activeGroup, normalizedQuery]);

  const filteredLogistics = useMemo(() => {
    if (!normalizedQuery || activeTab !== "logistics") {
      return logistics;
    }
    return logistics.filter((row) => row.label.toLowerCase().includes(normalizedQuery));
  }, [activeTab, logistics, normalizedQuery]);

  const handleTabChange = (tab: DetailTab) => {
    setActiveTab(tab);
    setSearchQuery("");
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--corportal-border-grey)] pb-2">
        {(["attributes", "logistics"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              activeTab === tab
                ? "border-primary bg-primary/5 text-primary"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-pressed={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "attributes" ? (
        <div className="flex flex-wrap gap-2">
          {attributeGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => {
                setActiveGroupId(group.id);
                setSearchQuery("");
              }}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeGroupId === group.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-[var(--corportal-border-grey)] text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
              aria-pressed={activeGroupId === group.id}
            >
              {group.label}
            </button>
          ))}
        </div>
      ) : null}

      <Input
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder="Search"
        aria-label="Search attributes"
        className="h-9 max-w-sm"
      />

      <Separator className="bg-[var(--corportal-border-grey)]" />

      <div>
        {activeTab === "attributes" ? (
          filteredRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No attributes match your search.</p>
          ) : (
            <div className={ATTRIBUTE_LIST_CLASS}>
              {filteredRows.map((row) => (
                <AttributeCell key={`${activeGroup?.id}-${row.label}`} row={row} />
              ))}
            </div>
          )
        ) : filteredLogistics.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No logistics fields match your search.</p>
        ) : (
          <div className={ATTRIBUTE_LIST_CLASS}>
            {filteredLogistics.map((row) => (
              <AttributeCell key={row.label} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
