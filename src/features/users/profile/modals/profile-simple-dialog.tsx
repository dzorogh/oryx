"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ProfileSimpleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  onSave?: () => void;
  saveLabel?: string;
};

export const ProfileSimpleDialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  saveLabel = "Save changes",
}: ProfileSimpleDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>
      {children}
      <DialogFooter className="gap-2 sm:justify-between">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        {onSave ? (
          <Button type="button" onClick={onSave}>
            {saveLabel}
          </Button>
        ) : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
