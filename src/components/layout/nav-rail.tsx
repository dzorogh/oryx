"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  ChevronsRight,
  GraduationCap,
  Handshake,
  HeartPulse,
  Languages,
  Library,
  LogOut,
  Menu,
  Check,
  NotebookPen,
  Search,
  Settings,
  Smartphone,
  SquareKanban,
  Store,
  User,
  Users,
  Workflow,
  SquareCheckBig,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { GlobalSearchModal } from "@/components/layout/global-search-modal";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { useSidebarAside } from "@/components/layout/sidebar-aside-context";
import { ModuleSubnav, type ModuleSubnavItem } from "@/components/layout/module-subnav";
import { RailFaviconIcon } from "@/components/layout/rail-favicon-icon";
import { StoreAsideContent } from "@/components/store/store-aside-content";
import { TeamAsideContent } from "@/components/team/team-aside-content";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";
import { PulseHomeAsideContent } from "@/features/pulse/pulse-home-aside-content";
import { TRACKER_SUBNAV_ITEMS } from "@/features/tracker/tracker-nav";
import { CRM_SUBNAV_ITEMS } from "@/features/crm/crm-nav";
import { LEARNING_SUBNAV_ITEMS } from "@/features/learning/learning-nav";
import { LIBRARY_SUBNAV_ITEMS } from "@/features/library/library-nav";
import { ANALYTICS_SUBNAV_ITEMS } from "@/features/analytics/analytics-nav";
import { SETTINGS_SUBNAV_ITEMS } from "@/features/settings/settings-nav";
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

const isPulseRoute = (pathname: string): boolean =>
  pathname === "/" || pathname.startsWith("/pulse");

const getPrimaryItemActive = (item: RailSectionItem, pathname: string): boolean => {
  if (item.match === "/pulse") {
    return isPulseRoute(pathname);
  }
  return pathname.startsWith(item.match);
};

const getFooterItemActive = (item: RailSectionItem, pathname: string): boolean => pathname.startsWith(item.match);

export const RAIL_PRIMARY_ITEMS: RailSectionItem[] = [
  {
    label: "Pulse",
    shortLabel: "Pulse",
    icon: HeartPulse,
    href: "/",
    match: "/pulse",
    bgColor: "bg-pink-300",
  },
  {
    label: "Tracker",
    shortLabel: "Tracker",
    icon: SquareKanban,
    href: "/tracker/tasks",
    match: "/tracker",
    bgColor: "bg-lime-300",
  },
  {
    label: "CRM",
    shortLabel: "CRM",
    icon: Handshake,
    href: "/crm/deals",
    match: "/crm",
    bgColor: "bg-amber-300",
  },
  {
    label: "Store",
    shortLabel: "Store",
    icon: Store,
    href: "/store/pim/products",
    match: "/store",
    bgColor: "bg-indigo-300",
  },
  {
    label: "Learning",
    shortLabel: "Learning",
    icon: GraduationCap,
    href: "/learning/lessons",
    match: "/learning",
    bgColor: "bg-teal-300",
  },
  {
    label: "Library",
    shortLabel: "Library",
    icon: Library,
    href: "/library/documents",
    match: "/library",
    bgColor: "bg-cyan-300",
  },
  {
    label: "Analytics",
    shortLabel: "Analytics",
    icon: BarChart3,
    href: "/analytics/stocks",
    match: "/analytics",
    bgColor: "bg-orange-300",
  },
  {
    label: "Team",
    shortLabel: "Team",
    icon: Users,
    href: "/team/structure",
    match: "/team",
    bgColor: "bg-violet-300",
  },
];

export const RAIL_FOOTER_ITEMS: RailSectionItem[] = [
  {
    label: "Settings",
    shortLabel: "Settings",
    icon: Settings,
    href: "/settings/auth",
    match: "/settings",
    bgColor: "bg-slate-300",
  },
];

type MobileAsideEntry = {
  match: string;
  title: string;
  items: ModuleSubnavItem[];
  ariaLabel: string;
};

