// english-ui:ignore-file
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelDocument } from "@/features/logistics/logistics-api";
import {
  type CancelGuidance,
  type CancelGuidanceAction,
} from "@/features/logistics/logistics-cancel-guidance";
import { DialogShell } from "@/features/logistics/ui/dialog-shell";
import { translateLogisticsError } from "@/features/logistics/ui/run-action";

export const DocumentCancelTrigger = ({
  guidance,
  onOpen,
}: {
  guidance: CancelGuidance;
  onOpen: () => void;
}) => {
  if (guidance.mode === "hidden") return null;
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
  kicker,
  reload,
  onFollowUp,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guidance: CancelGuidance;
  kicker?: string;
  reload: () => Promise<void>;
  onFollowUp: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
}) => {
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const startedRef = useRef(false);
  const primary = guidance.actions[0];
  const sentence = primary?.blockedReason ?? guidance.context;

  const setOpen = (next: boolean) => {
    if (next) {
      startedRef.current = false;
      setPending(false);
      setServerError(null);
    }
    onOpenChange(next);
  };

  const runPrimary = async () => {
    if (!primary?.enabled || pending || startedRef.current) return;
    if (primary.id === "confirm-cancel") {
      if (!guidance.cancelRpcKind) return;
      startedRef.current = true;
      setPending(true);
      setServerError(null);
      try {
        await cancelDocument(guidance.cancelRpcKind, guidance.documentId, guidance.cancelStatus);
        await reload();
        setOpen(false);
      } catch (caught: unknown) {
        startedRef.current = false;
        const raw = caught instanceof Error ? caught.message : "Попробуйте ещё раз.";
        setServerError(translateLogisticsError(raw));
      } finally {
        setPending(false);
      }
      return;
    }
    setOpen(false);
    onFollowUp(primary, guidance);
  };

  if (guidance.mode === "hidden") return null;

  return (
    <DialogShell
      open={open}
      onOpenChange={setOpen}
      size="sm"
      kicker={kicker}
      title={guidance.title}
      dismissLabel="Назад"
      submitLabel={primary?.label ?? "Подтвердить"}
      onSubmit={() => void runPrimary()}
      submitDisabled={!primary?.enabled}
      submitting={pending}
      pendingLabel="Отменяем…"
      serverError={serverError}
    >
      <p className="text-sm">{sentence}</p>
    </DialogShell>
  );
};

export const DocumentCancelControl = ({
  guidance,
  kicker,
  reload,
  onFollowUp,
}: {
  guidance: CancelGuidance;
  kicker?: string;
  reload: () => Promise<void>;
  onFollowUp: (action: CancelGuidanceAction, guidance: CancelGuidance) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (guidance.mode === "hidden") return null;
  return (
    <>
      <DocumentCancelTrigger guidance={guidance} onOpen={() => setOpen(true)} />
      <DocumentCancelDialog
        open={open}
        onOpenChange={setOpen}
        guidance={guidance}
        kicker={kicker}
        reload={reload}
        onFollowUp={onFollowUp}
      />
    </>
  );
};
