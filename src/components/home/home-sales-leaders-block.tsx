"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  HomeBlockShell,
  type HomeBlockAccent,
  type HomeBlockHeaderAction,
} from "./home-block-shell";
import { HomeSalesLeadersFilters, HomeSalesLeadersSection } from "./home-sales-leaders-section";
import type { SalesRankingDimension, StatsDirection } from "./stats-demo-data";

type HomeSalesLeadersBlockProps = {
  title: string;
  icon: LucideIcon;
  accent?: HomeBlockAccent;
  collapsed: boolean;
  onHide: () => void;
  onToggleCollapsed: () => void;
  actions?: HomeBlockHeaderAction[];
};

export const HomeSalesLeadersBlock = ({
  title,
  icon,
  accent,
  collapsed,
  onHide,
  onToggleCollapsed,
  actions,
}: HomeSalesLeadersBlockProps) => {
  const [direction, setDirection] = useState<StatsDirection>("all");
  const [dimension, setDimension] = useState<SalesRankingDimension>("employees");

  const filters = (
    <HomeSalesLeadersFilters
      direction={direction}
      onDirectionChange={setDirection}
      dimension={dimension}
      onDimensionChange={setDimension}
    />
  );

  return (
    <HomeBlockShell
      title={title}
      icon={icon}
      accent={accent}
      collapsed={collapsed}
      onHide={onHide}
      onToggleCollapsed={onToggleCollapsed}
      actions={actions}
      headerExtra={filters}
    >
      <div className="flex flex-col gap-1.5">
        <div className="md:hidden">{filters}</div>
        <HomeSalesLeadersSection
          direction={direction}
          onDirectionChange={setDirection}
          dimension={dimension}
          onDimensionChange={setDimension}
          hideFilters
        />
      </div>
    </HomeBlockShell>
  );
};