/** Реестр подменю для мобильного overlay. Store/Team обрабатываются отдельно (богатый aside). */
const MOBILE_ASIDE_ENTRIES: MobileAsideEntry[] = [
  { match: "/pulse", title: "Pulse", items: PULSE_SUBNAV_ITEMS, ariaLabel: "Pulse sections" },
  { match: "/tracker", title: "Tracker", items: TRACKER_SUBNAV_ITEMS, ariaLabel: "Tracker sections" },
  { match: "/crm", title: "CRM", items: CRM_SUBNAV_ITEMS, ariaLabel: "CRM sections" },
  { match: "/learning", title: "Learning", items: LEARNING_SUBNAV_ITEMS, ariaLabel: "Learning sections" },
  { match: "/library", title: "Library", items: LIBRARY_SUBNAV_ITEMS, ariaLabel: "Library sections" },
  { match: "/analytics", title: "Analytics", items: ANALYTICS_SUBNAV_ITEMS, ariaLabel: "Analytics sections" },
  { match: "/settings", title: "Settings", items: SETTINGS_SUBNAV_ITEMS, ariaLabel: "Settings sections" },
];

/** Пункты рейла, у которых есть подменю. */
const RAIL_FLYOUT_MATCHES = new Set<string>([
  "/store",
  "/team",
  ...MOBILE_ASIDE_ENTRIES.map((entry) => entry.match),
]);

const hasRailFlyout = (match: string): boolean => RAIL_FLYOUT_MATCHES.has(match);

type RailFlyoutContentProps = {
  match: string;
  onNavigate: () => void;
};

/** Содержимое подменю модуля внутри всплывающей панели рейла. Переиспользует тот же aside-контент. */
const RailFlyoutContent = ({ match, onNavigate }: RailFlyoutContentProps) => {
  if (match === "/store") {
    return <StoreAsideContent onItemClick={onNavigate} />;
  }

  if (match === "/team") {
    return <TeamAsideContent onItemClick={onNavigate} />;
  }

  if (match === "/pulse") {
    return <PulseHomeAsideContent onItemClick={onNavigate} />;
  }

  const entry = MOBILE_ASIDE_ENTRIES.find((item) => item.match === match);
  if (!entry) {
    return null;
  }

  return <ModuleSubnav items={entry.items} navAriaLabel={entry.ariaLabel} onItemClick={onNavigate} />;
};

type RailFlyoutProps = {
  item: RailSectionItem;
  style: CSSProperties;
  onCancelClose: () => void;
  onScheduleClose: () => void;
  onNavigate: () => void;
  onClose: () => void;
};

/**
 * Всплывающая панель меню модуля. Показывается при наведении на пункт рейла,
 * когда боковая панель свёрнута. Дизайн — Figma node 40024965:63583
 * (белая карточка, радиус 8px, тень Shadow-LG: 2px 2px 10px rgba(36,40,43,0.2)).
 */
const RailFlyout = ({ item, style, onCancelClose, onScheduleClose, onNavigate, onClose }: RailFlyoutProps) => {
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      role="menu"
      aria-label={`${item.label} menu`}
      style={style}
      onMouseEnter={onCancelClose}
      onMouseLeave={onScheduleClose}
      onFocusCapture={onCancelClose}
      onBlurCapture={onScheduleClose}
      onKeyDown={handleKeyDown}
      className="fixed left-12 z-50 hidden w-[224px] flex-col overflow-hidden rounded-lg bg-[var(--corportal-surface-white)] shadow-[2px_2px_10px_0px_rgba(36,40,43,0.2)] sm:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <div className="shrink-0 px-1">
          <span className="text-sm font-bold leading-[1.66] text-foreground">{item.label}</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-2">
          <RailFlyoutContent match={item.match} onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
};

type RailNavItemProps = {
  item: RailSectionItem;
  active: boolean;
  flyoutEnabled: boolean;
  onOpen: (item: RailSectionItem, anchor: HTMLElement) => void;
  onScheduleClose: () => void;
};

