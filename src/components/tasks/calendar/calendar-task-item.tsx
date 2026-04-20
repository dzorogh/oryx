"use client";

import { Input } from "@/components/ui/input";
import type { CalendarTask } from "./calendar-types";
import { COLOR_CLASS_BY_TASK } from "./calendar-color-map";

type CalendarTaskItemProps = {
  task: CalendarTask;
  timeLabel: string;
  isTimeEditing: boolean;
  isDragging: boolean;
  editingTimeValue: string;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onStartTimeEdit: (task: CalendarTask) => void;
  onTimeValueChange: (value: string) => void;
  onFinishTimeEdit: (task: CalendarTask, shouldCommit: boolean) => void;
};

export const CalendarTaskItem = ({
  task,
  timeLabel,
  isTimeEditing,
  isDragging,
  editingTimeValue,
  onDragStart,
  onDragEnd,
  onStartTimeEdit,
  onTimeValueChange,
  onFinishTimeEdit,
}: CalendarTaskItemProps) => (
  <article
    draggable
    onDragStart={() => onDragStart(task.id)}
    onDragEnd={onDragEnd}
    className={[
      "group relative rounded-md border bg-background px-1 py-0.5 text-xs shadow-xs transition",
      isDragging ? "opacity-50" : "hover:border-muted-foreground/40",
    ].join(" ")}
    aria-label={`Задача ${task.title}`}
  >
    <div className="flex h-4 w-full items-center gap-1.5">
      <span className={["h-3 w-1 shrink-0 rounded-full", COLOR_CLASS_BY_TASK[task.color]].join(" ")} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate leading-tight text-foreground">{task.title}</p>
      </div>
      <div>
        <div className="relative h-5 shrink-0">
          <button
            type="button"
            onClick={() => onStartTimeEdit(task)}
            className={[
              "h-5 rounded px-1 text-[10px] font-medium tabular-nums text-muted-foreground transition hover:bg-muted hover:text-foreground",
              isTimeEditing ? "pointer-events-none opacity-0" : "",
            ].join(" ")}
            aria-label={`Изменить время задачи ${task.title}`}
          >
            {timeLabel}
          </button>

          {isTimeEditing && (
            <div className="absolute top-0 right-0 z-10">
              <Input
                value={editingTimeValue}
                onChange={(event) => onTimeValueChange(event.target.value)}
                onBlur={() => onFinishTimeEdit(task, true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onFinishTimeEdit(task, true);
                  }

                  if (event.key === "Escape") {
                    onFinishTimeEdit(task, false);
                  }
                }}
                autoFocus
                className="h-5 w-10 border-border tabular-nums rounded-sm text-center bg-background px-1 !text-[10px]"
                aria-label="Редактирование времени задачи"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  </article>
);
