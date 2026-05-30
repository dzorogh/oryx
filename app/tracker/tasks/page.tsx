"use client";

import { useState } from "react";
import Link from "next/link";
import { ALL_TASKS } from "@/components/home/tasks-today-demo-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { TasksMonthCalendar } from "@/components/tracker/tasks/calendar/tasks-month-calendar";
import { ProjectSettingsModal } from "@/components/tracker/tasks/project-settings-modal";
import { SpaceSettingsModal } from "@/components/tracker/tasks/space-settings-modal";
import { TasksToolbar } from "@/components/tracker/tasks/tasks-toolbar";

const TrackerTasksPage = () => {
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isSpaceSettingsOpen, setIsSpaceSettingsOpen] = useState(false);

  const handleOpenSpaceSettings = () => {
    setIsSpaceSettingsOpen(true);
  };

  const handleOpenProjectSettings = () => {
    setIsProjectSettingsOpen(true);
  };

  return (
    <>
      <main className="min-h-screen bg-muted/30">
        <section className="p-4">
          <div className="flex w-full flex-col gap-4">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    render={<Link href="/tracker/tasks" aria-label="Open Tracker section" />}
                  >
                    Tracker
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Tasks</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <TasksToolbar
              onOpenSpaceSettings={handleOpenSpaceSettings}
              onOpenProjectSettings={handleOpenProjectSettings}
            />

            <TasksMonthCalendar initialTasks={ALL_TASKS} />
          </div>
        </section>
      </main>

      <ProjectSettingsModal open={isProjectSettingsOpen} onOpenChange={setIsProjectSettingsOpen} />
      <SpaceSettingsModal open={isSpaceSettingsOpen} onOpenChange={setIsSpaceSettingsOpen} />
    </>
  );
};

export default TrackerTasksPage;
