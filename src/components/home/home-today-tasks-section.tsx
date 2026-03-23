import { MessageCircle } from "lucide-react";
import { TODAY_TASKS, type TodayTask } from "./tasks-today-demo-data";
import { PriorityBadge } from "./priority-badge";

const TaskCard = ({ task }: { task: TodayTask }) => (
  <article
    className="flex h-full min-h-0 min-w-0 flex-col gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3"
    aria-label={`Задача: ${task.title}`}
  >
    <div className="flex shrink-0 items-start justify-between gap-2">
      <PriorityBadge priority={task.priority} />
      <span className="shrink-0 text-right text-xs text-muted-foreground">{task.deadlineLabel}</span>
    </div>
    <div className="min-h-0 flex-1">
      <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-foreground">{task.title}</h3>
    </div>
    <div className="flex shrink-0 items-end justify-between gap-2">
      <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground line-clamp-2">{task.projectName}</p>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground" aria-label={`Комментариев: ${task.comments}`}>
        <MessageCircle aria-hidden className="size-3.5" />
        {task.comments}
      </span>
    </div>
  </article>
);

export const HomeTodayTasksSection = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {TODAY_TASKS.map((task) => (
      <TaskCard key={task.id} task={task} />
    ))}
  </div>
);
