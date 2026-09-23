// english-ui:ignore-file
"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { cn } from "@/lib/utils";

export const LogisticsDialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  loading = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Dialog data is still loading: show the skeleton instead of the body. */
  loading?: boolean;
  /** Dialog data failed to load: show the error instead of the body. */
  error?: string | null;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className={cn("max-h-[85vh] overflow-y-auto sm:max-w-md", className)}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className={description ? undefined : "sr-only"}>
          {description ?? title}
        </DialogDescription>
      </DialogHeader>
      {loading ? <LogisticsLoading /> : error ? <LogisticsError message={error} /> : children}
    </DialogContent>
  </Dialog>
);
