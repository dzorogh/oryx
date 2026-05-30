"use client";

import { HomeFilterChip } from "@/components/home/home-filter-chip";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ThanksPersonFilters } from "@/features/pulse/thanks/thanks-person-filters";
import type { ThankYouEntry } from "@/features/pulse/thanks/thanks-demo-data";

type ThanksTabId = "received" | "sent" | "all";

type ThanksTab = {
  id: ThanksTabId;
  label: string;
};

type ThanksToolbarProps = {
  tabs: ThanksTab[];
  activeTab: ThanksTabId;
  entries: ThankYouEntry[];
  getTabCount: (entries: ThankYouEntry[], tab: ThanksTabId) => number;
  onTabChange: (tabId: ThanksTabId) => void;
  senderFilterId: string;
  recipientFilterId: string;
  onSenderChange: (value: string) => void;
  onRecipientChange: (value: string) => void;
  onClearFilters: () => void;
  onOpenForm: () => void;
  isFormOpen: boolean;
};

export const ThanksToolbar = ({
  tabs,
  activeTab,
  entries,
  getTabCount,
  onTabChange,
  senderFilterId,
  recipientFilterId,
  onSenderChange,
  onRecipientChange,
  onClearFilters,
  onOpenForm,
  isFormOpen,
}: ThanksToolbarProps) => (
  <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
    <CardHeader className="gap-0 space-y-3 pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Thanks</h1>
          <p className="text-xs text-muted-foreground">
            Recognize colleagues and browse thank-yous you received or sent.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={onOpenForm}
          className="shrink-0"
          aria-haspopup="dialog"
          aria-expanded={isFormOpen}
        >
          Say thank you
        </Button>
      </div>

      <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />

      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Thank-you lists">
          {tabs.map((tab) => {
            const count = getTabCount(entries, tab.id);
            const isActive = activeTab === tab.id;
            return (
              <HomeFilterChip
                key={tab.id}
                active={isActive}
                role="tab"
                aria-selected={isActive}
                aria-controls={`thanks-panel-${tab.id}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label} ({count})
              </HomeFilterChip>
            );
          })}
        </div>

        <ThanksPersonFilters
          variant="embedded"
          senderId={senderFilterId}
          recipientId={recipientFilterId}
          onSenderChange={onSenderChange}
          onRecipientChange={onRecipientChange}
          onClear={onClearFilters}
        />
      </div>
    </CardHeader>
  </Card>
);
