"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Globe, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { TenantLogo } from "@/components/layout/tenant-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPANY_INLINE_ICON_CLASS } from "./company-icon-styles";
import type { CompanyProfile } from "./company-cabinet-demo-data";

type CompanyCabinetHeroProps = {
  company: CompanyProfile;
  canEdit: boolean;
};

type ContactChipProps = {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
};

const ContactChip = ({ href, label, icon, external }: ContactChipProps) => (
  <Link
    href={href}
    className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[var(--corportal-border-grey)] bg-background/80 px-2.5 py-1 text-xs text-foreground backdrop-blur-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    aria-label={label}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
  >
    <span className={COMPANY_INLINE_ICON_CLASS} aria-hidden>
      {icon}
    </span>
    <span className="truncate">{label}</span>
  </Link>
);

export const CompanyCabinetHero = ({ company, canEdit }: CompanyCabinetHeroProps) => {
  const contactChips: ContactChipProps[] = [];

  if (company.website) {
    contactChips.push({
      href: company.website,
      label: company.website.replace(/^https?:\/\//, ""),
      icon: <Globe className={COMPANY_INLINE_ICON_CLASS} />,
      external: true,
    });
  }
  if (company.email) {
    contactChips.push({
      href: `mailto:${company.email}`,
      label: company.email,
      icon: <Mail className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }
  if (company.phone) {
    contactChips.push({
      href: `tel:${company.phone.replace(/\s/g, "")}`,
      label: company.phone,
      icon: <Phone className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }
  if (company.address) {
    contactChips.push({
      href: "#company-address",
      label: company.address,
      icon: <MapPin className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }

  return (
    <Card
      size="sm"
      className="relative overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 size-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/25" />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-3 p-3 sm:p-3.5">
        <div className="flex min-w-0 items-start gap-3">
          {company.logoUrl ? (
            <TenantLogo
              src={company.logoUrl}
              alt={`${company.displayName} logo`}
              className="size-10 rounded-lg ring-1 ring-[var(--corportal-border-grey)]"
            />
          ) : null}
          <div className="min-w-0 space-y-0.5">
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
              {company.displayName}
            </h1>
            {company.description ? (
              <p className="line-clamp-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {company.description}
              </p>
            ) : null}
          </div>
        </div>

        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 bg-background/80 backdrop-blur-sm"
            nativeButton={false}
            render={
              <Link href="/settings/companies" aria-label={`Edit ${company.displayName}`} />
            }
          >
            <Pencil aria-hidden className={COMPANY_INLINE_ICON_CLASS} />
            Edit
          </Button>
        ) : null}
      </div>

      {contactChips.length > 0 ? (
        <div className="relative flex flex-wrap gap-1.5 border-t border-[var(--corportal-border-grey)]/80 px-3 py-2 sm:px-3.5">
          {contactChips.map((chip) => (
            <ContactChip key={chip.label} {...chip} />
          ))}
        </div>
      ) : null}
    </Card>
  );
};
