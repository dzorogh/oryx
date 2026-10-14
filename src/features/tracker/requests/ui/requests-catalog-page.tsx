"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { getRequestForm } from "@/features/tracker/requests/request-forms";
import {
  REQUEST_CATALOG,
  resolveCatalogSelection,
  searchRequestTypes,
  type RequestTypeLocation,
} from "@/features/tracker/requests/requests-catalog";
import { catalogHref, requestFormHref } from "@/features/tracker/requests/requests-routes";
import { RequestSectionIcon } from "@/features/tracker/requests/ui/request-section-icon";
import { RequestsPageShell } from "@/features/tracker/requests/ui/requests-page-shell";
import { RequestsToolbar } from "@/features/tracker/requests/ui/requests-toolbar";
import { formatCount } from "@/features/tracker/requests/ui/format-count";
import { cn } from "@/lib/utils";

const RequestTypeCard = ({ location, showPath }: { location: RequestTypeLocation; showPath?: boolean }) => {
  const { section, subsection, type } = location;
  const fieldsCount = getRequestForm(type.id).length;

  return (
    <Link
      href={requestFormHref(type.id)}
      className="group flex min-h-32 flex-col gap-2 rounded-xl bg-card p-4 ring-1 ring-[var(--corportal-border-grey)] transition-shadow hover:shadow-md hover:ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {showPath ? (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RequestSectionIcon section={section} size="sm" className="size-5" />
          {section.name} · {subsection.name}
        </span>
      ) : null}
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{type.name}</span>
        <ArrowUpRight
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      </span>
      <span className="flex-1 text-[13px] text-muted-foreground">{type.description}</span>
      <span className="flex flex-wrap gap-1.5">
        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
          <Clock aria-hidden className="size-3" />
          {subsection.sla}
        </span>
        <span className="inline-flex h-6 items-center rounded-full bg-muted/60 px-2 text-xs text-muted-foreground">
          {formatCount(fieldsCount, ["поле", "поля", "полей"])}
        </span>
      </span>
    </Link>
  );
};

const TYPE_GRID = "grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3";

export const RequestsCatalogPage = () => {
  const searchParams = useSearchParams();
  const { section, subsection } = resolveCatalogSelection(searchParams.get("section"), searchParams.get("sub"));
  const [query, setQuery] = useState("");
  const results = searchRequestTypes(query);
  const isSearching = query.trim() !== "";

  return (
    <RequestsPageShell breadcrumbs={[{ label: "Каталог" }]}>
      <RequestsToolbar
        view="catalog"
        search={{ value: query, onChange: setQuery, placeholder: "Найти вид заявки" }}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[16.5rem_minmax(0,1fr)]">
        <Card size="sm" className="gap-0 p-2 ring-1 ring-[var(--corportal-border-grey)]">
          <nav aria-label="Разделы каталога заявок">
            <ul className="flex flex-col gap-0.5">
              {REQUEST_CATALOG.map((item) => {
                const expanded = item.id === section.id;
                const Chevron = expanded ? ChevronDown : ChevronRight;
                return (
                  <li key={item.id}>
                    <Link
                      href={catalogHref(item.id)}
                      aria-expanded={expanded}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <RequestSectionIcon section={item} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                      <Chevron aria-hidden className="size-4 text-muted-foreground/70" />
                    </Link>
                    {expanded ? (
                      <ul className="mt-0.5 mb-1 flex flex-col gap-0.5">
                        {item.subsections.map((child) => {
                          const active = !isSearching && child.id === subsection.id;
                          return (
                            <li key={child.id}>
                              <Link
                                href={catalogHref(item.id, child.id)}
                                aria-current={active ? "page" : undefined}
                                onClick={() => setQuery("")}
                                className={cn(
                                  "flex items-center justify-between gap-2 rounded-lg py-1.5 pr-2 pl-10 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground",
                                  active && "bg-muted font-medium text-foreground",
                                )}
                              >
                                <span className="min-w-0">{child.name}</span>
                                <span className="text-xs text-muted-foreground/70 tabular-nums">
                                  {child.types.length}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>
        </Card>

        <div className="flex min-w-0 flex-col gap-3">
          {isSearching ? (
            <>
              <p className="px-1 text-sm text-muted-foreground">
                {results.length > 0
                  ? `Найдено: ${formatCount(results.length, ["вид заявки", "вида заявок", "видов заявок"])}`
                  : "Ничего не нашлось. Попробуйте другое слово или выберите раздел слева."}
              </p>
              {results.length > 0 ? (
                <div className={TYPE_GRID}>
                  {results.map((location) => (
                    <RequestTypeCard key={location.type.id} location={location} showPath />
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Card size="sm" className="flex-row items-center gap-4 px-4 py-4 ring-1 ring-[var(--corportal-border-grey)]">
                <RequestSectionIcon section={section} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{section.name}</p>
                  <h2 className="text-base font-semibold text-foreground">{subsection.name}</h2>
                  <p className="text-[13px] text-muted-foreground">
                    {subsection.team} · обычно отвечают за {subsection.sla}
                  </p>
                </div>
              </Card>
              <div className={TYPE_GRID}>
                {subsection.types.map((type) => (
                  <RequestTypeCard key={type.id} location={{ section, subsection, type }} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </RequestsPageShell>
  );
};
