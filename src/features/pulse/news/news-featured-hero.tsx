"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NEWS_RUBRIC_LABELS, type NewsItem } from "@/components/home/news-demo-data";

type NewsFeaturedHeroProps = {
  item: NewsItem;
};

export const NewsFeaturedHero = ({ item }: NewsFeaturedHeroProps) => {
  const rubricLabel = NEWS_RUBRIC_LABELS[item.rubric];
  const imageAlt = `News illustration: ${item.title}`;

  return (
    <article
      className="relative overflow-hidden rounded-2xl ring-1 ring-foreground/10"
      aria-labelledby={`news-hero-title-${item.id}`}
    >
      <div className="relative w-full bg-muted">
        <div className="relative aspect-video min-h-[200px] w-full">
          <Image
            src={item.imageUrl}
            alt={imageAlt}
            fill
            priority
            loading="eager"
            sizes="(max-width: 1024px) 100vw, min(1200px, 100vw)"
            className="object-contain object-top"
          />
        </div>
        <div className="relative z-10 flex flex-col gap-4 border-t border-border/60 bg-background p-5 md:flex-row md:items-end md:justify-between md:p-6">
          <div className="max-w-2xl space-y-2">
            <Badge variant="secondary" className="w-fit">
              {rubricLabel}
            </Badge>
            <h2
              id={`news-hero-title-${item.id}`}
              className="text-balance text-xl font-semibold tracking-tight text-foreground md:text-2xl lg:text-3xl"
            >
              <Link
                href={item.href}
                className="outline-none transition-colors hover:text-primary focus-visible:text-primary"
              >
                {item.title}
              </Link>
            </h2>
            <p className="line-clamp-2 text-sm text-foreground/85 md:text-base">{item.excerpt}</p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground md:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 aria-hidden className="size-4 shrink-0" />
                <span>{item.publishedAt}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ThumbsUp aria-hidden className="size-4 shrink-0" />
                <span>{item.likes}</span>
              </span>
            </div>
          </div>
          <div className="shrink-0 pt-1 md:pb-0.5">
            <Button
              variant="outline"
              size="lg"
              nativeButton={false}
              render={<Link href={item.href} />}
              aria-label={`Read article: ${item.title}`}
            >
              Read
              <ArrowRight aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};
