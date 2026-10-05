"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import {
  DIRTY_CLOSE_PROMPT,
  SUBMIT_PENDING_LABEL,
} from "@/features/logistics/ui/catalog-quantity-model";
import { cn } from "@/lib/utils";

export type DialogShellSize = "sm" | "md" | "lg" | "catalog";

const SIZE_CLASS: Record<DialogShellSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:rounded-xl",
  catalog:
    "h-[100dvh] max-h-[100dvh] w-screen max-w-none rounded-none sm:h-[90vh] sm:max-h-[90vh] sm:w-[min(1120px,calc(100vw-3rem))] sm:max-w-none sm:rounded-lg",
};

export const DialogShell = ({
  open,
  onOpenChange,
  size = "md",
  kicker,
  title,
  description,
  header,
  panel,
  children,
  footerSummary,
  submitLabel,
  onSubmit,
  submitDisabled = false,
  disabledReason,
  submitting = false,
  serverError,
  dirty = false,
  loading = false,
  error = null,
  pendingLabel = SUBMIT_PENDING_LABEL,
  /** Тип D: «Назад» справа, без итога и подсказки клавиш. */
  dismissLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: DialogShellSize;
  kicker?: string;
  title: string;
  description?: string;
  header?: ReactNode;
  /** Серая панель «Товары» — только тип A. */
  panel?: ReactNode;
  children: ReactNode;
  footerSummary?: ReactNode;
  submitLabel: string;
  onSubmit: () => void;
  submitDisabled?: boolean;
  disabledReason?: string;
  submitting?: boolean;
  serverError?: string | null;
  dirty?: boolean;
  loading?: boolean;
  error?: string | null;
  pendingLabel?: string;
  dismissLabel?: string;
}) => {
  const formId = useId();
  const [confirmClose, setConfirmClose] = useState(false);
  const contentRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const submitDisabledRef = useRef(submitDisabled);
  const onSubmitRef = useRef(onSubmit);
  const dirtyRef = useRef(dirty);
  const confirmCloseRef = useRef(false);
  const requestCloseRef = useRef<() => void>(() => {});

  const requestClose = () => {
    if (submittingRef.current) return;
    if (dirtyRef.current) {
      setConfirmClose(true);
      return;
    }
    onOpenChange(false);
  };

  useEffect(() => {
    submittingRef.current = submitting;
    submitDisabledRef.current = submitDisabled || loading || Boolean(error);
    onSubmitRef.current = onSubmit;
    dirtyRef.current = dirty;
    confirmCloseRef.current = confirmClose;
    requestCloseRef.current = requestClose;
  });

  const runSubmit = () => {
    if (confirmCloseRef.current || submittingRef.current || submitDisabledRef.current) return;
    onSubmitRef.current();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (confirmCloseRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        requestCloseRef.current();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        if (confirmCloseRef.current) return;
        event.preventDefault();
        runSubmit();
      }
    };
    window.addEventListener("keydown", onKey, true);
    const frame = requestAnimationFrame(() => {
      const root = contentRef.current;
      const first = root?.querySelector<HTMLElement>(
        "input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled]), button[role='combobox']:not([disabled]), select:not([disabled])",
      );
      first?.focus();
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘↵" : "Ctrl+Enter";

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next, eventDetails) => {
          if (next) {
            setConfirmClose(false);
            onOpenChange(true);
            return;
          }
          eventDetails.cancel();
          requestClose();
        }}
      >
        <DialogContent
          className={cn(
            "flex! max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md",
            SIZE_CLASS[size],
          )}
        >
          <form
            id={formId}
            ref={contentRef}
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
              event.preventDefault();
              runSubmit();
            }}
          >
          <DialogHeader className="shrink-0 gap-1 border-b bg-background px-5 py-4 text-left">
            {kicker ? <p className="text-xs text-muted-foreground">{kicker}</p> : null}
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription className={description ? undefined : "sr-only"}>
              {description ?? title}
            </DialogDescription>
            {header ? <div className="pt-2">{header}</div> : null}
          </DialogHeader>
          {panel ? (
            <div className="flex shrink-0 items-center gap-1 border-b bg-muted/60 px-5 py-2">{panel}</div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
            {loading ? <LogisticsLoading /> : error ? <LogisticsError message={error} /> : children}
          </div>
          {serverError ? (
            <p role="alert" className="shrink-0 border-t bg-destructive/5 px-5 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}
          <DialogFooter
            className={cn(
              "mx-0 mb-0 shrink-0 flex-row items-center gap-3 rounded-none border-t bg-background px-5 py-3 sm:flex-row",
              dismissLabel ? "justify-end sm:justify-end" : "justify-between sm:justify-between",
            )}
          >
            {dismissLabel ? null : (
              <div className="min-w-0 text-left text-sm">
                {submitDisabled && disabledReason ? (
                  <div className="font-medium">
                    {typeof footerSummary === "string" && footerSummary
                      ? `${footerSummary} · ${disabledReason.charAt(0).toLowerCase()}${disabledReason.slice(1)}`
                      : footerSummary ?? disabledReason}
                  </div>
                ) : (
                  <>
                    <div className="font-medium">{footerSummary}</div>
                    <p className="text-xs text-muted-foreground">{shortcut} отправить</p>
                  </>
                )}
              </div>
            )}
            <div className="flex shrink-0 gap-2">
              {dismissLabel ? (
                <Button type="button" variant="outline" disabled={submitting} onClick={requestClose}>
                  {dismissLabel}
                </Button>
              ) : null}
              <Button type="submit" disabled={submitDisabled || submitting || loading}>
                {submitting ? pendingLabel : submitLabel}
              </Button>
            </div>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{DIRTY_CLOSE_PROMPT}</AlertDialogTitle>
            <AlertDialogDescription>Введённые данные не сохранятся.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Остаться</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Закрыть
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
