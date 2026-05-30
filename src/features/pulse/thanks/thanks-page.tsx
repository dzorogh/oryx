"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HandHeart } from "lucide-react";
import { buildPaginationItems } from "@/lib/pagination";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThankYouEntryCard } from "@/features/pulse/thanks/thanks-entry-card";
import {
  THANK_YOU_ENTRIES,
  THANKS_CURRENT_USER_ID,
  THANKS_PAGE_SIZE,
  type ThankYouEntry,
} from "@/features/pulse/thanks/thanks-demo-data";
import { ThanksListFooter } from "@/features/pulse/thanks/thanks-list-footer";
import { THANKS_FILTER_ALL } from "@/features/pulse/thanks/thanks-person-filters";
import { ThanksToolbar } from "@/features/pulse/thanks/thanks-toolbar";
import { ThanksForm } from "@/features/pulse/thanks/thanks-form";
import { cn } from "@/lib/utils";

type ThanksTabId = "received" | "sent" | "all";

type ThanksTab = {
  id: ThanksTabId;
  label: string;
};

// TODO: hide "All" tab when !isAdmin once auth is wired.
const THANKS_TABS: ThanksTab[] = [
  { id: "received", label: "Received" },
  { id: "sent", label: "Sent" },
  { id: "all", label: "All" },
];

const filterEntriesByTab = (entries: ThankYouEntry[], tab: ThanksTabId): ThankYouEntry[] => {
  if (tab === "received") {
    return entries.filter((entry) => entry.recipientId === THANKS_CURRENT_USER_ID);
  }
  if (tab === "sent") {
    return entries.filter((entry) => entry.senderId === THANKS_CURRENT_USER_ID);
  }
  return entries;
};

const applyPersonFilters = (
  entries: ThankYouEntry[],
  senderId: string,
  recipientId: string,
): ThankYouEntry[] => {
  let result = entries;
  if (senderId !== THANKS_FILTER_ALL) {
    result = result.filter((entry) => entry.senderId === senderId);
  }
  if (recipientId !== THANKS_FILTER_ALL) {
    result = result.filter((entry) => entry.recipientId === recipientId);
  }
  return result;
};

const getTabCount = (entries: ThankYouEntry[], tab: ThanksTabId) =>
  filterEntriesByTab(entries, tab).length;

const EMPTY_COPY: Record<ThanksTabId, { title: string; description: string }> = {
  received: {
    title: "No thank-yous yet",
    description: "When colleagues thank you, their messages will appear here.",
  },
  sent: {
    title: "Nothing sent yet",
    description: "Send your first thank-you to recognize a colleague.",
  },
  all: {
    title: "No thank-yous in the feed",
    description: "Company-wide thank-yous will show up here as they are sent.",
  },
};

const FILTERED_EMPTY_COPY: Record<ThanksTabId, { title: string; description: string }> = {
  received: {
    title: "No matches",
    description: "Try different From or To filters, or clear filters to see all received thank-yous.",
  },
  sent: {
    title: "No matches",
    description: "Try different From or To filters, or clear filters to see all sent thank-yous.",
  },
  all: {
    title: "No matches",
    description: "Try different From or To filters, or clear filters to see the full company feed.",
  },
};

