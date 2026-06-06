import Link from "next/link";
import { ThumbsUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { NewsBlock, NewsItem } from "@/components/home/news-demo-data";

type NewsArticleSidebarProps = {
  blocks: NewsBlock[];
  popularItems: NewsItem[];
  currentId: string;
};

export const NewsArticleSidebar = ({
  blocks,
  popularItems,
  currentId,
}: NewsArticleSidebarProps) => {
  const headings = blocks.filter(
    (block): block is Extract<NewsBlock, { type: "heading" }> => block.type === "heading",
  );

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-4" aria-label="Article sidebar">
      {headings.length > 0 ? (
        <Card size="sm">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-sm font-semibold">In this article</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <nav aria-label="Table of contents">
              <ol className="flex flex-col gap-1.5">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold">Popular</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 px-0 pt-2 pb-3">
          <ol className="flex flex-col">
            {popularItems.map((item, index) => {
              const isCurrent = item.id === currentId;
              return (
                <li key={item.id}>
                  {index > 0 ? <Separator className="my-2" /> : null}
                  <Link
                    href={item.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className="flex gap-3 px-4 py-1 transition-colors hover:bg-muted/60"
                  >
                    <span
                      className="font-heading text-lg font-semibold tabular-nums text-muted-foreground/80"
                      aria-hidden
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`line-clamp-2 text-sm font-medium leading-snug ${isCurrent ? "text-foreground underline decoration-foreground/30" : "text-foreground"
                          }`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <ThumbsUp aria-hidden className="size-3.5 shrink-0" />
                        <span>{item.likes}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>
    </aside>
  );
};
