import { MessageCircle } from "lucide-react";
import { TODAY_TASKS, type TodayTask } from "./tasks-today-demo-data";
import { HomeDateMetaText } from "./home-date-meta-text";
import { HomeFeedCard } from "./home-feed-card";
import { PriorityBadge } from "./priority-badge";

const TaskCard = ({ task }: { task: TodayTask }) => (
  <HomeFeedCard
    ariaLabel={`Задача: ${task.title}`}
    title={task.title}
    meta={<PriorityBadge priority={task.priority} />}
    actions={<HomeDateMetaText>{task.deadlineLabel}</HomeDateMetaText>}
    footer={
      <>
      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground line-clamp-2">{task.projectName}</p>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground" aria-label={`Комментариев: ${task.comments}`}>
        <MessageCircle aria-hidden className="size-3.5" />
        {task.comments}
      </span>
      </>
    }
  />
);

export const HomeTodayTasksSection = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {TODAY_TASKS.slice(0, 6).map((task) => (
      <TaskCard key={task.id} task={task} />
    ))}
  </div>
);
