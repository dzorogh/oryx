"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Settings } from "lucide-react";
import { PriorityBadge } from "@/components/home/priority-badge";
import { ALL_TASKS } from "@/components/home/tasks-today-demo-data";
import { ProjectSettingsModal } from "@/components/tasks/project-settings-modal";

const TasksPage = () => {
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);

  return (
    <>
      <main className="min-h-screen pl-0 sm:pl-12">
        <section className="p-5">
          <div className="rounded-xl bg-card p-5">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Все задачи</h1>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsProjectSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  aria-label="Открыть настройки проекта"
                >
                  <Settings aria-hidden className="size-4" />
                  Настройки Project
                </button>
                <Link
                  href="/"
                  className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  aria-label="Вернуться на главную"
                >
                  На главную
                </Link>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">
              {ALL_TASKS.map((task) => (
                <article
                  key={task.id}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--corportal-border-grey)] bg-card p-3"
                  aria-label={`Задача: ${task.title}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="shrink-0 text-right text-xs text-muted-foreground">{task.deadlineLabel}</span>
                  </div>
                  <h2 className="text-sm font-semibold leading-tight text-foreground">{task.title}</h2>
                  <div className="flex items-end justify-between gap-2">
                    <p className="min-w-0 flex-1 text-xs leading-snug text-muted-foreground line-clamp-2">{task.projectName}</p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                      aria-label={`Комментариев: ${task.comments}`}
                    >
                      <MessageCircle aria-hidden className="size-3.5" />
                      {task.comments}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <ProjectSettingsModal open={isProjectSettingsOpen} onOpenChange={setIsProjectSettingsOpen} />
    </>
  );
};

export default TasksPage;
