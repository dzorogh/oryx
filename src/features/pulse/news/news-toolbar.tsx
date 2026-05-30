"use client";

import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Card, CardHeader } from "@/components/ui/card";
import type { NewsRubric } from "@/components/home/news-demo-data";

type RubricTab = {
  id: NewsRubric;
  label: string;
};

type NewsToolbarProps = {
  tabs: RubricTab[];
  activeRubric: NewsRubric;
  onRubricChange: (rubric: NewsRubric) => void;
};

export const NewsToolbar = ({ tabs, activeRubric, onRubricChange }: NewsToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-3 pb-0">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">Company news</h1>
        <p className="text-xs text-muted-foreground">
          Announcements, IT, HR, and logistics in one feed. Filter by category or browse popular
          articles in the sidebar.
        </p>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter by category"
      >
        {tabs.map((tab) => {
          const isActive = activeRubric === tab.id;
          return (
            <HomeFilterChip
              key={tab.id}
              active={isActive}
              role="tab"
              aria-selected={isActive}
              aria-controls="news-panel"
              ariaLabel={`Show category ${tab.label}`}
              onClick={() => onRubricChange(tab.id)}
            >
              {tab.label}
            </HomeFilterChip>
          );
        })}
      </div>
    </CardHeader>
  </Card>
);
