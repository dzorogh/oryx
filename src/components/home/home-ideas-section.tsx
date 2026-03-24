import { MessageCircle, ThumbsUp } from "lucide-react";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import {
  IDEA_STATUS_BADGE_CLASS,
  IDEA_STATUS_LABELS,
  IDEAS_ITEMS,
  type IdeaItem,
} from "./ideas-demo-data";
import { HomeDateMetaText } from "./home-date-meta-text";
import { HomeFeedCard } from "./home-feed-card";

const IdeaCard = ({ idea }: { idea: IdeaItem }) => (
  <HomeFeedCard
    ariaLabel={`Идея: ${idea.title}`}
    title={idea.title}
    meta={
      <CorportalSoftBadge className={IDEA_STATUS_BADGE_CLASS[idea.status]}>
        {IDEA_STATUS_LABELS[idea.status]}
      </CorportalSoftBadge>
    }
    actions={<HomeDateMetaText>{idea.createdAt}</HomeDateMetaText>}
    footer={
      <>
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
      </>
    }
  />
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
