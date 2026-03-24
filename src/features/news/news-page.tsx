"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HomeFilterChip } from "@/components/home/home-filter-chip";
import {
  NEWS_ITEMS,
  type NewsRubric,
} from "@/components/home/news-demo-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { NewsArticleCard } from "@/features/news/news-article-card";
import { NewsFeaturedHero } from "@/features/news/news-featured-hero";
import { NewsSidebar } from "@/features/news/news-sidebar";

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

export const NewsPage = () => {
  const [activeRubric, setActiveRubric] = useState<NewsRubric>("all");

  const filteredItems = useMemo(() => {
    if (activeRubric === "all") {
      return NEWS_ITEMS;
    }
    return NEWS_ITEMS.filter((item) => item.rubric === activeRubric);
  }, [activeRubric]);

  const popularItems = useMemo(
    () => [...NEWS_ITEMS].sort((a, b) => b.likes - a.likes).slice(0, 5),
    [],
  );

  const featured = filteredItems[0];
  const gridItems = filteredItems.slice(1);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-8">
      <header className="flex flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Главная
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Новости</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="space-y-2">
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Новости компании
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            Актуальные объявления, IT, HR и логистика — в одной ленте. Фильтруйте по рубрике или
            смотрите популярные материалы справа.
          </p>
        </div>
      </header>

      <div
        className="-mx-1 flex snap-x snap-mandatory gap-1 overflow-x-auto pb-1 no-scrollbar md:mx-0 md:flex-wrap md:overflow-visible md:pb-0"
        role="toolbar"
        aria-label="Фильтр по рубрикам"
      >
        {RUBRIC_TABS.map((tab) => {
          const active = activeRubric === tab.id;
          return (
            <div key={tab.id} className="snap-start shrink-0 first:pl-1 last:pr-1 md:first:pl-0 md:last:pr-0">
              <HomeFilterChip
                onClick={() => setActiveRubric(tab.id)}
                active={active}
                ariaLabel={`Показать рубрику ${tab.label}`}
              >
                {tab.label}
              </HomeFilterChip>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10 xl:grid-cols-[1fr_300px]">
          <p className="text-sm text-muted-foreground" role="status">
            Для выбранной рубрики пока нет новостей. Выберите другую рубрику или откройте «Все».
          </p>
          <NewsSidebar
            popularItems={popularItems}
            activeRubric={activeRubric}
            onSelectRubric={setActiveRubric}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10 xl:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-8">
            {featured ? (
              <>
                <NewsFeaturedHero item={featured} />
                <Separator className="lg:hidden" />
              </>
            ) : null}

            {gridItems.length > 0 ? (
              <section aria-labelledby="news-grid-heading">
                <h2 id="news-grid-heading" className="sr-only">
                  Остальные материалы
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {gridItems.map((item, index) => (
                    <NewsArticleCard
                      key={item.id}
                      item={item}
                      imagePriority={index < 3}
                    />
                  ))}
                </div>
              </section>
            ) : featured ? (
              <p className="text-sm text-muted-foreground">
                Других материалов в этой рубрике пока нет — откройте главную новость выше.
              </p>
            ) : null}
          </div>

          <NewsSidebar
            popularItems={popularItems}
            activeRubric={activeRubric}
            onSelectRubric={setActiveRubric}
          />
        </div>
      )}
    </div>
  );
};
