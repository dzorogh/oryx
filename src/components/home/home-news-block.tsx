"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  HomeBlockShell,
  type HomeBlockAccent,
  type HomeBlockHeaderAction,
} from "./home-block-shell";
import { HomeNewsFilters, HomeNewsSection } from "./home-news-section";
import type { NewsRubric } from "./news-demo-data";

type HomeNewsBlockProps = {
  title: string;
  icon: LucideIcon;
  accent?: HomeBlockAccent;
  collapsed: boolean;
  onHide: () => void;
  onToggleCollapsed: () => void;
  actions?: HomeBlockHeaderAction[];
};

export const HomeNewsBlock = ({
  title,
  icon,
  accent,
  collapsed,
  onHide,
  onToggleCollapsed,
  actions,
}: HomeNewsBlockProps) => {
  const [activeRubric, setActiveRubric] = useState<NewsRubric>("all");

  const filters = (
    <HomeNewsFilters activeRubric={activeRubric} onRubricChange={setActiveRubric} />
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
      <div className="flex flex-col gap-2">
        <div className="md:hidden">{filters}</div>
        <HomeNewsSection
          activeRubric={activeRubric}
          onRubricChange={setActiveRubric}
          hideFilters
        />
      </div>
    </HomeBlockShell>
  );
};
