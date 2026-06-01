"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Globe, Mail, MapPin, Pencil, Phone } from "lucide-react";
import { TenantLogo } from "@/components/layout/tenant-logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatOptionalDate, formatOptionalText } from "./company-cabinet-format";
import { COMPANY_INLINE_ICON_CLASS } from "./company-icon-styles";
import type { CompanyProfile } from "./company-cabinet-demo-data";

type CompanyCabinetHeroProps = {
  company: CompanyProfile;
  canEdit: boolean;
};

type ContactLinkProps = {
  href: string;
  label: string;
  icon: ReactNode;
  external?: boolean;
};

type BasicInfoFieldProps = {
  label: string;
  value: string;
};

const BasicInfoField = ({ label, value }: BasicInfoFieldProps) => (
  <div className="flex min-w-0 items-baseline gap-1.5">
    <dt className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </dt>
    <dd className="text-xs font-medium leading-snug text-foreground break-words">{value}</dd>
  </div>
);

const ContactLink = ({ href, label, icon, external }: ContactLinkProps) => (
  <Link
    href={href}
    className="flex min-w-0 items-start gap-1.5 rounded-md py-0.5 text-xs text-foreground transition-colors hover:bg-muted/60 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    aria-label={label}
    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
  >
    <span className={cn(COMPANY_INLINE_ICON_CLASS, "mt-0.5")} aria-hidden>
      {icon}
    </span>
    <span className="min-w-0 break-words leading-snug">{label}</span>
  </Link>
);

export const CompanyCabinetHero = ({ company, canEdit }: CompanyCabinetHeroProps) => {
  const contactLinks: ContactLinkProps[] = [];

  if (company.website) {
    contactLinks.push({
      href: company.website,
      label: company.website.replace(/^https?:\/\//, ""),
      icon: <Globe className={COMPANY_INLINE_ICON_CLASS} />,
      external: true,
    });
  }
  if (company.email) {
    contactLinks.push({
      href: `mailto:${company.email}`,
      label: company.email,
      icon: <Mail className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }
  if (company.phone) {
    contactLinks.push({
      href: `tel:${company.phone.replace(/\s/g, "")}`,
      label: company.phone,
      icon: <Phone className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }
  if (company.address) {
    contactLinks.push({
      href: "#company-details",
      label: company.address,
      icon: <MapPin className={COMPANY_INLINE_ICON_CLASS} />,
    });
  }

  const hasContacts = contactLinks.length > 0;

  return (
    <Card
      size="sm"
      className="relative w-full overflow-hidden ring-1 ring-[var(--corportal-border-grey)] !gap-0 !py-0"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-16 -top-16 size-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-10 size-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/25" />
      </div>

      <div
        className={cn(
          "relative flex flex-col gap-3 p-3 sm:gap-3.5 sm:p-3.5",
          hasContacts && "md:gap-4 lg:flex-row lg:items-stretch lg:gap-6",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 lg:min-h-full lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            {company.logo ? (
              <TenantLogo
                src={company.logo}
                alt={`${company.displayName} logo`}
                className="size-10 shrink-0 rounded-lg ring-1 ring-[var(--corportal-border-grey)]"
              />
            ) : null}
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex min-w-0 items-center gap-3">
                <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-foreground">
                  {company.displayName}
                </h1>
                {canEdit ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 bg-background/80 backdrop-blur-sm"
                    nativeButton={false}
                    render={
                      <Link
                        href="/settings/companies"
                        aria-label={`Edit ${company.displayName}`}
                      />
                    }
                  >
                    <Pencil aria-hidden className={COMPANY_INLINE_ICON_CLASS} />
                    Edit
                  </Button>
                ) : null}
              </div>
              {company.description ? (
                <p className="line-clamp-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                  {company.description}
                </p>
              ) : null}
            </div>
          </div>

          <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 border-t border-[var(--corportal-border-grey)]/80 pt-2.5">
            <BasicInfoField label="Country" value={formatOptionalText(company.country)} />
            <BasicInfoField
              label="Contact person"
              value={formatOptionalText(company.contactPerson)}
            />
            <BasicInfoField
              label="Contract start date"
              value={formatOptionalDate(company.contractStartDate)}
            />
            <BasicInfoField
              label="Contract end date"
              value={formatOptionalDate(company.contractEndDate)}
            />
          </dl>
        </div>

        {hasContacts ? (
          <>
            <div
              className="hidden w-px shrink-0 self-stretch bg-[var(--corportal-border-grey)]/80 lg:block"
              aria-hidden
            />
            <aside
              className="min-w-0 border-t border-[var(--corportal-border-grey)]/80 pt-2.5 md:pt-3 lg:flex lg:h-full lg:shrink-0 lg:flex-col lg:justify-center lg:border-t-0 lg:pt-0"
              aria-labelledby="company-hero-contacts-heading"
            >
              <h2
                id="company-hero-contacts-heading"
                className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:mb-2"
              >
                Contacts
              </h2>
              <ul className="grid grid-cols-1 gap-y-1 sm:gap-y-1.5 md:gap-x-3 md:gap-y-1.5 2xl:grid-cols-2 lg:gap-y-2">
                {contactLinks.map((contact) => (
                  <li key={contact.label}>
                    <ContactLink {...contact} />
                  </li>
                ))}
              </ul>
            </aside>
          </>
        ) : null}
      </div>
    </Card>
  );
};
