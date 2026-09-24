"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import type { BarModel, SegmentTone } from "@/features/logistics/order-plan/order-plan-model";
import { cn } from "@/lib/utils";

const MINUS = "\u2212";

const hatch = (color: string, fade: string, step = 3): string =>
  `repeating-linear-gradient(135deg, ${color} 0 ${step}px, ${fade} ${step}px ${step * 2}px)`;

const TONE_STYLE: Record<SegmentTone, CSSProperties> = {
  "have-warehouse": { background: "#18181b" },
  "have-transfer": { background: "#52525b" },
  "have-output": { background: "#a1a1aa" },
  "plan-warehouse": { background: hatch("#18181b", "rgba(24,24,27,.45)") },
  "plan-transfer": { background: hatch("#52525b", "rgba(82,82,91,.45)") },
  "plan-output": { background: hatch("#a1a1aa", "rgba(161,161,170,.45)") },
  minus: { background: hatch("#dc2626", "rgba(220,38,38,.35)") },
  none: { background: "#f4f4f5", boxShadow: "inset 0 0 0 1px #d4d4d8" },
};

const OVERFLOW_STYLE: CSSProperties = { background: hatch("#d97706", "rgba(217,119,6,.35)", 2) };

export type MarkerTone =
  | "warehouse"
  | "transfer"
  | "output"
  | "plan-warehouse"
  | "plan-transfer"
  | "plan-output"
  | "production_order"
  | "none";

const MARKER_STYLE: Record<MarkerTone, CSSProperties> = {
  warehouse: TONE_STYLE["have-warehouse"],
  transfer: TONE_STYLE["have-transfer"],
  output: TONE_STYLE["have-output"],
  "plan-warehouse": TONE_STYLE["plan-warehouse"],
  "plan-transfer": TONE_STYLE["plan-transfer"],
  "plan-output": TONE_STYLE["plan-output"],
  production_order: { background: "#f4f4f5", border: "1px dashed #71717a" },
  none: TONE_STYLE.none,
};

export const Marker = ({ tone, wide = false }: { tone: MarkerTone; wide?: boolean }) => (
  <i
    aria-hidden
    className={cn("inline-block shrink-0 rounded-[2px]", wide ? "h-[9px] w-3.5" : "size-2.5")}
    style={MARKER_STYLE[tone]}
  />
);

export const formatSigned = (value: number): string =>
  value < 0 ? `${MINUS}${formatQuantity(Math.abs(value))}` : formatQuantity(value);

/** Тонкая полоса покрытия (блок «Товары») или крупная с числами (выбранный товар). */
export const CoverageBar = ({ bar, size = "thin" }: { bar: BarModel; size?: "thin" | "large" }) => {
  const total = bar.base + bar.overflow;
  const containerWidth = bar.overflow > 0 ? `${(bar.base / total) * 100}%` : "100%";
  const large = size === "large";
  return (
    <div
      className={cn("relative flex", large ? "mt-3 h-6 gap-0.5" : "mt-[7px] h-1.5 gap-px")}
      style={{ width: containerWidth }}
    >
      {bar.segments.map((segment, index) => (
        <i
          key={`${segment.tone}-${index}`}
          className={cn(
            "flex h-full min-w-0 items-center justify-center not-italic",
            large ? "rounded-[3px]" : "rounded-[2px]",
          )}
          style={{ ...TONE_STYLE[segment.tone], width: `${(segment.qty / bar.base) * 100}%` }}
        >
          {large && segment.tone !== "none" ? (
            <b
              className={cn(
                "rounded-[3px] bg-white/90 px-1.5 text-[11px] leading-[15px] font-semibold tabular-nums",
                segment.tone === "minus" ? "text-red-600" : "text-zinc-900",
              )}
            >
              {segment.tone === "minus" ? formatSigned(-segment.qty) : formatQuantity(segment.qty)}
            </b>
          ) : null}
        </i>
      ))}
      {bar.overflow > 0 ? (
        <span
          className={cn(
            "absolute top-0 flex h-full items-center justify-center",
            large ? "rounded-[3px]" : "rounded-[2px]",
          )}
          style={{
            ...OVERFLOW_STYLE,
            left: `calc(100% + ${large ? 2 : 1}px)`,
            width: `${(bar.overflow / bar.base) * 100}%`,
          }}
        >
          {large ? (
            <b className="rounded-[3px] bg-white/90 px-1.5 text-[11px] leading-[15px] font-semibold text-amber-600 tabular-nums">
              +{formatQuantity(bar.overflow)}
            </b>
          ) : null}
        </span>
      ) : null}
    </div>
  );
};

