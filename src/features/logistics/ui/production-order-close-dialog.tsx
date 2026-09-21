// english-ui:ignore-file
"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CANCEL_GUIDANCE_PRODUCTION_CLOSE } from "@/features/logistics/logistics-cancel-guidance";

export const ProductionOrderCloseDialog = ({
  open,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) => {
  const backRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      disablePointerDismissal={pending}
      onOpenChange={(next) => {
        if (pending) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md" initialFocus={backRef} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Закрыть заказ?</DialogTitle>
          <DialogDescription>{CANCEL_GUIDANCE_PRODUCTION_CLOSE}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter className="gap-2 sm:justify-start">
          <Button
            ref={backRef}
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Вернуться
          </Button>
          <Button type="button" disabled={pending} aria-busy={pending || undefined} onClick={onConfirm}>
            Закрыть заказ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
