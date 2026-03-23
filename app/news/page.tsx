import { Clock3, ThumbsUp } from "lucide-react";
import { NEWS_ITEMS } from "@/components/home/news-demo-data";

const NewsPage = () => (
  <main className="min-h-screen bg-[var(--corportal-surface-muted)] pl-12">
    <section className="p-5">
      <div className="rounded-xl bg-card p-5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Все новости</h1>
        <div className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
          {NEWS_ITEMS.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-3"
            >
              <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
              <div className="flex items-center justify-between pt-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock3 aria-hidden className="size-3.5" />
                  <span>{item.publishedAt}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp aria-hidden className="size-3.5" />
                  <span>{item.likes}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </main>
);

export default NewsPage;
