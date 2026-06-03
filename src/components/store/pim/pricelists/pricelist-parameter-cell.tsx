"use client";

import { Info, RotateCcw } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { cn } from "@/lib/utils";
import type { CollabUser } from "./collab/collab-config";
import { PRICE_AMOUNT_TYPOGRAPHY } from "./pricelists-helpers";
import { formatParameterValue } from "./pricelists-parameters";
import {
  PricelistParameterValueDialog,
  type ParameterValueDebugInfo,
} from "./pricelist-parameter-value-dialog";

type PricelistParameterCellProps = {
  value: number;
  isOverridden: boolean;
  baseValue: number;
  parameterLabel: string;
  productName: string;
  editors: CollabUser[];
  ariaLabel: string;
  onEditingChange: (editing: boolean) => void;
  onSetOverride: (value: number) => void;
  onClearOverride: () => void;
};

export const PricelistParameterCell = ({
  value,
  isOverridden,
  baseValue,
  parameterLabel,
  productName,
  editors,
  ariaLabel,
  onEditingChange,
  onSetOverride,
  onClearOverride,
}: PricelistParameterCellProps) => {
  const activeEditor = editors[0] ?? null;
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState<string>(() => String(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [isDebugOpen, setDebugOpen] = useState(false);

  const isComputed = !isOverridden;
  const debugInfo: ParameterValueDebugInfo = {
    parameterLabel,
    productName,
    value,
    baseValue,
  };

  // Reflect external updates (base change, remote edits) while not editing by
  // adjusting state during render rather than in an effect.
  if (!focused && value !== syncedValue) {
    setSyncedValue(value);
    setDraft(String(value));
  }

  const commit = (text: string) => {
    if (text.trim() === "") {
      onClearOverride();
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) {
      return;
    }
    // Matching the base value means the cell should keep inheriting it.
    if (parsed === baseValue) {
      onClearOverride();
    } else {
      onSetOverride(parsed);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value: text } = event.target;
    setDraft(text);
    if (text.trim() !== "") {
      commit(text);
    }
  };

  const handleReset = () => {
    onClearOverride();
    setFocused(false);
    onEditingChange(false);
  };

  return (
    <div
      className={cn(
        "group/parameter relative flex h-7 items-center rounded-lg border bg-background transition-colors focus-within:border-ring",
        activeEditor
          ? "border-transparent"
          : isOverridden
            ? "border-amber-300 bg-amber-50/70"
            : "border-input",
      )}
      style={activeEditor ? { boxShadow: `0 0 0 2px ${activeEditor.color}` } : undefined}
      title={isOverridden ? `Overridden · base ${formatParameterValue(baseValue)}` : undefined}
    >
      {activeEditor ? (
        <span
          className="absolute -top-2 left-2 z-10 rounded-sm px-1 text-[10px] leading-tight font-medium text-white"
          style={{ backgroundColor: activeEditor.color }}
        >
          {activeEditor.name}
        </span>
      ) : isOverridden ? (
        <span
          className="absolute -top-1 -left-1 size-2 rounded-full bg-amber-500 ring-2 ring-background"
          aria-hidden
        />
      ) : null}

      <input
        type="number"
        inputMode="decimal"
        step={1}
        value={draft}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
          onEditingChange(true);
        }}
        onBlur={() => {
          setFocused(false);
          onEditingChange(false);
          commit(draft);
        }}
        aria-label={ariaLabel}
        className={cn(
          "h-7 w-full min-w-0 flex-1 rounded-l-lg bg-transparent px-2 py-1 text-left outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          PRICE_AMOUNT_TYPOGRAPHY,
          isOverridden ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      />

      <span className="relative flex h-7 w-6 shrink-0 items-center select-none">
        {isOverridden ? (
          <button
            type="button"
            onClick={handleReset}
            aria-label={`Reset ${ariaLabel} to base value`}
            title="Reset to base value"
            className="absolute inset-y-0 right-1 my-auto flex size-5 items-center justify-center rounded text-amber-600 opacity-0 transition-opacity group-hover/parameter:opacity-100 hover:bg-amber-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <RotateCcw className="size-3" aria-hidden />
          </button>
        ) : null}
        {isComputed ? (
          <button
            type="button"
            onClick={() => setDebugOpen(true)}
            aria-label={`Show how ${ariaLabel} was calculated`}
            title="Value details"
            className="absolute inset-y-0 right-1 my-auto flex size-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity group-hover/parameter:opacity-100 hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <Info className="size-3" aria-hidden />
          </button>
        ) : null}
      </span>

      {isComputed ? (
        <PricelistParameterValueDialog
          open={isDebugOpen}
          onOpenChange={setDebugOpen}
          info={debugInfo}
        />
      ) : null}
    </div>
  );
};