/** Пункт рейла с обёрткой, отслеживающей наведение/фокус для открытия всплывающего подменю. */
const RailNavItem = ({ item, active, flyoutEnabled, onOpen, onScheduleClose }: RailNavItemProps) => {
  const handleOpen = (event: { currentTarget: HTMLElement }) => {
    if (flyoutEnabled) {
      onOpen(item, event.currentTarget);
    }
  };

  return (
    <div
      className="flex w-full justify-center"
      onMouseEnter={handleOpen}
      onMouseLeave={flyoutEnabled ? onScheduleClose : undefined}
      onFocusCapture={handleOpen}
      onBlurCapture={flyoutEnabled ? onScheduleClose : undefined}
    >
      <RailIconButton label={item.label} icon={item.icon} href={item.href} active={active} />
    </div>
  );
};

type UserMenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
};

const USER_MENU_ITEMS: UserMenuItem[] = [
  { id: "profile", label: "Profile", icon: User, href: "/team/users/1" },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "language", label: "Language", icon: Languages },
  { id: "checklists", label: "Checklists", icon: SquareCheckBig, href: "/tracker/checklists" },
  { id: "notes", label: "Notes", icon: NotebookPen, href: "/tracker/notes" },
  { id: "mindmaps", label: "Mind Maps", icon: Workflow, href: "/tracker/mindmaps" },
  { id: "open-on-phone", label: "Open on phone", icon: Smartphone },
  { id: "logout", label: "Log out", icon: LogOut, href: "/logout" },
];

const railProfileButtonClass =
  "flex size-7 items-center justify-center overflow-hidden rounded-full bg-[color:var(--corportal-rail-hover)] text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-active)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]";