export const ThanksPage = () => {
  const [activeTab, setActiveTab] = useState<ThanksTabId>("received");
  const [entries, setEntries] = useState<ThankYouEntry[]>(THANK_YOU_ENTRIES);
  const [currentPage, setCurrentPage] = useState(1);
  const [senderFilterId, setSenderFilterId] = useState(THANKS_FILTER_ALL);
  const [recipientFilterId, setRecipientFilterId] = useState(THANKS_FILTER_ALL);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const tabEntries = useMemo(
    () => filterEntriesByTab(entries, activeTab),
    [entries, activeTab],
  );

  const filteredEntries = useMemo(
    () => applyPersonFilters(tabEntries, senderFilterId, recipientFilterId),
    [tabEntries, senderFilterId, recipientFilterId],
  );

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / THANKS_PAGE_SIZE));
  const visiblePage = Math.min(currentPage, totalPages);

  const paginatedEntries = useMemo(
    () =>
      filteredEntries.slice(
        (visiblePage - 1) * THANKS_PAGE_SIZE,
        visiblePage * THANKS_PAGE_SIZE,
      ),
    [filteredEntries, visiblePage],
  );

  const paginationItems = useMemo(
    () => buildPaginationItems(visiblePage, totalPages),
    [visiblePage, totalPages],
  );

  const handleTabChange = (tabId: ThanksTabId) => {
    setActiveTab(tabId);
    setCurrentPage(1);
    setSenderFilterId(THANKS_FILTER_ALL);
    setRecipientFilterId(THANKS_FILTER_ALL);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSenderFilterChange = (value: string) => {
    setSenderFilterId(value);
    setCurrentPage(1);
  };

  const handleRecipientFilterChange = (value: string) => {
    setRecipientFilterId(value);
    setCurrentPage(1);
  };

  const handleClearPersonFilters = () => {
    setSenderFilterId(THANKS_FILTER_ALL);
    setRecipientFilterId(THANKS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleFormOpenChange = (open: boolean) => {
    setIsFormOpen(open);
  };

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleSent = (entry: ThankYouEntry) => {
    setEntries((current) => [entry, ...current]);
    setActiveTab("sent");
    setCurrentPage(1);
    setIsFormOpen(false);
  };

  const isTabEmpty = tabEntries.length === 0;
  const isFilterEmpty = !isTabEmpty && filteredEntries.length === 0;
  const emptyCopy = isFilterEmpty ? FILTERED_EMPTY_COPY[activeTab] : EMPTY_COPY[activeTab];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="flex w-full flex-col gap-4 p-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <Link
                href="/"
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                Home
              </Link>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Thanks</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <ThanksToolbar
          tabs={THANKS_TABS}
          activeTab={activeTab}
          entries={entries}
          getTabCount={getTabCount}
          onTabChange={handleTabChange}
          senderFilterId={senderFilterId}
          recipientFilterId={recipientFilterId}
          onSenderChange={handleSenderFilterChange}
          onRecipientChange={handleRecipientFilterChange}
          onClearFilters={handleClearPersonFilters}
          onOpenForm={handleOpenForm}
          isFormOpen={isFormOpen}
        />

      <section
        id={`thanks-panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${activeTab} thank-yous`}
      >
        <ul
          className={cn(
            "grid grid-cols-1 gap-3",
            activeTab !== "all" && "md:grid-cols-2 xl:grid-cols-3",
          )}
          aria-label={`${activeTab} thank-you messages`}
        >
          {filteredEntries.length === 0 ? (
            <li
              className={cn(
                "min-w-0 list-none",
                activeTab !== "all" && "md:col-span-2 xl:col-span-3",
                "flex flex-col items-center gap-4 rounded-xl border border-dashed border-[var(--corportal-border-grey)] bg-muted/30 px-6 py-12 text-center",
              )}
            >
              <HandHeart
                className="size-8 text-muted-foreground/60"
                strokeWidth={1.5}
                aria-hidden
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{emptyCopy.title}</p>
                <p className="max-w-sm text-sm text-muted-foreground">{emptyCopy.description}</p>
              </div>
              {isFilterEmpty ? (
                <Button type="button" variant="outline" onClick={handleClearPersonFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={handleOpenForm}>
                  Say thank you
                </Button>
              )}
            </li>
          ) : (
            paginatedEntries.map((entry) => (
              <li key={entry.id} className="min-w-0">
                <ThankYouEntryCard entry={entry} variant={activeTab} className="h-full" />
              </li>
            ))
          )}
        </ul>

        {filteredEntries.length > 0 ? (
          <ThanksListFooter
            shownCount={paginatedEntries.length}
            totalCount={filteredEntries.length}
            visiblePage={visiblePage}
            totalPages={totalPages}
            paginationItems={paginationItems}
            onPageChange={handlePageChange}
          />
        ) : null}
      </section>

      <Sheet open={isFormOpen} onOpenChange={handleFormOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Say thank you</SheetTitle>
            <SheetDescription>
              Choose a colleague and write a short thank-you message.
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ThanksForm
              key={isFormOpen ? "thanks-sheet-open" : "thanks-sheet-closed"}
              idPrefix="thanks-sheet"
              onSent={handleSent}
            />
          </div>
        </SheetContent>
      </Sheet>
      </div>
    </div>
  );
};
