"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { LOGISTICS_PATHS, STORE_PRODUCTS_PATH } from "@/features/logistics/logistics-paths";

type Crumb = {
  label: string;
  href?: string;
};

type LogisticsPageShellProps = {
  crumbs: Crumb[];
  children: ReactNode;
};

export const LogisticsPageShell = ({ crumbs, children }: LogisticsPageShellProps) => (
  <main className="min-h-screen bg-muted/30">
    <section className="p-4">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={STORE_PRODUCTS_PATH} aria-label="Open Store" />}>
                Store
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={LOGISTICS_PATHS.stock} aria-label="Open Logistics" />}>
                Logistics
              </BreadcrumbLink>
            </BreadcrumbItem>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="contents">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {crumb.href && index < crumbs.length - 1 ? (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        {children}
      </div>
    </section>
  </main>
);
