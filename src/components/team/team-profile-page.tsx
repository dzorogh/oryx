import Link from "next/link";
import Image from "next/image";
import {
  Mail,
  MessageCircle,
  Phone,
  Send,
  UserRound,
  Laptop,
  Smartphone,
  Monitor,
  KeyRound,
  Box,
  MapPin,
  Clock,
  Briefcase,
  type LucideIcon,
  BookOpen,
  CheckCircle,
  Star,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  Tent,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import type {
  TeamProfileAsset,
  TeamProfileContact,
  TeamProfileContactChannel,
  TeamProfileData,
  TeamProfileInterestGroup,
} from "./team-profile-demo-data";
import { ReactNode } from "react";

type TeamProfilePageProps = {
  profile: TeamProfileData;
};

const WEEKDAY_LABELS_SHORT = ["M", "T", "W", "T", "F", "S", "S"];

const contactIconByChannel: Record<TeamProfileContactChannel, LucideIcon> = {
  phone: Phone,
  email: Mail,
  telegram: Send,
  whatsapp: MessageCircle,
  internal: UserRound,
};

const BentoCard = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <section
    className={`relative overflow-hidden rounded-2xl bg-card p-4 border border-border/60 transition-colors hover:border-border ${className}`}
  >
    {children}
  </section>
);

const getAssetIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("ноутбук")) return Laptop;
  if (c.includes("телефон")) return Smartphone;
  if (c.includes("токен")) return KeyRound;
  if (c.includes("монитор") || c.includes("аксессуар")) return Monitor;
  return Box;
};

