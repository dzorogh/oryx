import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, ThumbsUp } from "lucide-react";
import {
  IDEA_STATUS_BADGE_CLASS,
  IDEA_STATUS_LABELS,
  IDEAS_ITEMS,
} from "@/components/home/ideas-demo-data";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";

export const metadata: Metadata = {
  title: "Идеи и предложения | Oryx BMS",
  description: "Лента идей и предложений сотрудников",
};

const PulseIdeasPage = () => (
  <section className="p-5">
    <div className="rounded-xl bg-card p-5">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Идеи и предложения</h1>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          aria-label="Вернуться на главную"
        >
          На главную
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
        {IDEAS_ITEMS.map((idea) => (
          <article
            key={idea.id}
            className="flex flex-col gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <CorportalSoftBadge className={IDEA_STATUS_BADGE_CLASS[idea.status]}>
                {IDEA_STATUS_LABELS[idea.status]}
              </CorportalSoftBadge>
              <span className="text-xs text-muted-foreground">{idea.createdAt}</span>
            </div>
            <h2 className="text-sm font-semibold leading-tight text-foreground">{idea.title}</h2>
            <p className="text-xs text-muted-foreground">Автор: {idea.author}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ThumbsUp aria-hidden className="size-3.5" />
                {idea.likes}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle aria-hidden className="size-3.5" />
                {idea.comments}
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default PulseIdeasPage;
