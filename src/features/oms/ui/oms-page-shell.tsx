// english-ui:ignore-file
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
import { OMS_PATHS } from "@/features/oms/oms-paths";
import { STORE_PRODUCTS_PATH } from "@/features/store/store-paths";

type Crumb = {
  label: string;
  href?: string;
};

type OmsPageShellProps = {
  crumbs: Crumb[];
  children: ReactNode;
  /** Middle breadcrumb. Directories pass null: they belong to the store, not OMS. */
  section?: { href: string; label: string } | null;
};

export const OmsPageShell = ({
  crumbs,
  children,
  section = { href: OMS_PATHS.stock, label: "OMS" },
}: OmsPageShellProps) => (
  <main className="min-h-screen bg-muted/30">
    <section className="p-4">
      <div className="flex w-full flex-col gap-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={STORE_PRODUCTS_PATH} aria-label="Открыть Магазин" />}>
                Магазин
              </BreadcrumbLink>
            </BreadcrumbItem>
            {section ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink render={<Link href={section.href} aria-label={`Открыть ${section.label}`} />}>
                    {section.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
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
