"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { ALL_TASKS } from "@/components/home/tasks-today-demo-data";
import { TasksMonthCalendar } from "@/components/tracker/tasks/calendar/tasks-month-calendar";
import { ProjectSettingsModal } from "@/components/tracker/tasks/project-settings-modal";
import { SpaceSettingsModal } from "@/components/tracker/tasks/space-settings-modal";

const TrackerTasksPage = () => {
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isSpaceSettingsOpen, setIsSpaceSettingsOpen] = useState(false);

  return (
    <>
      <section className="p-4">
        <div className="space-y-2">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Tasks</h1>
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
            </div>
          </header>
          <div className="pt-1">
            <TasksMonthCalendar initialTasks={ALL_TASKS} />
          </div>
        </div>
      </section>
      <ProjectSettingsModal open={isProjectSettingsOpen} onOpenChange={setIsProjectSettingsOpen} />
      <SpaceSettingsModal open={isSpaceSettingsOpen} onOpenChange={setIsSpaceSettingsOpen} />
    </>
  );
};

export default TrackerTasksPage;
