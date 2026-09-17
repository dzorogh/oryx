import { Suspense, type ReactNode } from "react";

// Logistics screens read search params / live Supabase data — do not SSG them on
// the shared Dokploy host (static generation with 7 workers spikes RAM hard).
export const dynamic = "force-dynamic";

type StoreLogisticsLayoutProps = {
  children: ReactNode;
};

const StoreLogisticsLayout = ({ children }: StoreLogisticsLayoutProps) => (
  <Suspense fallback={null}>{children}</Suspense>
);

export default StoreLogisticsLayout;
