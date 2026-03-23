"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock3, EllipsisVertical, Newspaper, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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

const NewsCard = ({ item }: { item: NewsItem }) => (
  <article className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-1 pb-5">
    <div className="relative aspect-video overflow-hidden rounded-md">
      <Image
        src={item.imageUrl}
        alt=""
        fill
        sizes="(max-width: 768px) 80vw, 320px"
        className="object-cover"
      />
    </div>
    <div className="flex flex-1 flex-col gap-2 px-2">
      <div className="flex items-center justify-between text-xs leading-tight text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock3 aria-hidden className="size-4" />
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

const MicroNewsItem = ({ item }: { item: NewsItem }) => (
  <article className="rounded-sm border border-[var(--corportal-border-grey)] bg-card px-1.5 py-1">
    <div className="flex items-center justify-between gap-2">
      <h3 className="min-w-0 flex-1 truncate text-xs font-bold leading-none text-foreground">
        {item.title}
      </h3>
      <p className="shrink-0 text-xs leading-none text-muted-foreground">{item.publishedAt}</p>
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

  const newsCardItems = filteredNewsItems.slice(0, 6);
  const newsMicroItems = filteredNewsItems.slice(6, 18);

  return (
    <section
      id="news"
      aria-labelledby="news-heading"
      className="flex flex-col gap-3 rounded-xl bg-card p-5"
      data-node-id="40007711:21918"
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-primary p-1 text-primary-foreground">
            <Newspaper aria-hidden className="size-5" />
          </div>
          <h2 id="news-heading" className="text-lg font-bold leading-tight tracking-tight text-foreground">
            Новости
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/news"
            className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label="Перейти ко всем новостям"
          >
            Все новости
          </Link>
          <Button type="button" variant="ghost" size="icon" aria-label="Изменить порядок карточек">
            <EllipsisVertical aria-hidden className="size-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Свернуть блок новостей">
            <ChevronDown aria-hidden className="size-5" />
          </Button>
        </div>
      </header>

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
        {newsCardItems.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
        {newsMicroItems.map((item) => (
          <MicroNewsItem key={item.id} item={item} />
        ))}
      </div>

      {filteredNewsItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Для выбранной рубрики пока нет новостей.</p>
      ) : null}
    </section>
  );
};
