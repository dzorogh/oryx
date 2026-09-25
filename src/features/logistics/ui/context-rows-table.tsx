"use client";

import { Input } from "@/components/ui/input";
import {
  quantityIssue,
  type QuantityLimitMode,
} from "@/features/logistics/ui/catalog-quantity-model";
import { cn } from "@/lib/utils";

export type ContextQuantityRow = {
  key: string;
  title: string;
  subtitle?: string;
  limitLabel: string;
  /** Вторая строка ограничения, например «из 20 шт». */
  limitHint?: string;
  limit: number | null;
  unit: string;
};

const focusNext = (current: HTMLInputElement) => {
  const inputs = [...document.querySelectorAll<HTMLInputElement>("[data-qty-key]")];
  const next = inputs[inputs.indexOf(current) + 1];
  next?.focus();
  next?.select();
};

/** Таблица строк уже известного документа: одно ограничивающее число рядом с полем. */
export const ContextRowsTable = ({
  rows,
  quantities,
  onQuantityChange,
  limitMode = "hard",
  quantityHeader = "Количество",
  limitHeader = "Доступно",
  empty,
}: {
  rows: ContextQuantityRow[];
  quantities: Record<string, string>;
  onQuantityChange: (key: string, raw: string) => void;
  limitMode?: QuantityLimitMode;
  quantityHeader?: string;
  limitHeader?: string;
  empty?: string;
}) => {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {empty ?? "Нет строк"}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-3 py-2 font-medium">Товар</th>
            <th className="px-2 py-2 text-right font-medium">{limitHeader}</th>
            <th className="w-36 px-3 py-2 text-right font-medium">{quantityHeader}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const raw = quantities[row.key] ?? "";
            const issue = quantityIssue(raw, row.limit, limitMode);
            const emptyRow = !raw.trim();
            return (
              <tr key={row.key} className={cn("border-t", emptyRow && "opacity-60")}>
                <td className="px-3 py-2">
                  <div className="font-medium">{row.title}</div>
                  {row.subtitle ? <div className="text-xs text-muted-foreground">{row.subtitle}</div> : null}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  <div>{row.limitLabel}</div>
                  {row.limitHint ? <div className="text-xs text-muted-foreground">{row.limitHint}</div> : null}
                </td>
                <td className="px-3 py-2">
                  <div className="relative ml-auto w-32">
                    <Input
                      data-qty-key={row.key}
                      type="text"
                      inputMode="decimal"
                      value={raw}
                      aria-invalid={issue?.kind === "error"}
                      aria-label={`Количество ${row.title}`}
                      className={cn("h-8 pr-8 text-right", issue?.kind === "error" && "border-destructive")}
                      onChange={(event) => onQuantityChange(row.key, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.metaKey && !event.ctrlKey) {
                          event.preventDefault();
                          focusNext(event.currentTarget);
                        }
                      }}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
                      {row.unit}
                    </span>
                  </div>
                  {issue ? (
                    <p className={cn("mt-0.5 text-right text-xs", issue.kind === "error" ? "text-destructive" : "text-muted-foreground")}>
                      {issue.message}
                    </p>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
