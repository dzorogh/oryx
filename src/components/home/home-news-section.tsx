"use client";

import { useMemo, useState } from "react";
import { Clock3, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NEWS_ITEMS, type NewsItem, type NewsRubric } from "./news-demo-data";

type RubricTab = {
  id: NewsRubric;
  label: string;
};

const RUBRIC_TABS: RubricTab[] = [
  { id: "all", label: "Все" },
  { id: "it", label: "IT" },
  { id: "company", label: "Компания" },
  { id: "hr", label: "HR" },
  { id: "logistics", label: "Логистика" },
];

const HOME_NEWS_LIMIT = 6;

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

export const HomeNewsSection = () => {
  const [activeRubric, setActiveRubric] = useState<NewsRubric>("all");

  const filteredNewsItems = useMemo(() => {
    if (activeRubric === "all") {
      return NEWS_ITEMS;
    }

    return NEWS_ITEMS.filter((item) => item.rubric === activeRubric);
  }, [activeRubric]);

  const displayNewsItems = filteredNewsItems.slice(0, HOME_NEWS_LIMIT);

  return (
    <div className="flex flex-col gap-3" data-node-id="40007711:21918">
      <div className="flex flex-wrap items-center gap-1">
        {RUBRIC_TABS.map((tab) => {
          const active = activeRubric === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveRubric(tab.id)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-[var(--corportal-border-grey)] bg-card text-foreground hover:bg-muted",
              )}
              aria-label={`Показать рубрику ${tab.label}`}
              aria-pressed={active}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {displayNewsItems.map((item, index) => (
          <NewsCard key={item.id} item={item} eager={index === 0} />
        ))}
      </div>

      {filteredNewsItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Для выбранной рубрики пока нет новостей.</p>
      ) : null}
    </div>
  );
};
