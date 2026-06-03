"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatParameterValue } from "./pricelists-parameters";

export type ParameterValueDebugInfo = {
  parameterLabel: string;
  productName: string;
  value: number;
  baseValue: number;
};

type PricelistParameterValueDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: ParameterValueDebugInfo | null;
};

const DetailRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-0.5 text-sm">
    <dt className="text-muted-foreground">{label}</dt>
    <dd className="min-w-0 font-medium text-foreground">{children}</dd>
  </div>
);

export const PricelistParameterValueDialog = ({
  open,
  onOpenChange,
  info,
}: PricelistParameterValueDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Value details</DialogTitle>
        <DialogDescription>
          How this parameter value was resolved. Formula debugging will appear here when
          expressions are enabled.
        </DialogDescription>
      </DialogHeader>

      {info ? (
        <dl className="grid gap-2.5">
          <DetailRow label="Parameter">{info.parameterLabel}</DetailRow>
          <DetailRow label="Product">{info.productName}</DetailRow>
          <DetailRow label="Resolved value">{formatParameterValue(info.value)}</DetailRow>
          <DetailRow label="Column base">{formatParameterValue(info.baseValue)}</DetailRow>
          <DetailRow label="Source">Inherited from column base</DetailRow>
          <DetailRow label="Formula">
            <span className="font-normal text-muted-foreground">Not configured</span>
          </DetailRow>
        </dl>
      ) : null}
    </DialogContent>
  </Dialog>
);
