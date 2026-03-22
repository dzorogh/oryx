"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DEFAULT_ORDER_ID, ORDER_PRESETS } from "@/domain/packing/constants";

const allowedOrderIds = new Set(ORDER_PRESETS.map((preset) => preset.orderId));

const HomeRedirectFallback = () => (
  <div className="flex min-h-screen items-center justify-center p-6 text-muted-foreground" role="status" aria-live="polite">
    Переход к заказу…
  </div>
);

const HomeRedirectInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const raw = searchParams.get("orderId");
    const parsed = Number(raw);
    if (raw !== null && Number.isFinite(parsed) && allowedOrderIds.has(parsed)) {
      router.replace(`/orders/${parsed}`);
      return;
    }
    router.replace(`/orders/${DEFAULT_ORDER_ID}`);
  }, [router, searchParams]);

  return <HomeRedirectFallback />;
};

export default function HomePage() {
  return (
    <Suspense fallback={<HomeRedirectFallback />}>
      <HomeRedirectInner />
    </Suspense>
  );
}