const UserMenu = () => {
  const router = useRouter();

  const handleSelect = (item: UserMenuItem) => {
    if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button type="button" className={railProfileButtonClass} aria-label="User menu">
            <User aria-hidden className="size-4" strokeWidth={2} />
          </button>
        }
      />
      <DropdownMenuContent align="end" side="right">
        <DropdownMenuGroup>
          {USER_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.id}
                onClick={() => handleSelect(item)}
                aria-label={item.label}
                variant={item.id === "logout" ? "destructive" : "default"}
              >
                <Icon aria-hidden className="size-4" />
                <span>{item.label}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
              aria-label="Switch tenant"
            >
              <RailFaviconIcon />
            </Button>
          }
        />
      )}
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tenant</DropdownMenuLabel>
          {DEMO_TENANTS.map((tenant) => {
            const active = tenant.id === currentTenant.id;
            return (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleSelectTenant(tenant.id)}
                aria-label={`Select tenant ${tenant.label}`}
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
      aria-label="Sections"
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
                  active={item.match === "/pulse" ? isPulseRoute(pathname) : pathname.startsWith(item.match)}
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
  const { collapsed, setCollapsed } = useSidebarAside();
  const [flyout, setFlyout] = useState<{ item: RailSectionItem; style: CSSProperties } | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeFlyout = useCallback(() => {
    clearCloseTimer();
    setFlyout(null);
  }, [clearCloseTimer]);

  // Закрываем не сразу, чтобы успеть перевести курсор с пункта рейла на панель.
  const scheduleCloseFlyout = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setFlyout(null), 140);
  }, [clearCloseTimer]);

  const openFlyout = useCallback(
    (item: RailSectionItem, anchor: HTMLElement) => {
      clearCloseTimer();
      const rect = anchor.getBoundingClientRect();
      // Для пунктов в нижней части экрана раскрываем панель вверх, чтобы не выходить за вьюпорт.
      const placeAbove = rect.top > window.innerHeight * 0.55;
      const style: CSSProperties = placeAbove
        ? { bottom: Math.max(8, window.innerHeight - rect.bottom), maxHeight: rect.bottom - 8 }
        : { top: Math.max(8, rect.top), maxHeight: window.innerHeight - rect.top - 8 };
      setFlyout({ item, style });
    },
    [clearCloseTimer],
  );

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  // Когда aside развёрнут, всплывающее подменю не нужно.
  useEffect(() => {
    if (!collapsed) {
      closeFlyout();
    }
  }, [collapsed, closeFlyout]);

  const handleOpenSearch = () => setIsSearchOpen(true);
  const handleCloseSearch = () => setIsSearchOpen(false);
  const handleCloseMobileNav = () => setIsMobileNavOpen(false);
  const handleBurgerClick = () => setIsMobileNavOpen(true);

  const currentAsideContent = useMemo(() => {
    const matches = (prefix: string) => currentPathname === prefix || currentPathname.startsWith(`${prefix}/`);

    if (matches("/store") || matches("/pim")) {
      return (
        <MobileAsideSection title="Store">
          <StoreAsideContent onItemClick={handleCloseMobileNav} />
        </MobileAsideSection>
      );
    }

    if (matches("/team")) {
      return (
        <MobileAsideSection title="Team">
          <TeamAsideContent onItemClick={handleCloseMobileNav} />
        </MobileAsideSection>
      );
    }

    if (currentPathname === "/" || matches("/pulse")) {
      return (
        <MobileAsideSection title="Pulse">
          <PulseHomeAsideContent onItemClick={handleCloseMobileNav} />
        </MobileAsideSection>
      );
    }

    const entry = MOBILE_ASIDE_ENTRIES.find((item) => matches(item.match));
    if (entry) {
      return (
        <MobileAsideSection title={entry.title}>
          <ModuleSubnav items={entry.items} navAriaLabel={entry.ariaLabel} onItemClick={handleCloseMobileNav} />
        </MobileAsideSection>
      );
    }

    return null;
  }, [currentPathname]);

  const mobileBottomNavItems: MobileNavItem[] = [
    { key: "tenant", icon: RailFaviconIcon, ariaLabel: "Switch tenant", onClick: () => setIsTenantOpen(true) },
    { key: "tasks", icon: SquareCheckBig, ariaLabel: "Tasks", onClick: () => router.push("/tracker/tasks") },
    { key: "search", icon: Search, ariaLabel: "Open search", onClick: handleOpenSearch },
    { key: "profile", icon: User, ariaLabel: "Profile", onClick: () => router.push("/team/users/1") },
    { key: "menu", icon: Menu, ariaLabel: "Open menu", onClick: handleBurgerClick },
  ];

  return (
    <>
      <LeftDockShell
        className="hidden bg-corportal-rail left-0 z-40 w-12 items-center overflow-y-auto py-0 no-scrollbar sm:flex"
        ariaLabel="Main navigation"
      >
        <div data-rail-expand className="w-full justify-center px-1 pt-3">
          <RailIconButton
            label="Expand menu"
            icon={ChevronsRight}
            onClick={() => setCollapsed(false)}
          />
        </div>

        <div className="flex w-full justify-center px-3 py-3">
          <TenantSwitcher />
        </div>

        <div className="flex w-full flex-col items-center gap-3 px-1 pb-2">
          <RailIconButton
            label="Search"
            icon={Search}
            onClick={handleOpenSearch}
            active={isSearchOpen}
          />
        </div>

        <div className="no-scrollbar flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto px-1 pt-1">
          {RAIL_PRIMARY_ITEMS.map((item) => (
            <RailNavItem
              key={item.label}
              item={item}
              active={getPrimaryItemActive(item, currentPathname)}
              flyoutEnabled={collapsed && hasRailFlyout(item.match)}
              onOpen={openFlyout}
              onScheduleClose={scheduleCloseFlyout}
            />
          ))}
        </div>

        <div className="flex w-full flex-col items-center gap-2 px-1 py-2">
          {RAIL_FOOTER_ITEMS.map((item) => (
            <RailNavItem
              key={item.label}
              item={item}
              active={getFooterItemActive(item, currentPathname)}
              flyoutEnabled={collapsed && hasRailFlyout(item.match)}
              onOpen={openFlyout}
              onScheduleClose={scheduleCloseFlyout}
            />
          ))}
        </div>

        <div className="flex w-full justify-center px-2 py-2">
          <UserMenu />
        </div>
      </LeftDockShell>

      {flyout ? (
        <RailFlyout
          item={flyout.item}
          style={flyout.style}
          onCancelClose={clearCloseTimer}
          onScheduleClose={scheduleCloseFlyout}
          onNavigate={closeFlyout}
          onClose={closeFlyout}
        />
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-corportal-rail-gradient-from m-2 p-1 rounded-xl sm:hidden" aria-label="Bottom navigation">
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
