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
        <DialogTitle>Детали значения</DialogTitle>
        <DialogDescription>
          Как получилось это значение параметра. Отладка формулы появится здесь,
          когда выражения будут включены.
        </DialogDescription>
      </DialogHeader>

      {info ? (
        <dl className="grid gap-2.5">
          <DetailRow label="Параметр">{info.parameterLabel}</DetailRow>
          <DetailRow label="Товар">{info.productName}</DetailRow>
          <DetailRow label="Итоговое значение">{formatParameterValue(info.value)}</DetailRow>
          <DetailRow label="База колонки">{formatParameterValue(info.baseValue)}</DetailRow>
          <DetailRow label="Источник">Наследовано от базы колонки</DetailRow>
          <DetailRow label="Формула">
            <span className="font-normal text-muted-foreground">Не задана</span>
          </DetailRow>
        </dl>
      ) : null}
    </DialogContent>
  </Dialog>
);