export const OwnerChip = ({ label, muted }: { label: string; muted?: boolean }) => (
  <span
    className={cn(
      "inline-flex h-5 items-center rounded-full border px-2 text-[11.5px] font-medium whitespace-nowrap",
      muted ? "border-border bg-transparent text-zinc-400" : "border-border bg-zinc-50 text-zinc-600",
    )}
  >
    {label}
  </span>
);

export const GoneChip = ({ label }: { label: string }) => (
  <span className="inline-flex h-[18px] items-center rounded border border-red-200 bg-red-50 px-1.5 align-[1px] text-[11px] font-medium text-red-600">
    {label}
  </span>
);

export const DeltaBadge = ({ value }: { value: number }) => (
  <span className="inline-flex h-[18px] items-center rounded bg-red-600 px-[5px] text-[11px] font-semibold text-white tabular-nums">
    {formatSigned(-value)}
  </span>
);

export const ProblemDot = ({ tone }: { tone: "red" | "amber" }) => (
  <i aria-hidden className={cn("inline-block size-[7px] shrink-0 rounded-full", tone === "red" ? "bg-red-600" : "bg-amber-600")} />
);

const parseQuantity = (raw: string): number | null => {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") {
    return 0;
  }
  const value = Number(trimmed);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
};

const COMMIT_DELAY_MS = 700;

/**
 * Поле количества с автосохранением: ввод сохраняется после паузы, на blur и Enter.
 * После ответа поле показывает серверное значение (при ошибке — прежнее).
 */
export const PlanQuantityInput = ({
  value,
  onCommit,
  disabled,
  invalid,
  add,
  ariaLabel,
}: {
  value: number;
  onCommit: (quantity: number) => Promise<void>;
  disabled?: boolean;
  invalid?: boolean;
  add?: boolean;
  ariaLabel: string;
}) => {
  const [draft, setDraft] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const version = useRef(0);
  const [focused, setFocused] = useState(false);

  useEffect(() => () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
  }, []);

  const commit = (raw: string) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const quantity = parseQuantity(raw);
    if (quantity == null || Math.abs(quantity - value) < 1e-9) {
      setDraft(null);
      return;
    }
    const mine = ++version.current;
    void onCommit(quantity).finally(() => {
      if (version.current === mine) {
        setDraft(null);
      }
    });
  };

  const shown = draft ?? (value > 0 ? formatQuantity(value) : "");
  const dim = disabled || (!focused && draft == null && value <= 0);

  return (
    <span className="relative inline-flex">
      {add ? (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[13px] font-medium",
            dim ? "text-zinc-400" : "text-zinc-500",
          )}
        >
          +
        </span>
      ) : null}
      <input
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        value={shown}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          const next = event.target.value;
          if (!/^[0-9]*[.,]?[0-9]{0,2}$/.test(next)) {
            return;
          }
          setDraft(next);
          if (timer.current) {
            clearTimeout(timer.current);
          }
          timer.current = setTimeout(() => commit(next), COMMIT_DELAY_MS);
        }}
        onBlur={() => {
          setFocused(false);
          if (draft != null) {
            commit(draft);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && draft != null) {
            commit(draft);
          }
          if (event.key === "Escape") {
            if (timer.current) {
              clearTimeout(timer.current);
            }
            setDraft(null);
          }
        }}
        className={cn(
          "h-7 w-14 rounded-md border bg-white px-2 text-right text-[13px] font-semibold tabular-nums outline-none transition-shadow",
          add && "w-[60px] pl-5",
          "border-zinc-300 focus:border-zinc-900 focus:ring-3 focus:ring-zinc-900/10",
          dim && "border-[#ececee] bg-zinc-100",
          disabled && "cursor-not-allowed text-zinc-400",
          invalid && "border-red-600 text-red-600 ring-2 ring-red-600/12",
        )}
      />
    </span>
  );
};
