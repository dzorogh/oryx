"use client";

import { Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ProfileViewerMode } from "./use-profile-viewer-mode";

const VIEWER_OPTIONS: { value: ProfileViewerMode; label: string }[] = [
  { value: "self", label: "As myself" },
  { value: "admin", label: "As admin" },
  { value: "manager", label: "As manager" },
  { value: "other", label: "As colleague" },
];

type ProfileToolbarProps = {
  viewerMode: ProfileViewerMode;
  onViewerModeChange: (mode: ProfileViewerMode) => void;
};

export const ProfileToolbar = ({ viewerMode, onViewerModeChange }: ProfileToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <div className="flex items-start gap-2 p-3">
      <Eye className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">Demo viewer</p>
        <ToggleGroup
          value={[viewerMode]}
          onValueChange={(values) => {
            const next = values[0] as ProfileViewerMode | undefined;
            if (next) {
              onViewerModeChange(next);
            }
          }}
          variant="outline"
          size="sm"
          className="flex flex-wrap"
        >
          {VIEWER_OPTIONS.map((opt) => (
            <ToggleGroupItem key={opt.value} value={opt.value} aria-label={opt.label}>
              {opt.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  </Card>
);
