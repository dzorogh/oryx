import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  MessageCircle,
  Phone,
  Send,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { HomeInfoCardBase } from "@/components/home/home-info-card-base";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import type {
  TeamProfileAsset,
  TeamProfileCalendarDay,
  TeamProfileCalendarDayState,
  TeamProfileContact,
  TeamProfileContactChannel,
  TeamProfileData,
  TeamProfileInterestGroup,
  TeamProfileOrgAssignment,
} from "./team-profile-demo-data";

type TeamProfilePageProps = {
  profile: TeamProfileData;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const badgeClassNameByLabel: Record<string, string> = {
  Guru: "bg-corportal-accent-violet-soft text-corportal-accent-violet-on-soft",
  Absent: "bg-corportal-accent-amber-soft text-corportal-accent-amber-on-soft",
};

const contactIconByChannel: Record<TeamProfileContactChannel, LucideIcon> = {
  phone: Phone,
  email: Mail,
  telegram: Send,
  whatsapp: MessageCircle,
  internal: UserRound,
};

const calendarStateClassNameByState: Record<TeamProfileCalendarDayState, string> = {
  workday: "bg-card text-foreground",
  weekend: "bg-muted/60 text-muted-foreground",
  vacation: "bg-corportal-accent-amber-soft text-corportal-accent-amber-on-soft",
};

const calendarLegendClassNameByState: Record<TeamProfileCalendarDayState, string> = {
  workday: "bg-card ring-1 ring-[var(--corportal-border-grey)]",
  weekend: "bg-muted/70",
  vacation: "bg-corportal-accent-amber-soft",
};

const assetStatusClassNameByStatus: Record<TeamProfileAsset["status"], string> = {
  assigned: "bg-corportal-accent-teal-soft text-corportal-accent-teal-on-soft",
  reserve: "bg-corportal-accent-amber-soft text-corportal-accent-amber-on-soft",
  service: "bg-muted text-muted-foreground",
};

const assetStatusLabelByStatus: Record<TeamProfileAsset["status"], string> = {
  assigned: "Выдан",
  reserve: "Резерв",
  service: "Сервис",
};

const getBadgeClassName = (label: string) =>
  badgeClassNameByLabel[label] ?? "bg-muted text-muted-foreground";

const ProfileAvatar = ({
  fullName,
  avatarUrl,
}: Pick<TeamProfileData, "fullName" | "avatarUrl">) => (
  <div className="size-20 overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
    <Image
      src={avatarUrl}
      alt={`Аватар сотрудника ${fullName}`}
      width={160}
      height={160}
      className="size-full object-cover"
    />
  </div>
);

const DetailColumn = ({ label, value }: { label: string; value: string }) => (
  <div className="space-y-1">
    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium leading-snug text-foreground">{value}</p>
  </div>
);

const ContactItem = ({ contact }: { contact: TeamProfileContact }) => {
  const Icon = contactIconByChannel[contact.channel];
  const isExternal = contact.href.startsWith("http");

  return (
    <a
      href={contact.href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className="flex items-start gap-3 rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3 transition-colors hover:bg-muted"
      aria-label={`${contact.label}: ${contact.value}`}
    >
      <span className="rounded-lg bg-muted p-2 text-muted-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{contact.label}</span>
        <span className="block break-all text-sm font-semibold text-foreground">{contact.value}</span>
        {contact.note ? <span className="block pt-0.5 text-xs text-muted-foreground">{contact.note}</span> : null}
      </span>
    </a>
  );
};

const OrgAssignmentCard = ({ assignment }: { assignment: TeamProfileOrgAssignment }) => (
  <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-muted/30 px-3 py-3">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug text-foreground">{assignment.name}</p>
      </div>
      <CorportalSoftBadge
        className={
          assignment.isLead
            ? "bg-corportal-accent-violet-soft text-corportal-accent-violet-on-soft"
            : "bg-muted text-muted-foreground"
        }
      >
        {assignment.roleLabel}
      </CorportalSoftBadge>
    </div>
  </div>
);

const CalendarDayCell = ({ day }: { day: TeamProfileCalendarDay }) => (
  <div
    className={`min-h-24 rounded-xl border p-2 ${day.isToday
      ? "border-primary/40 ring-1 ring-primary/20"
      : day.inCurrentMonth
        ? "border-[var(--corportal-border-grey)]"
        : "border-[var(--corportal-border-grey)]/50"
      } ${calendarStateClassNameByState[day.state]} ${day.inCurrentMonth ? "" : "opacity-55"}`}
  >
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm font-semibold">{day.dayNumber}</span>
      {day.isToday ? (
        <CorportalSoftBadge className="bg-primary/10 text-primary">Today</CorportalSoftBadge>
      ) : null}
    </div>
    <div className="pt-2">
      {day.timeRange ? (
        <p className="text-[11px] leading-snug text-muted-foreground">{day.timeRange}</p>
      ) : day.label ? (
        <p className="text-[11px] leading-snug">{day.label}</p>
      ) : null}
    </div>
  </div>
);

const AssetRow = ({ asset }: { asset: TeamProfileAsset }) => (
  <div className="grid gap-3 rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3 md:grid-cols-[120px_minmax(0,1fr)_120px_90px] md:items-center">
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Тип</p>
      <p className="text-sm font-medium text-foreground">{asset.category}</p>
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Оборудование</p>
      <p className="text-sm font-medium text-foreground">{asset.name}</p>
      {asset.note ? <p className="pt-0.5 text-xs text-muted-foreground">{asset.note}</p> : null}
    </div>
    <div>
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Инв. номер</p>
      <p className="text-sm font-medium text-foreground">{asset.inventoryId}</p>
    </div>
    <div className="md:justify-self-end">
      <CorportalSoftBadge className={assetStatusClassNameByStatus[asset.status]}>
        {assetStatusLabelByStatus[asset.status]}
      </CorportalSoftBadge>
    </div>
  </div>
);

const InterestGroupCard = ({ group }: { group: TeamProfileInterestGroup }) => (
  <section
    aria-label={group.title}
    className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3"
  >
    <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-start">
      <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
      <div className="flex flex-wrap gap-1.5">
        {group.items.map((item) => (
          <CorportalSoftBadge key={item} className="bg-muted text-foreground">
            {item}
          </CorportalSoftBadge>
        ))}
      </div>
    </div>
  </section>
);

export const TeamProfilePage = ({ profile }: TeamProfilePageProps) => (
  <main className="min-h-screen">
    <div className="flex min-h-screen flex-col gap-5 p-5">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/team" />}>Сотрудники</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{profile.fullName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start xl:sticky xl:top-5">
          <Card size="sm" className="overflow-hidden py-0! gap-0!">
            <div className="h-24 bg-[linear-gradient(135deg,var(--corportal-rail-gradient-from),var(--corportal-rail-brand)_52%,#6d28d9)]" />
            <CardContent className="relative flex flex-col gap-4 pb-4 pt-0">
              <div className="-mt-10 flex items-end justify-between gap-3">
                <ProfileAvatar fullName={profile.fullName} avatarUrl={profile.avatarUrl} />
                <div className="flex flex-wrap justify-end gap-1.5 pb-1">
                  {profile.statusBadges.map((badge) => (
                    <CorportalSoftBadge key={badge} className={getBadgeClassName(badge)}>
                      {badge}
                    </CorportalSoftBadge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{profile.fullName}</h1>
                <p className="text-sm text-muted-foreground">{profile.role}</p>
              </div>
            </CardContent>
          </Card>

          <HomeInfoCardBase
            ariaLabel="Контакты сотрудника"
            header={
              <h2 className="text-sm font-semibold text-foreground">Контакты</h2>
            }
            className="gap-3"
          >
            <div className="grid gap-2">
              {profile.contacts.map((contact) => (
                <ContactItem key={contact.label} contact={contact} />
              ))}
            </div>
          </HomeInfoCardBase>
        </aside>

        <div className="grid gap-4">
          <HomeInfoCardBase
            ariaLabel="Оргструктура"
            header={
              <h2 className="text-sm font-semibold text-foreground">Оргструктура</h2>
            }
            className="gap-4"
          >
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                  <DetailColumn label="Federal District" value={profile.federalDistrict} />
                </div>
                <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                  <DetailColumn label="Branch" value={profile.branch} />
                </div>
                <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                  <DetailColumn label="Supervisor" value={profile.supervisor} />
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                {profile.orgAssignments.map((assignment) => (
                  <OrgAssignmentCard key={`${assignment.name}-${assignment.roleLabel}`} assignment={assignment} />
                ))}
              </div>
            </div>
          </HomeInfoCardBase>

          <HomeInfoCardBase
            ariaLabel="График работы"
            header={
              <h2 className="text-sm font-semibold text-foreground">График работы</h2>
            }
            className="gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{profile.workCalendar.monthLabel}</p>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-3 rounded-sm ${calendarLegendClassNameByState.workday}`} />
                  Рабочий день
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-3 rounded-sm ${calendarLegendClassNameByState.weekend}`} />
                  Выходной
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className={`size-3 rounded-sm ${calendarLegendClassNameByState.vacation}`} />
                  Отпуск
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="px-1 py-1 text-center text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </div>
              ))}
              {profile.workCalendar.days.map((day, index) => (
                <CalendarDayCell key={`${day.dayNumber}-${index}`} day={day} />
              ))}
            </div>
          </HomeInfoCardBase>

          <HomeInfoCardBase
            ariaLabel="Активы сотрудника"
            header={
              <h2 className="text-sm font-semibold text-foreground">Активы</h2>
            }
            className="gap-3"
          >
            <div className="grid gap-2">
              {profile.assets.map((asset) => (
                <AssetRow key={asset.inventoryId} asset={asset} />
              ))}
            </div>
          </HomeInfoCardBase>

          <HomeInfoCardBase
            ariaLabel="Интересы сотрудника"
            header={
              <h2 className="text-sm font-semibold text-foreground">Интересы</h2>
            }
            className="gap-3"
          >
            <div className="grid gap-3">
              {profile.interests.map((group) => (
                <InterestGroupCard key={group.title} group={group} />
              ))}
            </div>
          </HomeInfoCardBase>
        </div>
      </section>
    </div>
  </main>
);
