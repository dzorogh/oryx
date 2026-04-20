"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { ALL_TASKS } from "@/components/home/tasks-today-demo-data";
import { TasksMonthCalendar } from "@/components/tasks/calendar/tasks-month-calendar";
import { ProjectSettingsModal } from "@/components/tasks/project-settings-modal";
import { SpaceSettingsModal } from "@/components/tasks/space-settings-modal";

const TasksPage = () => {
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isSpaceSettingsOpen, setIsSpaceSettingsOpen] = useState(false);

  return (
    <>
      <main className="min-h-screen pl-0 sm:pl-12">
        <section className="p-4">
          <div className="space-y-2">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Все задачи</h1>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSpaceSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  aria-label="Open space settings"
                >
                  <Settings aria-hidden className="size-4" />
                  Space Settings
                </button>
                <button
                  type="button"
                  onClick={() => setIsProjectSettingsOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--corportal-border-grey)] bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  aria-label="Open project settings"
                >
                  <Settings aria-hidden className="size-4" />
                  Project Settings
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
            <div className="pt-1">
              <TasksMonthCalendar initialTasks={ALL_TASKS} />
            </div>
          </div>
        </section>
      </main>
      <ProjectSettingsModal open={isProjectSettingsOpen} onOpenChange={setIsProjectSettingsOpen} />
      <SpaceSettingsModal open={isSpaceSettingsOpen} onOpenChange={setIsSpaceSettingsOpen} />
    </>
  );
};

export default TasksPage;
