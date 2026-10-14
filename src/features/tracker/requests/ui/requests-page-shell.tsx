"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { REQUESTS_BASE_HREF } from "@/features/tracker/requests/requests-routes";

export type RequestsBreadcrumb = { label: string; href?: string };

type RequestsPageShellProps = {
  breadcrumbs: RequestsBreadcrumb[];
  children: ReactNode;
};

export const RequestsPageShell = ({ breadcrumbs, children }: RequestsPageShellProps) => {
  const segments: RequestsBreadcrumb[] = [
    { label: "Tracker", href: "/tracker/tasks" },
    { label: "Заявки", href: REQUESTS_BASE_HREF },
    ...breadcrumbs,
  ];

  return (
    <main className="min-h-screen bg-muted/30">
      <section className="p-4">
        <div className="flex w-full flex-col gap-4">
          <Breadcrumb>
            <BreadcrumbList>
              {segments.map((segment, index) => {
                const isLast = index === segments.length - 1;
                return (
                  <Fragment key={`${segment.label}-${index}`}>
                    {index > 0 ? <BreadcrumbSeparator /> : null}
                    <BreadcrumbItem>
                      {isLast || !segment.href ? (
                        <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink render={<Link href={segment.href} />}>{segment.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
          {children}
        </div>
      </section>
    </main>
  );
};
