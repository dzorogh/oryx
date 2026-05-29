"use client";

import { ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { NewsItem, NewsRubric } from "@/components/home/news-demo-data";
import { NEWS_RUBRIC_LABELS } from "@/components/home/news-demo-data";

type NewsSidebarProps = {
  popularItems: NewsItem[];
  activeRubric: NewsRubric;
  onSelectRubric: (rubric: NewsRubric) => void;
};

const RUBRIC_ORDER: Exclude<NewsRubric, "all">[] = ["it", "company", "hr", "logistics"];

export const NewsSidebar = ({ popularItems, activeRubric, onSelectRubric }: NewsSidebarProps) => (
  <aside className="flex flex-col gap-6" aria-label="Боковая панель новостей">
    <Card size="sm">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">Популярное</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-0 px-0 pt-2 pb-3">
        <ol className="flex flex-col">
          {popularItems.map((item, index) => (
            <li key={item.id}>
              {index > 0 ? <Separator className="my-2" /> : null}
              <div className="flex gap-3 px-4 py-1">
                <span
                  className="font-heading text-lg font-semibold tabular-nums text-muted-foreground/80"
                  aria-hidden
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{item.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <ThumbsUp aria-hidden className="size-3.5 shrink-0" />
                    <span>{item.likes}</span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>

    <Card size="sm">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-sm font-semibold">Рубрики</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 pt-3">
        {RUBRIC_ORDER.map((id) => {
          const active = activeRubric === id;
          return (
            <Button
              key={id}
              type="button"
              variant={active ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-full justify-start font-normal"
              onClick={() => onSelectRubric(id)}
              aria-pressed={active}
              aria-label={`Показать рубрику ${NEWS_RUBRIC_LABELS[id]}`}
            >
              {NEWS_RUBRIC_LABELS[id]}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  </aside>
);
