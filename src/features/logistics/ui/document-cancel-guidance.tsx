// english-ui:ignore-file
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelDocument } from "@/features/logistics/logistics-api";
import {
  type CancelGuidance,
  type CancelGuidanceAction,
} from "@/features/logistics/logistics-cancel-guidance";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";

export const DocumentCancelTrigger = ({
  guidance,
  onOpen,
}: {
  guidance: CancelGuidance;
  onOpen: () => void;
}) => {
  if (guidance.mode === "hidden") {
    return null;
  }
  return (
    <Button type="button" size="sm" variant="outline" onClick={onOpen}>
      Отменить
    </Button>
  );
};

export const DocumentCancelDialog = ({
  open,
  onOpenChange,
  guidance,
  reload,
  onFollowUp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guidance: CancelGuidance;
  reload: () => Promise<void>;
  onFollowUp: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
}) => {
  const [pending, setPending] = useState(false);
  const startedRef = useRef(false);
  const primary = guidance.actions[0];

  const setOpen = (next: boolean) => {
    if (next) {
      startedRef.current = false;
      setPending(false);
    }
    onOpenChange(next);
  };

  const closeDialog = () => setOpen(false);

  const runPrimary = async () => {
    if (!primary?.enabled || pending || startedRef.current) {
      return;
    }
    if (primary.id === "confirm-cancel") {
      if (!guidance.cancelRpcKind) {
        return;
      }
      startedRef.current = true;
      setPending(true);
      const ok = await runLogisticsAction(
        () => cancelDocument(guidance.cancelRpcKind!, guidance.documentId, guidance.cancelStatus),
        "Документ отменён",
        reload,
      );
      if (!ok) {
        startedRef.current = false;
        setPending(false);
        return;
      }
      closeDialog();
      return;
    }
    if (
      primary.id === "mark-delivered" ||
      primary.id === "close-customer-order" ||
      primary.id === "close-production-order"
    ) {
      startedRef.current = true;
      setPending(true);
    }
    closeDialog();
    onFollowUp(primary, guidance);
  };

  if (guidance.mode === "hidden") {
    return null;
  }

  return (
    <LogisticsDialog
      open={open}
      onOpenChange={setOpen}
      title={guidance.title}
      className="sm:max-w-lg"
    >
      <div className="flex flex-col gap-3 text-sm">
        <p>{guidance.lead}</p>
        <p className="rounded-md bg-muted/60 px-3 py-2 text-muted-foreground">{guidance.example}</p>
        <p>{guidance.history}</p>
        <p>{guidance.context}</p>
        {guidance.closeEffects ? <p>{guidance.closeEffects}</p> : null}
        {primary?.blockedReason ? (
          <p className="rounded-md border border-dashed px-3 py-2 text-muted-foreground">{primary.blockedReason}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={closeDialog}>
            Закрыть
          </Button>
          {primary ? (
            <Button type="button" disabled={!primary.enabled || pending} onClick={() => void runPrimary()}>
              {primary.label}
            </Button>
          ) : null}
        </div>
      </div>
    </LogisticsDialog>
  );
};

export const DocumentCancelControl = ({
  guidance,
  reload,
  onFollowUp,
}: {
  guidance: CancelGuidance;
  reload: () => Promise<void>;
  onFollowUp: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (guidance.mode === "hidden") {
    return null;
  }
  return (
    <>
      <DocumentCancelTrigger guidance={guidance} onOpen={() => setOpen(true)} />
      <DocumentCancelDialog
        open={open}
        onOpenChange={setOpen}
        guidance={guidance}
        reload={reload}
        onFollowUp={onFollowUp}
      />
    </>
  );
};
