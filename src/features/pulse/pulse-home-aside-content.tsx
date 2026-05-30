"use client";

import { ModuleSubnav } from "@/components/layout/module-subnav";
import { Separator } from "@/components/ui/separator";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";
import { PulseQuickLinksSection } from "@/features/pulse/quick-links/pulse-quick-links-section";
import { usePulseQuickLinks } from "@/features/pulse/quick-links/use-pulse-quick-links";

type PulseHomeAsideContentProps = {
  onItemClick?: () => void;
};

export const PulseHomeAsideContent = ({ onItemClick }: PulseHomeAsideContentProps) => {
  const { links, isLoading, addLink, updateLink, removeLink, reorderLinks } = usePulseQuickLinks();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <ModuleSubnav
        items={PULSE_SUBNAV_ITEMS}
        navAriaLabel="Pulse sections"
        onItemClick={onItemClick}
        className="flex-none"
      />

      <Separator />

      <PulseQuickLinksSection
        links={links}
        isLoading={isLoading}
        onAddLink={addLink}
        onUpdateLink={updateLink}
        onRemoveLink={removeLink}
        onReorderLinks={reorderLinks}
        onItemClick={onItemClick}
      />
    </div>
  );
};
