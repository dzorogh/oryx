"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductAttributeGroup, ProductAttributeRow } from "./product-detail-demo-data";

type VariantAttributesProps = {
  attributeGroups: ProductAttributeGroup[];
  logistics: ProductAttributeRow[];
};

type DetailSection = "attributes" | "logistics";

const AttributeCell = ({ row }: { row: ProductAttributeRow }) => (
  <div className="space-y-0.5 rounded-lg border border-[var(--corportal-border-grey)] bg-muted/10 px-3 py-2">
    <p className="text-[11px] leading-snug text-muted-foreground">{row.label}</p>
    <p className="truncate text-sm font-medium tabular-nums text-foreground">{row.value}</p>
  </div>
);

const ATTRIBUTE_LIST_CLASS = "grid gap-2 grid-cols-[repeat(auto-fill,minmax(150px,1fr))]";

const SectionTab = ({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    role="tab"
    aria-selected={isActive}
    onClick={onClick}
    className={cn(
      "border-b-2 pb-2 text-sm font-medium capitalize transition-colors",
      isActive
        ? "border-primary text-foreground"
        : "border-transparent text-muted-foreground hover:text-foreground",
    )}
  >
    {label}
  </button>
);

export const VariantAttributes = ({ attributeGroups, logistics }: VariantAttributesProps) => {
  const [activeSection, setActiveSection] = useState<DetailSection>("attributes");
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
    if (!normalizedQuery) {
      return logistics;
    }
    return logistics.filter((row) => row.label.toLowerCase().includes(normalizedQuery));
  }, [logistics, normalizedQuery]);

  const handleSectionChange = (section: DetailSection) => {
    setActiveSection(section);
    setSearchQuery("");
  };

  const handleGroupChange = (value: string | null) => {
    if (!value) {
      return;
    }
    setActiveGroupId(value);
    setSearchQuery("");
  };

  const activeGroupLabel = activeGroup?.label ?? "Category";

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Specification sections"
        className="flex gap-6 border-b border-[var(--corportal-border-grey)]"
      >
        <SectionTab
          label="Attributes"
          isActive={activeSection === "attributes"}
          onClick={() => handleSectionChange("attributes")}
        />
        <SectionTab
          label="Logistics"
          isActive={activeSection === "logistics"}
          onClick={() => handleSectionChange("logistics")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {activeSection === "attributes" ? (
          <Select value={activeGroupId} onValueChange={handleGroupChange}>
            <SelectTrigger size="sm" className="w-[200px] bg-background" aria-label="Attribute category">
              <SelectValue>{activeGroupLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {attributeGroups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search specifications"
          className="h-8 max-w-xs flex-1"
        />
      </div>

      <div>
        {activeSection === "attributes" ? (
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
