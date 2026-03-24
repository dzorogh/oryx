"use client";

import Image from "next/image";
import { Clock3, ThumbsUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NEWS_RUBRIC_LABELS, type NewsItem } from "@/components/home/news-demo-data";

type NewsArticleCardProps = {
  item: NewsItem;
  imagePriority?: boolean;
};

export const NewsArticleCard = ({ item, imagePriority }: NewsArticleCardProps) => {
  const rubricLabel = NEWS_RUBRIC_LABELS[item.rubric];
  const imageAlt = `Иллюстрация к новости: ${item.title}`;

  return (
    <Card
      size="sm"
      className="h-full pt-0!"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-xl">
        <Image
          src={item.imageUrl}
          alt={imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover/card:scale-[1.02]"
          loading={imagePriority ? "eager" : "lazy"}
          priority={Boolean(imagePriority)}
        />
      </div>
      <CardHeader className="gap-2 pb-2">
        <Badge variant="outline" className="w-fit font-normal">
          {rubricLabel}
        </Badge>
        <CardTitle className="line-clamp-2 text-base leading-snug">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-2 pt-0">
        <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
      </CardContent>
      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t-0 bg-transparent pt-0">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock3 aria-hidden className="size-3.5 shrink-0" />
            {item.publishedAt}
          </span>
          <span className="inline-flex items-center gap-1">
            <ThumbsUp aria-hidden className="size-3.5 shrink-0" />
            {item.likes}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled
          aria-disabled="true"
          aria-label={`Открыть новость «${item.title}» — скоро`}
        >
          Подробнее
        </Button>
      </CardFooter>
    </Card>
  );
};
