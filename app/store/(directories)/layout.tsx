import { Suspense, type ReactNode } from "react";

// Directory screens read live Supabase data — do not SSG them on the shared Dokploy host.
export const dynamic = "force-dynamic";

type StoreDirectoriesLayoutProps = {
  children: ReactNode;
};

const StoreDirectoriesLayout = ({ children }: StoreDirectoriesLayoutProps) => (
  <Suspense fallback={null}>{children}</Suspense>
);

export default StoreDirectoriesLayout;
