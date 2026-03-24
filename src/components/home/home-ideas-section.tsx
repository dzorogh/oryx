import { MessageCircle, ThumbsUp } from "lucide-react";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import {
  IDEA_STATUS_BADGE_CLASS,
  IDEA_STATUS_LABELS,
  IDEAS_ITEMS,
  type IdeaItem,
} from "./ideas-demo-data";

const IdeaCard = ({ idea }: { idea: IdeaItem }) => (
  <article
    className="flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3"
    aria-label={`Идея: ${idea.title}`}
  >
    <div className="flex shrink-0 items-start justify-between gap-2">
      <CorportalSoftBadge className={IDEA_STATUS_BADGE_CLASS[idea.status]}>
        {IDEA_STATUS_LABELS[idea.status]}
      </CorportalSoftBadge>
      <span className="shrink-0 text-right text-xs text-muted-foreground">{idea.createdAt}</span>
    </div>
    <div className="min-h-0 flex-1">
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{idea.title}</h3>
    </div>
    <div className="flex shrink-0 items-end justify-between gap-2">
      <p className="min-w-0 flex-1 truncate text-xs leading-snug text-muted-foreground">Автор: {idea.author}</p>
      <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ThumbsUp aria-hidden className="size-3.5" />
          {idea.likes}
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle aria-hidden className="size-3.5" />
          {idea.comments}
        </span>
      </div>
    </div>
  </article>
);

export const HomeIdeasSection = () => {
  const latestIdeas = IDEAS_ITEMS.slice(0, 4);
  if (latestIdeas.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {latestIdeas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
};
