import { MessageCircle, ThumbsUp } from "lucide-react";
import { IDEAS_ITEMS, type IdeaItem, type IdeaStatus } from "./ideas-demo-data";

const STATUS_LABELS: Record<IdeaStatus, string> = {
  new: "Новая",
  review: "На рассмотрении",
};

const STATUS_STYLES: Record<IdeaStatus, string> = {
  new: "border-primary/30 bg-primary/10 text-primary",
  review: "border-border bg-muted text-muted-foreground",
};

const IdeaCard = ({ idea }: { idea: IdeaItem }) => (
  <article className="flex min-h-36 flex-col justify-between rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3">
    <div className="flex items-start justify-between gap-2">
      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[idea.status]}`}>
        {STATUS_LABELS[idea.status]}
      </span>
      <span className="text-xs text-muted-foreground">{idea.createdAt}</span>
    </div>
    <h3 className="line-clamp-2 pt-2 text-sm font-semibold leading-tight text-foreground">{idea.title}</h3>
    <div className="flex items-center justify-between pt-2">
      <p className="truncate text-xs text-muted-foreground">Автор: {idea.author}</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
