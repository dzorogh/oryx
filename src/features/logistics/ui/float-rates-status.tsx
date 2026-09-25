// english-ui:ignore-file
"use client";

import { useEffect, useState } from "react";
import { fetchFloatRates, type OrderRates } from "@/features/logistics/order-money";
import { cn } from "@/lib/utils";

export type FloatRatesState =
  | { status: "loading"; rates: null }
  | { status: "ok"; rates: OrderRates }
  | { status: "failed"; rates: null };

/** Requests floatrates each time `open` turns true; the result goes to the create RPC as `p_rates`. */
export const useFloatRatesOnOpen = (open: boolean): FloatRatesState => {
  const [state, setState] = useState<FloatRatesState>({ status: "loading", rates: null });
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setState({ status: "loading", rates: null });
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchFloatRates().then((rates) => {
      if (cancelled) return;
      setState(rates ? { status: "ok", rates } : { status: "failed", rates: null });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  return state;
};

export const FloatRatesNote = ({ state, className }: { state: FloatRatesState; className?: string }) => (
  <p
    role="status"
    className={cn(
      "text-xs",
      state.status === "failed" ? "text-amber-700" : "text-muted-foreground",
      className,
    )}
  >
    {state.status === "loading"
      ? "Загружаем курсы валют…"
      : state.status === "ok"
        ? "Курсы валют на сегодня загружены — сохраним их в заказе"
        : "Курсы не загрузились — возьмём последние сохранённые"}
  </p>
);
