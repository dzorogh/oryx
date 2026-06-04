"use client";

import { useEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PricelistsCollab } from "./collab/use-yjs-pricelists";
import {
  computeTargetHash,
  isComputedReady,
  type RecalcDeps,
} from "./pricelist-recalc";
import { PRICE_USD_DISPLAY_CLASS } from "./pricelists-helpers";

export type DerivedState = { loading: boolean; value: number | null };

/**
 * Reads a backend-computed value from the shared cache. When the cache is
 * missing or stale for the current inputs, it asks the backend to recompute and
 * reports `loading` until a fresh result lands — so every client shows the same
 * loading state and then the same value.
 */
export const useDerivedTarget = (
  collab: PricelistsCollab,
  targetId: string,
  deps: RecalcDeps,
  enabled = true,
): DerivedState => {
  const hash = computeTargetHash(targetId, deps);
  const entry = collab.getComputed(targetId);
  const ready = isComputedReady(entry, hash);
  const lastRequestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || ready) {
      return;
    }
    // Only enqueue once per input hash; the leader clears the request when done.
    if (lastRequestedRef.current === hash) {
      return;
    }
    lastRequestedRef.current = hash;
    collab.requestCompute(targetId, hash);
  }, [collab, targetId, hash, ready, enabled]);

  return { loading: enabled ? !ready : false, value: ready ? (entry?.value ?? null) : null };
};

type DerivedValueCellProps = {
  collab: PricelistsCollab;
  deps: RecalcDeps;
  targetId: string;
  format: (value: number | null) => string;
  className?: string;
  skeletonClassName?: string;
};

/** Read-only derived value (USD / markup) that shows a skeleton while computing. */
export const DerivedValueCell = ({
  collab,
  deps,
  targetId,
  format,
  className,
  skeletonClassName,
}: DerivedValueCellProps) => {
  const { loading, value } = useDerivedTarget(collab, targetId, deps);

  if (loading) {
    return <Skeleton className={cn("h-4 w-14", skeletonClassName)} />;
  }

  return <span className={className ?? PRICE_USD_DISPLAY_CLASS}>{format(value)}</span>;
};
