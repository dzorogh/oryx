"use client";

import Image from "next/image";
import Link from "next/link";
import { BriefcaseBusiness, Building2, SquareUserRound, Users } from "lucide-react";
import { ModuleSubnav } from "@/components/layout/module-subnav";
import { TEAM_DIRECTORY_EMPLOYEES } from "@/components/team/team-directory-demo-data";
import { Separator } from "@/components/ui/separator";
import { TEAM_PROFILE_NAV_ITEM, TEAM_SECTION_NAV_ITEMS } from "@/features/team/team-nav";

type TeamAsideContentProps = {
  onItemClick?: () => void;
};

const TEAM_SUMMARY_ITEMS = [
  {
    label: "Сотрудники",
    value: TEAM_DIRECTORY_EMPLOYEES.length.toString(),
    icon: Users,
  },
  {
    label: "Руководители",
    value: TEAM_DIRECTORY_EMPLOYEES.filter((employee) => employee.isLead).length.toString(),
    icon: SquareUserRound,
  },
  {
    label: "Отделы",
    value: new Set(TEAM_DIRECTORY_EMPLOYEES.map((employee) => employee.department)).size.toString(),
    icon: Building2,
  },
  {
    label: "Должности",
    value: new Set(TEAM_DIRECTORY_EMPLOYEES.map((employee) => employee.position)).size.toString(),
    icon: BriefcaseBusiness,
  },
] as const;

const TEAM_PROFILE_PREVIEW = TEAM_DIRECTORY_EMPLOYEES.find((employee) => employee.id === "1") ?? TEAM_DIRECTORY_EMPLOYEES[0];

const TeamAsideSectionTitle = ({ children }: { children: string }) => (
  <p className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{children}</p>
);

export const TeamAsideContent = ({ onItemClick }: TeamAsideContentProps) => (
  <div className="flex min-h-0 flex-1 flex-col gap-3">
    <Link
      href={TEAM_PROFILE_NAV_ITEM.href}
      onClick={onItemClick}
      aria-label={TEAM_PROFILE_NAV_ITEM.label}
      className="flex items-center gap-3 rounded-lg px-1 py-1 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[var(--corportal-border-grey)] bg-card">
        <Image
          src={TEAM_PROFILE_PREVIEW.avatarUrl}
          alt={`Аватар сотрудника ${TEAM_PROFILE_PREVIEW.fullName}`}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{TEAM_PROFILE_PREVIEW.fullName}</p>
      </div>
    </Link>

    <Separator />

    <div className="flex flex-col gap-2">
      <TeamAsideSectionTitle>Разделы</TeamAsideSectionTitle>
      <ModuleSubnav items={TEAM_SECTION_NAV_ITEMS} navAriaLabel="Разделы модуля Команда" onItemClick={onItemClick} />
    </div>

    <Separator />

    <div className="flex flex-col gap-2">
      <TeamAsideSectionTitle>Сводка</TeamAsideSectionTitle>
      <div className="grid gap-2">
        {TEAM_SUMMARY_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-xl border border-[var(--corportal-border-grey)] bg-card px-2 py-2"
            >
              <span className="rounded-lg bg-muted p-1.5 text-muted-foreground">
                <Icon aria-hidden className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
