"use client";

import { useMemo, useState } from "react";
import { ThumbsUp } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NEWS_ITEMS, type NewsItem, type NewsRubric } from "./news-demo-data";
import { HomeFilterChip } from "./home-filter-chip";

type RubricTab = {
  id: NewsRubric;
  label: string;
};

const RUBRIC_TABS: RubricTab[] = [
  { id: "all", label: "All" },
  { id: "it", label: "IT" },
  { id: "company", label: "Company" },
  { id: "hr", label: "HR" },
  { id: "logistics", label: "Logistics" },
];

type HomeNewsFiltersProps = {
  activeRubric: NewsRubric;
  onRubricChange: (rubric: NewsRubric) => void;
  className?: string;
};

export const HomeNewsFilters = ({ activeRubric, onRubricChange, className }: HomeNewsFiltersProps) => (
  <div className={cn("flex flex-wrap items-center gap-1", className)}>
    {RUBRIC_TABS.map((tab) => {
      const active = activeRubric === tab.id;
      return (
        <HomeFilterChip
          key={tab.id}
          onClick={() => onRubricChange(tab.id)}
          active={active}
          ariaLabel={`Show ${tab.label} category`}
        >
          {tab.label}
        </HomeFilterChip>
      );
    })}
  </div>
);

type HomeNewsSectionProps = {
  activeRubric?: NewsRubric;
  onRubricChange?: (rubric: NewsRubric) => void;
  /** Скрыть фильтры внутри секции (если они вынесены в шапку блока). */
  hideFilters?: boolean;
};

const HOME_NEWS_LIMIT = 5;

const NewsCard = ({ item, eager }: { item: NewsItem; eager?: boolean }) => (
  <article className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-1 pb-5">
    <div className="relative aspect-video overflow-hidden rounded-md">
      <Image
        src={item.imageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 80vw, 320px"
        className="object-cover"
        loading={eager ? "eager" : "lazy"}
        priority={Boolean(eager)}
      />
    </div>
    <div className="flex flex-1 flex-col gap-2 px-2">
      <div className="flex items-center justify-between text-xs leading-tight text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>{item.publishedAt}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThumbsUp aria-hidden className="size-4" />
          <span>{item.likes}</span>
        </div>
      </div>
      <h3 className="line-clamp-2 text-sm font-bold leading-tight tracking-tight text-foreground">
        {item.title}
      </h3>
    </div>
  </article>
);

export const HomeNewsSection = ({
  activeRubric: activeRubricProp,
  onRubricChange,
  hideFilters = false,
}: HomeNewsSectionProps = {}) => {
  const [internalRubric, setInternalRubric] = useState<NewsRubric>("all");
  const activeRubric = activeRubricProp ?? internalRubric;

  const handleRubricChange = (rubric: NewsRubric) => {
    onRubricChange?.(rubric);
    if (activeRubricProp === undefined) {
      setInternalRubric(rubric);
    }
  };

  const filteredNewsItems = useMemo(() => {
    if (activeRubric === "all") {
      return NEWS_ITEMS;
    }

    return NEWS_ITEMS.filter((item) => item.rubric === activeRubric);
  }, [activeRubric]);

  const displayNewsItems = filteredNewsItems.slice(0, HOME_NEWS_LIMIT);

  return (
    <div className="flex flex-col gap-3" data-node-id="40007711:21918">
      {hideFilters ? null : (
        <HomeNewsFilters activeRubric={activeRubric} onRubricChange={handleRubricChange} />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {displayNewsItems.map((item) => (
          <NewsCard key={item.id} item={item} eager />
        ))}
      </div>

      {filteredNewsItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">No news for the selected category yet.</p>
      ) : null}
    </div>
  );
};
