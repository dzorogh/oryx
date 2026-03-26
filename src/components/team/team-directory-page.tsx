import Link from "next/link";
import { ArrowRight, Building2, Mail, Phone, Users } from "lucide-react";
import { HomeInfoCardBase } from "@/components/home/home-info-card-base";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import { cn } from "@/lib/utils";
import { TEAM_PROFILE_DEMO_DATA } from "./team-profile-demo-data";

export const TeamDirectoryPage = () => {
  const demoProfile = TEAM_PROFILE_DEMO_DATA[0];

  if (!demoProfile) {
    return null;
  }

  return (
    <main className="min-h-screen pl-0 sm:pl-12">
      <section className="flex min-h-screen items-start p-5">
        <div className="flex w-full max-w-6xl flex-col gap-4">
          <Card size="sm" className="overflow-hidden ring-1 ring-[var(--corportal-border-grey)]">
            <div className="h-20 bg-[linear-gradient(135deg,var(--corportal-rail-gradient-from),var(--corportal-rail-brand)_52%,#6d28d9)]" />
            <CardContent className="grid gap-4 pt-0 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="-mt-6 space-y-4">
                <div className="space-y-2">
                  <CorportalSoftBadge className="bg-corportal-accent-violet-soft text-corportal-accent-violet-on-soft">
                    Employee Directory
                  </CorportalSoftBadge>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Команда</h1>
                    <p className="pt-1 text-sm leading-relaxed text-muted-foreground">
                      Компактный каталог сотрудников с быстрым входом в детальную карточку.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Сотрудников в демо</p>
                    <p className="pt-1 text-lg font-semibold text-foreground">1</p>
                  </div>
                  <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Основной сценарий</p>
                    <p className="pt-1 text-sm font-semibold text-foreground">Открытие detail-view</p>
                  </div>
                  <div className="rounded-xl border border-[var(--corportal-border-grey)] bg-card px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Фокус интерфейса</p>
                    <p className="pt-1 text-sm font-semibold text-foreground">Компактность и сканируемость</p>
                  </div>
                </div>
              </div>

              <HomeInfoCardBase
                ariaLabel="Быстрое действие"
                header={<h2 className="text-sm font-semibold text-foreground">Быстрый вход</h2>}
                className="h-full"
              >
                <p className="text-sm leading-relaxed text-foreground">
                  Откройте демо-профиль сотрудника и проверьте плотную карточную раскладку без вкладок.
                </p>
                <div className="pt-3">
                  <Link
                    href={`/team/${demoProfile.id}`}
                    className={cn(buttonVariants({ size: "sm" }), "inline-flex gap-1.5")}
                    aria-label="Открыть демо-профиль сотрудника"
                  >
                    Открыть профиль
                    <ArrowRight aria-hidden className="size-3.5" />
                  </Link>
                </div>
              </HomeInfoCardBase>
            </CardContent>
          </Card>

          <HomeInfoCardBase
            ariaLabel={`Карточка сотрудника ${demoProfile.fullName}`}
            header={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{demoProfile.fullName}</h2>
                  <p className="text-xs text-muted-foreground">{demoProfile.role}</p>
                </div>
                <CorportalSoftBadge className="bg-corportal-accent-amber-soft text-corportal-accent-amber-on-soft">
                  Demo profile
                </CorportalSoftBadge>
              </div>
            }
            footer={
              <Link
                href={`/team/${demoProfile.id}`}
                className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                Перейти к карточке
              </Link>
            }
          >
            <div className="grid gap-3 lg:grid-cols-4">
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Mail aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                <span>{demoProfile.email}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Phone aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                <span>{demoProfile.phone}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Building2 aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                <span>{demoProfile.department}</span>
              </div>
              <div className="flex items-start gap-2 text-sm text-foreground">
                <Users aria-hidden className="mt-0.5 size-4 text-muted-foreground" />
                <span>{demoProfile.supervisor}</span>
              </div>
            </div>
          </HomeInfoCardBase>
        </div>
      </section>
    </main>
  );
};