export const TeamProfilePage = ({ profile }: TeamProfilePageProps) => {
  // Compute some quick calendar stats for the Bento widget
  const todayDay = profile.workCalendar.days.find(d => d.isToday);
  const vacationDays = profile.workCalendar.days.filter(d => d.inCurrentMonth && d.state === "vacation");
  
  return (
    <main className="min-h-screen pb-16">
      <div className="w-full flex flex-col gap-4 p-4 sm:p-5">
        
        {/* Header / Breadcrumbs */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-1">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/team" />}>Team</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/team/users" />}>Directory</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{profile.fullName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        {/* Masonry / Column-based Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          
          {/* Column 1 & 2: Hero & Assets */}
          <div className="flex flex-col gap-4 xl:col-span-2 md:col-span-2">
            {/* Widget 1: Hero Profile */}
            <BentoCard className="p-0! flex flex-col overflow-hidden">
            {/* Dynamic Mesh-like Header */}
            <div className="relative h-28 w-full bg-[var(--corportal-rail-brand)] overflow-hidden">
              <div className="absolute -top-24 -left-24 size-64 rounded-full bg-violet-600 blur-[80px] opacity-60 mix-blend-screen" />
              <div className="absolute -bottom-24 -right-24 size-64 rounded-full bg-emerald-400 blur-[80px] opacity-40 mix-blend-screen" />
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
            </div>

            <div className="relative flex flex-1 flex-col px-5 pb-5">
              {/* Overlapping Avatar */}
              <div className="-mt-12 mb-3 flex justify-between items-end">
                <div className="size-24 shrink-0 overflow-hidden rounded-full border-4 border-card bg-card ring-1 ring-border/20 relative z-10 transition-transform duration-500 hover:scale-[1.02]">
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    width={128}
                    height={128}
                    className="size-full object-cover"
                  />
                </div>
                {/* Status Badges floating */}
                <div className="flex gap-2 mb-2 z-10">
                  {profile.statusBadges.map((badge) => (
                    <span key={badge} className="rounded-md bg-white/90 dark:bg-black/60 backdrop-blur-md px-2 py-0.5 text-[11px] font-bold tracking-wide border border-white/20 dark:border-white/10 dark:text-white">
                      {badge}
                    </span>
                  ))}
                </div>
              </div>

              {/* User Info */}
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tight text-foreground transition-colors hover:text-primary">
                  {profile.fullName}
                </h1>
                <p className="text-lg font-medium text-muted-foreground">{profile.role}</p>
                
                <div className="flex flex-wrap items-center gap-4 pt-2 text-sm text-muted-foreground/80 font-medium">
                  <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {profile.city}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="size-4" /> {profile.experience} exp.</span>
                </div>
              </div>

              {/* Quick Contacts Row */}
              <div className="mt-auto pt-6 flex flex-wrap gap-3">
                {profile.contacts.filter(c => c.channel !== 'internal').map((contact) => {
                  const Icon = contactIconByChannel[contact.channel];
                  return (
                    <a
                      key={contact.channel}
                      href={contact.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-foreground transition-all duration-200 hover:scale-105 hover:bg-primary hover:text-primary-foreground"
                      title={contact.label}
                    >
                      <Icon className="size-4 transition-transform group-hover:scale-110" />
                    </a>
                  );
                })}
              </div>
            </div>
            </BentoCard>

            {/* Widget 5: Assets */}
            <BentoCard className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Equipment & Access</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {profile.assets.slice(0, 4).map((asset, i) => {
                  const Icon = getAssetIcon(asset.category);
                  return (
                    <div key={i} className="group relative overflow-hidden rounded-xl bg-card border border-border/50 p-2 transition-all hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary transition-colors">
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-foreground truncate">{asset.name}</p>
                          <p className="text-[10px] font-mono text-muted-foreground truncate">{asset.inventoryId}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          </div>

          {/* Column 3: Org Structure & Interests */}
          <div className="flex flex-col gap-4 xl:col-span-1">
            {/* Widget 2: Org Structure / Tree */}
            <BentoCard className="flex flex-col gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Organization</h2>
            
            {/* Minimal Tree */}
            <div className="relative mt-2 flex-1 space-y-6 before:absolute before:inset-y-3 before:left-[11px] before:w-0.5 before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
              <div className="relative flex items-center gap-4 group">
                <div className="relative z-10 flex size-6 items-center justify-center rounded-full bg-card ring-4 ring-card transition-transform group-hover:scale-125">
                  <div className="size-2 rounded-full bg-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{profile.federalDistrict}</p>
                  <p className="text-[13px] font-semibold text-foreground/90">{profile.branch}</p>
                </div>
              </div>
              <div className="relative flex items-center gap-4 group">
                <div className="relative z-10 flex size-6 items-center justify-center rounded-full bg-card ring-4 ring-card transition-transform group-hover:scale-125">
                  <div className="size-2 rounded-full bg-muted-foreground/50" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Департамент</p>
                  <p className="text-[13px] font-semibold text-foreground">{profile.department}</p>
                </div>
              </div>
              <div className="relative flex items-center gap-3 group">
                <div className="relative z-10 flex size-5 items-center justify-center rounded-full bg-card ring-2 ring-card">
                  <div className="size-2 rounded-full bg-primary/80" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Руководитель</p>
                  <p className="text-[13px] font-bold text-foreground">{profile.supervisor}</p>
                </div>
              </div>
            </div>

            {/* Roles */}
            {profile.orgAssignments.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 rounded-[1.25rem] bg-muted/40 p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Роли</p>
                {profile.orgAssignments.slice(0, 2).map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="truncate font-medium text-foreground/80">{a.name}</span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${a.isLead ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-background text-muted-foreground'}`}>{a.isLead ? 'Lead' : 'Member'}</span>
                  </div>
                ))}
                {profile.orgAssignments.length > 2 && <p className="text-[10px] text-muted-foreground text-center mt-1">+{profile.orgAssignments.length - 2} more</p>}
              </div>
            )}
            </BentoCard>

            {/* Widget 6: Interests */}
            <BentoCard className="flex flex-col gap-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Skills & Interests</h2>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {profile.interests.flatMap(g => g.items).map((item, i) => (
                  <span 
                    key={i} 
                    className="rounded-lg border border-border/40 bg-muted/20 px-2 py-1 text-[11px] font-medium text-foreground/90 transition-all hover:bg-muted cursor-default"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </BentoCard>
          </div>

          {/* Column 4: Calendar & Bio */}
          <div className="flex flex-col gap-4 xl:col-span-1">
            {/* Widget 3: Status / Calendar */}
            <BentoCard className="flex flex-col gap-3">
             <div className="flex justify-between items-center">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">Status</h2>
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
                  </span>
                  Office Today
                </div>
             </div>
             
             {/* Micro heatmap representation of the month */}
             <div className="flex flex-1 flex-col justify-end">
               <div className="flex gap-1 justify-between mb-1.5">
                 {WEEKDAY_LABELS_SHORT.map((l, i) => <span key={i} className="text-[9px] font-bold text-muted-foreground/60 w-5 text-center">{l}</span>)}
               </div>
               <div className="grid grid-cols-7 gap-1">
                 {profile.workCalendar.days.slice(0, 21).map((day, i) => {
                   let blockClass = "bg-muted/10 aspect-square rounded-[4px]"; // Слегка видимые дни другого месяца
                   if (day.inCurrentMonth) {
                     if (day.state === "workday") blockClass = "bg-primary/20 aspect-square rounded-[4px]";
                     else if (day.state === "weekend") blockClass = "bg-muted/60 dark:bg-muted/40 aspect-square rounded-[4px]";
                     else if (day.state === "vacation") blockClass = "bg-amber-500/40 aspect-square rounded-[4px]";
                   }
                   if (day.isToday) blockClass = "bg-primary aspect-square rounded-[3px] ring-1 ring-primary/40 ring-offset-1 ring-offset-card";
                   return <div key={i} className={blockClass} title={day.isToday ? "Today" : day.state} />
                 })}
               </div>
               {vacationDays.length > 0 && (
                 <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-md p-1.5 font-medium">
                   <Tent className="size-4" /> Upcoming vacation
                 </div>
               )}
             </div>
            </BentoCard>

            {/* Widget 4: About Me */}
            {profile.about && (
              <BentoCard className="flex flex-col bg-muted/20">
                <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80 mb-3">Bio</h2>
                <p className="text-[14px] leading-relaxed text-foreground/80 font-medium italic">
                  "{profile.about}"
                </p>
              </BentoCard>
            )}
          </div>

        </div>

        {/* --- LEARNING & TEST RESULTS WIDGET --- */}
        {profile.learning && (
          <div className="mt-4 flex flex-col overflow-hidden rounded-[20px] bg-card border border-border/60 shadow-sm transition-all hover:border-border/80">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-5 py-4 border-b border-border/40 bg-muted/5">
              {/* Left: Tabs */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit border border-border/40 shadow-inner">
                <button className="px-4 py-1.5 text-[12px] font-bold rounded-lg bg-background shadow-xs text-foreground transition-all">
                  Результаты
                </button>
                <button className="px-4 py-1.5 text-[12px] font-bold rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/40 transition-all">
                  Уроки
                </button>
              </div>

              {/* Center: Stats */}
              <div className="flex items-center gap-5 lg:gap-8 text-[12px] font-medium overflow-x-auto no-scrollbar py-1">
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <FileText className="size-4 text-indigo-500/80" />
                  <span>Изучено:</span>
                  <span className="font-bold text-foreground/90">{profile.learning.summary.materialsStudied}/{profile.learning.summary.materialsTotal}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <CheckCircle className="size-4 text-emerald-500/80" />
                  <span>Тестов:</span>
                  <span className="font-bold text-foreground/90">{profile.learning.summary.testsPassed}/{profile.learning.summary.testsTotal}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <Star className="size-4 text-rose-500/80" />
                  <span>Ср. балл:</span>
                  <span className="font-bold text-rose-500">{profile.learning.summary.averageScore}%</span>
                </div>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-4 shrink-0">
                <button className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground tracking-wider hover:text-foreground transition-colors group">
                  <Filter className="size-3.5 group-hover:text-foreground transition-colors" /> ФИЛЬТРЫ <ChevronDown className="size-3.5 opacity-60 ml-0.5 group-hover:opacity-100 transition-opacity" />
                </button>
                <div className="w-[1px] h-4 bg-border/80" />
                <label className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground tracking-wider uppercase cursor-pointer hover:text-foreground transition-colors group">
                  ПО МЕСЯЦАМ
                  <div className="relative flex h-[18px] w-8 items-center rounded-full bg-border/80 transition-colors group-hover:bg-primary/20">
                    <div className="absolute right-[2px] size-3.5 rounded-full bg-muted-foreground group-hover:bg-primary shadow-sm transition-all" />
                  </div>
                </label>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col w-full text-[13px]">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-border/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-muted/5">
                <div className="col-span-1">#</div>
                <div className="col-span-3">РАЗДЕЛ</div>
                <div className="col-span-3">ТЕСТ</div>
                <div className="col-span-2">НАЧАТ / ЗАКОНЧЕН</div>
                <div className="col-span-1">ВРЕМЯ</div>
                <div className="col-span-1 text-center">БАЛЛ</div>
                <div className="col-span-1 text-right">СТАТУС</div>
              </div>

              {/* Data Rows */}
              <div className="flex flex-col pb-2 bg-gradient-to-b from-transparent to-muted/10">
                {profile.learning.history.map((group, groupIdx) => (
                  <div key={groupIdx} className="flex flex-col py-1">
                    {/* Collapsible Header */}
                    <button className="flex items-center gap-2 px-6 py-2.5 text-[12px] font-bold text-foreground/80 hover:text-foreground group transition-colors text-left w-full">
                      {groupIdx === 0 ? <ChevronUp className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" /> : <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />}
                      {group.monthLabel}
                    </button>
                    
                    {/* Rows */}
                    <div className={groupIdx === 0 ? "flex flex-col gap-1 px-3" : "hidden"}>
                      {group.results.map((r, i) => (
                        <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-2.5 rounded-xl border border-transparent hover:border-border/60 hover:bg-muted/40 hover:shadow-xs items-center transition-all group/row">
                          <div className="col-span-1 text-[11px] font-bold text-muted-foreground/40 group-hover/row:text-muted-foreground transition-colors">{i + 1}</div>
                          <div className="col-span-3 font-semibold text-foreground/85 truncate" title={r.section}>{r.section}</div>
                          <div className="col-span-3 text-muted-foreground font-medium truncate" title={r.testName}>{r.testName}</div>
                          <div className="col-span-2 flex flex-col gap-0.5 text-[10px] text-muted-foreground/70 font-medium">
                            <span>{r.startDate}</span>
                            <span>{r.endDate}</span>
                          </div>
                          <div className="col-span-1 text-muted-foreground/80 text-[11px] font-medium">{r.duration}</div>
                          <div className={`col-span-1 text-center font-bold text-[13px] ${r.score >= 80 ? 'text-emerald-500/90' : 'text-rose-500/90'}`}>
                            {r.score}
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] text-[9px] font-black tracking-widest uppercase shadow-sm ${r.status === 'passed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-500/20'}`}>
                              {r.status === 'passed' ? 'ПРОЙДЕН' : 'ЗАВАЛЕН'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
