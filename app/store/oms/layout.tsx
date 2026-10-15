import { Suspense, type ReactNode } from "react";

// OMS screens read search params / live Supabase data — do not SSG them on
// the shared Dokploy host (static generation with 7 workers spikes RAM hard).
export const dynamic = "force-dynamic";

type StoreOmsLayoutProps = {
  children: ReactNode;
};

const StoreOmsLayout = ({ children }: StoreOmsLayoutProps) => (
  <Suspense fallback={null}>{children}</Suspense>
);

export default StoreOmsLayout;
