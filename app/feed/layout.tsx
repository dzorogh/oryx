import type { ReactNode } from "react";
import { ModuleShell } from "@/components/layout/module-shell";
import { FEED_SUBNAV_ITEMS } from "@/features/feed/feed-nav";

type FeedLayoutProps = {
  children: ReactNode;
};

const FeedLayout = ({ children }: FeedLayoutProps) => (
  <ModuleShell
    moduleTitle="Pulse"
    asideLabel="Pulse"
    subnavItems={FEED_SUBNAV_ITEMS}
    subnavAriaLabel="Pulse sections"
  >
    {children}
  </ModuleShell>
);

export default FeedLayout;
