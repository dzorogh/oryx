"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Clock3, MessageSquare, Share2, ThumbsUp } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  NEWS_RUBRIC_LABELS,
  getPopularNews,
  getRelatedNews,
  type NewsItem,
} from "@/components/home/news-demo-data";
import { NewsArticleBody } from "@/features/pulse/news/news-article-body";
import { NewsArticleCard } from "@/features/pulse/news/news-article-card";
import { NewsArticleSidebar } from "@/features/pulse/news/news-article-sidebar";
import { CommentsPanel } from "@/features/comments/comments-panel";
import {
  COMMENT_CURRENT_USER,
  COMMENT_MENTIONABLE_USERS,
} from "@/features/comments/comments-demo-data";
import type { CommentFeedItem } from "@/features/comments/comments-types";

type NewsArticlePageProps = {
  item: NewsItem;
  commentSeed: CommentFeedItem[];
};

export const NewsArticlePage = ({ item, commentSeed }: NewsArticlePageProps) => {
  const rubricLabel = NEWS_RUBRIC_LABELS[item.rubric];
  const related = getRelatedNews(item);
  const popular = getPopularNews();

  const [liked, setLiked] = useState(false);
  const likeCount = item.likes + (liked ? 1 : 0);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : item.href;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
        return;
      }
    } catch {
      // ignore and fall through to the generic message
    }
    toast.message("Share this article", { description: url });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 p-4">
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
              <Link
                href="/pulse/news"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                News
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="line-clamp-1 max-w-[40ch]">{item.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div>
          <Link
            href="/pulse/news"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Back to news
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-10">
          <div className="flex min-w-0 flex-col gap-8">
            <Card className="overflow-hidden p-5 md:p-8">
              <div className="mx-auto flex w-full max-w-[760px] flex-col">
                <header className="flex flex-col gap-4">
                  <Badge variant="secondary" className="w-fit">
                    {rubricLabel}
                  </Badge>
                  <h1 className="text-balance font-heading text-2xl font-semibold tracking-tight text-foreground md:text-3xl lg:text-4xl">
                    {item.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <div className="flex items-center gap-2.5">
                      <Image
                        src={item.author.avatarUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
                      />
                      <div className="leading-tight">
                        <p className="text-sm font-medium text-foreground">{item.author.name}</p>
                        <p className="text-xs text-muted-foreground">{item.author.role}</p>
                      </div>
                    </div>
                    <Separator orientation="vertical" className="hidden h-8 sm:block" />
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{item.publishedDate}</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 aria-hidden className="size-3.5 shrink-0" />
                        {item.readingMinutes} min read
                      </span>
                    </div>
                  </div>
                </header>

                <div className="relative my-6 aspect-video w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
                  <Image
                    src={item.imageUrl}
                    alt={`News illustration: ${item.title}`}
                    fill
                    priority
                    sizes="(max-width: 800px) 100vw, 760px"
                    className="object-cover"
                  />
                </div>

                <NewsArticleBody blocks={item.body} />

                <Separator className="my-6" />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={liked ? "secondary" : "outline"}
                      size="sm"
                      aria-pressed={liked}
                      onClick={() => setLiked((current) => !current)}
                    >
                      <ThumbsUp className={`size-4 ${liked ? "fill-current" : ""}`} />
                      <span className="tabular-nums">{likeCount}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      nativeButton={false}
                      render={<a href="#news-comments-heading" />}
                    >
                      <MessageSquare className="size-4" />
                      <span className="tabular-nums">{item.comments}</span>
                    </Button>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={handleShare}>
                    <Share2 className="size-4" />
                    Share
                  </Button>
                </div>
              </div>
            </Card>

            <section
              id="news-comments-heading"
              aria-label="Comments"
              className="scroll-mt-4"
            >
              <CommentsPanel
                scope={{ type: "news", id: item.id }}
                currentUser={COMMENT_CURRENT_USER}
                mentionableUsers={COMMENT_MENTIONABLE_USERS}
                initialItems={commentSeed}
              />
            </section>

            {related.length > 0 ? (
              <section aria-labelledby="news-related-heading" className="flex flex-col gap-4">
                <h2
                  id="news-related-heading"
                  className="font-heading text-lg font-semibold text-foreground"
                >
                  Related articles
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {related.map((relatedItem) => (
                    <NewsArticleCard key={relatedItem.id} item={relatedItem} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <NewsArticleSidebar
            blocks={item.body}
            popularItems={popular}
            currentId={item.id}
          />
        </div>
      </div>
    </div>
  );
};
