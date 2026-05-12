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
    className="flex min-h-0 min-w-0 items-start gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-2"
    aria-label={`Идея: ${idea.title}`}
  >
    <div className="min-w-0 flex-1">
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{idea.title}</h3>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <CorportalSoftBadge className={IDEA_STATUS_BADGE_CLASS[idea.status]}>{IDEA_STATUS_LABELS[idea.status]}</CorportalSoftBadge>
        <p className="truncate text-xs leading-tight text-muted-foreground">{idea.author}</p>
      </div>
    </div>
    <div className="mt-0.5 flex shrink-0 flex-col items-start gap-1 text-xs text-muted-foreground">
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
);

export const HomeIdeasSection = () => {
  const latestIdeas = IDEAS_ITEMS.slice(0, 4);
  if (latestIdeas.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {latestIdeas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
};
