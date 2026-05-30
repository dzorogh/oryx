"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

type TasksToolbarProps = {
  onOpenSpaceSettings: () => void;
  onOpenProjectSettings: () => void;
};

export const TasksToolbar = ({
  onOpenSpaceSettings,
  onOpenProjectSettings,
}: TasksToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Tasks</h1>
          <p className="text-xs text-muted-foreground">
            Plan and track work in a month calendar. Drag tasks between days, adjust times, and
            manage space or project settings.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenSpaceSettings}
            aria-label="Open space settings"
            className="shrink-0"
          >
            <Settings aria-hidden className="size-3.5" />
            Space Settings
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenProjectSettings}
            aria-label="Open project settings"
            className="shrink-0"
          >
            <Settings aria-hidden className="size-3.5" />
            Project Settings
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
);
