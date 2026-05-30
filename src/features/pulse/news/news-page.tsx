"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
import { NewsArticleCard } from "@/features/pulse/news/news-article-card";
import { NewsFeaturedHero } from "@/features/pulse/news/news-featured-hero";
import { NewsSidebar } from "@/features/pulse/news/news-sidebar";
import { NewsToolbar } from "@/features/pulse/news/news-toolbar";

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
    <div className="min-h-screen bg-muted/30">
      <div className="flex w-full flex-col gap-4 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>News</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <NewsToolbar
          tabs={RUBRIC_TABS}
          activeRubric={activeRubric}
          onRubricChange={setActiveRubric}
        />

        {filteredItems.length === 0 ? (
          <div
            id="news-panel"
            role="tabpanel"
            aria-label="News feed"
            className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10 xl:grid-cols-[1fr_300px]"
          >
            <p className="text-sm text-muted-foreground" role="status">
              No news for this category yet. Choose another category or open All.
            </p>
            <NewsSidebar
              popularItems={popularItems}
              activeRubric={activeRubric}
              onSelectRubric={setActiveRubric}
            />
          </div>
        ) : (
          <div
            id="news-panel"
            role="tabpanel"
            aria-label="News feed"
            className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start lg:gap-10 xl:grid-cols-[1fr_300px]"
          >
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
                    More articles
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
                  No other articles in this category yet — see the featured story above.
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
    </div>
  );
};
