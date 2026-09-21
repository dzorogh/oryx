"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type SearchTarget = {
  id: string;
  title: string;
  description: string;
  href: string;
};

const SEARCH_TARGETS: SearchTarget[] = [
  { id: "pulse-home", title: "Pulse Home", description: "Main dashboard", href: "/" },
  {
    id: "pulse-company",
    title: "Company workspace",
    description: "Company profile, documents, and BI reports",
    href: "/pulse/company",
  },
  { id: "pulse", title: "Pulse", description: "Company news, ideas and polls", href: "/pulse/ideas" },
  { id: "tracker", title: "Tracker", description: "Tasks, projects and notes", href: "/tracker/tasks" },
  { id: "crm", title: "CRM", description: "Deals, leads and contacts", href: "/crm/deals" },
  // english-ui:ignore
  { id: "store", title: "Магазин", description: "Каталог, логистика и заказы клиента", href: "/store/pim/products" },
  // english-ui:ignore
  { id: "store-orders", title: "Заказы", description: "Заказы магазина", href: "/store/orders" },
  // english-ui:ignore
  { id: "logistics", title: "Логистика", description: "Остатки, заказы клиента, заказы на производство и перемещения", href: "/store/logistics/stock" },
  // english-ui:ignore
  { id: "logistics-ledger", title: "Журнал", description: "Журнал движений остатков", href: "/store/logistics/ledger" },
  // english-ui:ignore
  { id: "logistics-regions", title: "Регионы", description: "Регионы продаж и их резерв", href: "/store/logistics/regions" },
  // english-ui:ignore
  { id: "logistics-orders", title: "Заказы клиента", description: "Спрос и исполнение", href: "/store/logistics/customer-orders" },
  { id: "learning", title: "Learning", description: "Lessons and knowledge base", href: "/learning/lessons" },
  { id: "library", title: "Library", description: "Documents and files", href: "/library/documents" },
  { id: "approvals", title: "Approvals", description: "Invoice and payment approvals", href: "/pulse/approvals/invoices" },
  { id: "analytics", title: "Analytics", description: "Stocks, reports and dashboards", href: "/analytics/stocks" },
  { id: "team", title: "Team", description: "Org structure and people", href: "/team/structure" },
  { id: "team-users", title: "Users", description: "Team members", href: "/team/users" },
  { id: "settings", title: "Settings", description: "Auth, tenants and apps", href: "/settings/auth" },
];

type GlobalSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export const GlobalSearchModal = ({ open, onClose }: GlobalSearchModalProps) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const timer = window.setTimeout(() => {
      setQuery("");
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return SEARCH_TARGETS;
    }
    return SEARCH_TARGETS.filter((target) =>
      `${target.title} ${target.description}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl"
      >
        <DialogTitle className="sr-only">Global search</DialogTitle>
        <div className="flex items-center gap-2 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2">
          <Search aria-hidden className="size-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a section, page, or action..."
            className="w-full bg-transparent text-sm text-foreground outline-none"
            aria-label="Enter a global search query"
          />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close search"
          >
            <X aria-hidden className="size-4" />
          </button>
        </div>

        <div className="mt-3 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Nothing found.</p>
          ) : (
            results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                onClick={onClose}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors hover:bg-muted"
                aria-label={`Open ${result.title}`}
              >
                <span className="text-sm font-medium text-foreground">{result.title}</span>
                <span className="text-xs text-muted-foreground">{result.description}</span>
              </Link>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
