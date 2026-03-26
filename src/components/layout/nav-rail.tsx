"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  GraduationCap,
  HeartPulse,
  Menu,
  Check,
  HelpCircle,
  Hexagon,
  Home,
  Search,
  ShoppingCart,
  ShieldCheck,
  Store,
  User,
  Users,
  SquareCheckBig,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearchModal } from "@/components/layout/global-search-modal";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { ModuleSubnav } from "@/components/layout/module-subnav";
import { RailFaviconIcon } from "@/components/layout/rail-favicon-icon";
import { PimAsideContent } from "@/components/pim/pim-aside";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";
import { TEAM_SUBNAV_ITEMS } from "@/features/team/team-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "../ui/separator";

type RailIconButtonProps = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export type RailSectionItem = {
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  href: string;
  match: string;
  bgColor: string;
};

const getPrimaryItemActive = (item: RailSectionItem, pathname: string): boolean => {
  if (item.match === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(item.match);
};

const getFooterItemActive = (item: RailSectionItem, pathname: string): boolean => pathname.startsWith(item.match);

export const RAIL_PRIMARY_ITEMS: RailSectionItem[] = [
  {
    label: "Главная",
    shortLabel: "Главная",
    icon: Home,
    href: "/",
    match: "/",
    bgColor: "bg-sky-300",
  },
  {
    label: "Пульс компании",
    shortLabel: "Пульс",
    icon: HeartPulse,
    href: "/pulse/news",
    match: "/pulse",
    bgColor: "bg-pink-300",
  },
  {
    label: "Согласования",
    shortLabel: "Соглас.",
    icon: ShieldCheck,
    href: "/approvals",
    match: "/approvals",
    bgColor: "bg-emerald-300",
  },
  {
    label: "Упаковка и заказы",
    shortLabel: "Заказы",
    icon: ShoppingCart,
    href: `/pim/orders/${DEFAULT_ORDER_ID}`,
    match: "/pim",
    bgColor: "bg-amber-300",
  },
  {
    label: "Активность",
    shortLabel: "Активн.",
    icon: Activity,
    href: "/activity",
    match: "/activity",
    bgColor: "bg-orange-300",
  },
  {
    label: "Команда",
    shortLabel: "Команда",
    icon: Users,
    href: "/team",
    match: "/team",
    bgColor: "bg-violet-300",
  },
  {
    label: "Обучение",
    shortLabel: "Учёба",
    icon: GraduationCap,
    href: "/learning",
    match: "/learning",
    bgColor: "bg-teal-300",
  },
  {
    label: "Каталог",
    shortLabel: "Каталог",
    icon: Store,
    href: "/catalog",
    match: "/catalog",
    bgColor: "bg-indigo-300",
  },
];

export const RAIL_FOOTER_ITEMS: RailSectionItem[] = [
  {
    label: "Сервисы",
    shortLabel: "Сервисы",
    icon: Hexagon,
    href: "/services",
    match: "/services",
    bgColor: "bg-slate-300",
  },
  {
    label: "Справка",
    shortLabel: "Справка",
    icon: HelpCircle,
    href: "/help",
    match: "/help",
    bgColor: "bg-rose-300",
  },
];

/** Фавикон рейла — Figma node 40023000:133773 (Corportal Favicon). */
const railButtonBaseClass =
  "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-hover)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]";

const RailIconButton = ({ label, icon: Icon, href, onClick, active }: RailIconButtonProps) => {
  const className = cn(
    railButtonBaseClass,
  );

  const indicator = active ? (
    <span
      className="absolute -left-0.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-[color:var(--corportal-rail-indicator)]"
      aria-hidden
    />
  ) : null;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className} aria-label={label} aria-current={active ? "page" : undefined}>
        {indicator}
        <Icon aria-hidden className="size-5" strokeWidth={2} />
      </button>
    );
  }

  if (!href) {
    return null;
  }

  return (
    <Link href={href} className={className} aria-label={label} aria-current={active ? "page" : undefined}>
      {indicator}
      <Icon aria-hidden className="size-5" strokeWidth={2} />
    </Link>
  );
};

type DemoTenant = {
  id: string;
  label: string;
};

const TENANT_STORAGE_KEY = "tenant-id";

const DEMO_TENANTS: DemoTenant[] = [
  { id: "tenant-oryx", label: "Oryx" },
  { id: "tenant-north", label: "North" },
  { id: "tenant-global", label: "GlobalDrive" },
];

type TenantSwitcherProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const TenantSwitcher = ({ open, onOpenChange }: TenantSwitcherProps = {}) => {
  const [tenantId, setTenantId] = useState(DEMO_TENANTS[0]?.id ?? "tenant-oryx");

  useEffect(() => {
    const localStorage = window.localStorage;
    if (!localStorage || typeof localStorage.getItem !== "function") {
      return;
    }

    const raw = localStorage.getItem(TENANT_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const exists = DEMO_TENANTS.some((t) => t.id === raw);
    if (!exists) {
      return;
    }
    // Чтобы избежать React/ESLint предупреждений о синхронных setState в эффектах,
    // обновляем выбранный тенант в следующем тике.
    const timer = window.setTimeout(() => setTenantId(raw), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSelectTenant = (nextId: string) => {
    setTenantId(nextId);

    const localStorage = window.localStorage;
    if (!localStorage || typeof localStorage.setItem !== "function") {
      return;
    }

    localStorage.setItem(TENANT_STORAGE_KEY, nextId);
  };

  const currentTenant = DEMO_TENANTS.find((t) => t.id === tenantId) ?? DEMO_TENANTS[0];
  const isControlled = open !== undefined;

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {isControlled ? (
        <DropdownMenuTrigger className="sr-only" aria-hidden tabIndex={-1} />
      ) : (
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Переключить тенант"
            >
              <RailFaviconIcon />
            </Button>
          }
        />
      )}
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Тенант</DropdownMenuLabel>
          {DEMO_TENANTS.map((tenant) => {
            const active = tenant.id === currentTenant.id;
            return (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                aria-label={`Выбрать тенант ${tenant.label}`}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span>{tenant.label}</span>
                  {active ? <Check aria-hidden className="size-4" /> : null}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type MobileNavOverlayProps = {
  pathname: string;
  asideContent: ReactNode;
  onClose: () => void;
};

type MobileMenuTileProps = {
  item: RailSectionItem;
  active: boolean;
  onNavigate: () => void;
};

const MobileMenuTile = ({ item, active, onNavigate }: MobileMenuTileProps) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className="flex flex-col items-center justify-center gap-1 outline-none"
    >
      <Icon aria-hidden className={cn("size-12 p-2 rounded-lg text-foreground/50", item.bgColor)} strokeWidth={1.5} />
      <span className="relative font-medium leading-tight text-xs">{item.shortLabel}</span>
      {active ? <span className="absolute inset-x-5 top-2 h-1 rounded-full bg-white/70" aria-hidden /> : null}
    </Link>
  );
};

type MobileAsideSectionProps = {
  title: string;
  children: ReactNode;
};

const MobileAsideSection = ({ title, children }: MobileAsideSectionProps) => (
  <div className="flex flex-col">
    <div className="px-4">
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto py-3 px-4">
      {children}
    </div>
  </div>
);

const MobileNavOverlay = ({ pathname, asideContent, onClose }: MobileNavOverlayProps) => {
  const hasAsideContent = asideContent !== null;
  const mobileMenuItems = [...RAIL_PRIMARY_ITEMS, ...RAIL_FOOTER_ITEMS];

  return (
    <Sheet
      open
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
      aria-label="Разделы"
    >
      <SheetContent
        className="h-dvh w-full overflow-auto"
      >
        <div className="flex h-full flex-col justify-center overflow-y-auto">
          <div className={cn("py-16")}>
            <div className="grid grid-cols-4 gap-4 px-4">
              {mobileMenuItems.map((item) => (
                <MobileMenuTile
                  key={item.label}
                  item={item}
                  active={item.match === "/" ? pathname === "/" : pathname.startsWith(item.match)}
                  onNavigate={onClose}
                />
              ))}
            </div>



            {hasAsideContent ? (
              <>
                <Separator
                  className="my-6"
                />
                <div className="">{asideContent}</div>
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const mobileBottomNavButtonBaseClass =
  "h-11 w-full gap-0 rounded-lg px-0 py-0 text-[color:var(--corportal-rail-foreground)] hover:bg-[color:var(--corportal-rail-hover)] hover:text-[color:var(--corportal-rail-foreground)]";

type MobileBottomNavActionButtonProps = {
  ariaLabel: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
};

const MobileBottomNavActionButton = ({ ariaLabel, icon: Icon, onClick }: MobileBottomNavActionButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="default"
    className={mobileBottomNavButtonBaseClass}
    aria-label={ariaLabel}
    onClick={onClick}
  >
    <Icon className="size-5" />
  </Button>
);

type MobileNavItem = {
  key: string;
  icon: ComponentType<{ className?: string }>;
  ariaLabel: string;
  onClick: () => void;
};

/** Левый навигационный рейл по макету Corportal (Figma node 40023000:133768). Логотип — 40023000:133773. */
export const NavRail = () => {
  const pathname = usePathname();
  const router = useRouter();
  const currentPathname = pathname ?? "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isTenantOpen, setIsTenantOpen] = useState(false);

  const handleOpenSearch = () => setIsSearchOpen(true);
  const handleCloseSearch = () => setIsSearchOpen(false);
  const handleCloseMobileNav = () => setIsMobileNavOpen(false);
  const handleBurgerClick = () => setIsMobileNavOpen(true);

  const currentAsideContent = useMemo(() => {
    if (currentPathname === "/pulse" || currentPathname.startsWith("/pulse/")) {
      return (
        <MobileAsideSection title="Пульс компании">
          <ModuleSubnav
            items={PULSE_SUBNAV_ITEMS}
            navAriaLabel="Подразделы Пульса компании"
            onItemClick={handleCloseMobileNav}
          />
        </MobileAsideSection>
      );
    }

    if (currentPathname === "/pim" || currentPathname.startsWith("/pim/")) {
      return (
        <MobileAsideSection title="Магазин и каталог">
          <PimAsideContent onItemClick={handleCloseMobileNav} />
        </MobileAsideSection>
      );
    }

    if (currentPathname === "/team" || currentPathname.startsWith("/team/")) {
      return (
        <MobileAsideSection title="Команда">
          <ModuleSubnav
            items={TEAM_SUBNAV_ITEMS}
            navAriaLabel="Подразделы модуля Команда"
            onItemClick={handleCloseMobileNav}
          />
        </MobileAsideSection>
      );
    }

    return null;
  }, [currentPathname]);

  const mobileBottomNavItems: MobileNavItem[] = [
    { key: "tenant", icon: RailFaviconIcon, ariaLabel: "Переключить тенант", onClick: () => setIsTenantOpen(true) },
    { key: "tasks", icon: SquareCheckBig, ariaLabel: "Задачи", onClick: () => router.push("/tasks") },
    { key: "search", icon: Search, ariaLabel: "Открыть поиск", onClick: handleOpenSearch },
    { key: "profile", icon: User, ariaLabel: "Профиль", onClick: () => router.push("/team/1") },
    { key: "menu", icon: Menu, ariaLabel: "Открыть меню", onClick: handleBurgerClick },
  ];

  return (
    <>
      <LeftDockShell
        className="hidden bg-corportal-rail left-0 z-40 w-12 items-center overflow-y-auto py-0 no-scrollbar sm:flex"
        ariaLabel="Основная навигация"
      >
        <div className="flex w-full justify-center px-3 py-3">
          <TenantSwitcher />
        </div>

        <div className="flex w-full flex-col items-center gap-3 px-1 pb-2">
          <RailIconButton
            label="Поиск"
            icon={Search}
            onClick={handleOpenSearch}
            active={isSearchOpen}
          />
        </div>

        <div className="no-scrollbar flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-1 pt-1">
          {RAIL_PRIMARY_ITEMS.map((item) => (
            <RailIconButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              href={item.href}
              active={getPrimaryItemActive(item, currentPathname)}
            />
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-2 px-1 py-2">
          {RAIL_FOOTER_ITEMS.map((item) => (
            <RailIconButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              href={item.href}
              active={getFooterItemActive(item, currentPathname)}
            />
          ))}
        </div>

        <div className="flex w-full justify-center px-2 py-2">
          <Link
            href="/team/1"
            className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[color:var(--corportal-rail-hover)] text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-active)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]"
            aria-label="Профиль"
          >
            <User aria-hidden className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </LeftDockShell>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-corportal-rail-gradient-from m-2 p-1 rounded-xl sm:hidden" aria-label="Нижняя навигация">
        <TenantSwitcher open={isTenantOpen} onOpenChange={setIsTenantOpen} />
        <div className="grid grid-cols-5 gap-0">
          {mobileBottomNavItems.map((item) => (
            <MobileBottomNavActionButton
              key={item.key}
              icon={item.icon}
              ariaLabel={item.ariaLabel}
              onClick={item.onClick}
            />
          ))}
        </div>
      </nav>

      {isMobileNavOpen ? (
        <MobileNavOverlay
          pathname={currentPathname}
          asideContent={currentAsideContent}
          onClose={handleCloseMobileNav}
        />
      ) : null}

      <GlobalSearchModal open={isSearchOpen} onClose={handleCloseSearch} />
    </>
  );
};
