"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isRequestClosed } from "@/features/tracker/requests/my-requests";
import { MY_REQUESTS_HREF, REQUESTS_BASE_HREF } from "@/features/tracker/requests/requests-routes";
import { useRequestsStore } from "@/features/tracker/requests/requests-store";
import { cn } from "@/lib/utils";

type RequestsView = "catalog" | "my";

type RequestsToolbarProps = {
  view: RequestsView;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  };
  /** Second row under the divider, e.g. status filters. */
  children?: ReactNode;
};

const ViewLink = ({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) => (
  <Link
    href={href}
    aria-current={active ? "page" : undefined}
    className={cn(
      "inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition-colors",
      active
        ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-foreground/10"
        : "text-muted-foreground hover:text-foreground",
    )}
  >
    {children}
  </Link>
);

export const RequestsToolbar = ({ view, search, children }: RequestsToolbarProps) => {
  const { requests } = useRequestsStore();
  const activeCount = requests.filter((request) => !isRequestClosed(request)).length;

  return (
    <Card size="sm" className="ring-1 ring-[var(--corportal-border-grey)]">
      <CardHeader className="gap-0 space-y-3 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-lg font-semibold text-foreground">Заявки</h1>
            <nav aria-label="Разделы заявок" className="inline-flex rounded-lg bg-muted p-0.5">
              <ViewLink href={REQUESTS_BASE_HREF} active={view === "catalog"}>
                Каталог
              </ViewLink>
              <ViewLink href={MY_REQUESTS_HREF} active={view === "my"}>
                Мои заявки
                <span className="text-xs text-muted-foreground tabular-nums">{activeCount}</span>
              </ViewLink>
            </nav>
          </div>

          {search ? (
            <div className="relative w-full sm:w-80">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={search.value}
                onChange={(event) => search.onChange(event.target.value)}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className="pl-8"
              />
            </div>
          ) : null}
        </div>

        {children ? (
          <>
            <div className="-mx-3 border-t border-[var(--corportal-border-grey)]" aria-hidden />
            {children}
          </>
        ) : null}
      </CardHeader>
    </Card>
  );
};
