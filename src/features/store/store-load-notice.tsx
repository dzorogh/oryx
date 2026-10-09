"use client";

import { Button } from "@/components/ui/button";

export const StoreInlineRetry = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
    <p>{message}</p>
    {onRetry ? (
      <Button type="button" size="sm" variant="outline" onClick={onRetry}>
        Повторить
      </Button>
    ) : null}
  </div>
);
