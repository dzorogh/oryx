"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

const VariantRedirectPage = () => {
  const params = useParams<{ variantId: string }>();
  const router = useRouter();
  const variantId = String(params.variantId ?? "");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!variantId || !isSupabaseConfigured()) {
        router.replace("/store/pim/products");
        return;
      }
      const client = getSupabaseBrowserClient();
      if (!client) {
        router.replace("/store/pim/products");
        return;
      }
      const { data, error } = await client
        .from("store_product_variant")
        .select("product_id")
        .eq("id", variantId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        router.replace("/store/pim/products");
        return;
      }
      router.replace(`/store/pim/products/${data.product_id}?variant=${variantId}`);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router, variantId]);

  return (
    <main className="min-h-screen bg-muted/30 p-4">
      <LogisticsLoading />
    </main>
  );
};

export default VariantRedirectPage;
