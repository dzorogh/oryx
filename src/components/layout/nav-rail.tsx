"use client";

import { useEffect, useMemo, useState } from "react";
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
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchModal } from "@/components/layout/global-search-modal";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { ScrollableRegion } from "@/components/layout/scrollable-region";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { openMobileAside } from "@/lib/mobile-aside-events";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type RailIconButtonProps = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export type RailSectionItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  match: string;
};

export const RAIL_PRIMARY_ITEMS: RailSectionItem[] = [
  { label: "Главная", icon: Home, href: "/", match: "/" },
  { label: "Пульс компании", icon: HeartPulse, href: "/pulse/news", match: "/pulse" },
  { label: "Согласования", icon: ShieldCheck, href: "/approvals", match: "/approvals" },
  {
    label: "Упаковка и заказы",
    icon: ShoppingCart,
    href: `/pim/orders/${DEFAULT_ORDER_ID}`,
    match: "/pim",
  },
  { label: "Активность", icon: Activity, href: "/activity", match: "/activity" },
  { label: "Команда", icon: Users, href: "/team", match: "/team" },
  { label: "Обучение", icon: GraduationCap, href: "/learning", match: "/learning" },
  { label: "Каталог", icon: Store, href: "/catalog", match: "/catalog" },
];

export const RAIL_FOOTER_ITEMS: RailSectionItem[] = [
  { label: "Сервисы", icon: Hexagon, href: "/services", match: "/services" },
  { label: "Справка", icon: HelpCircle, href: "/help", match: "/help" },
];

/** Фавикон рейла — Figma node 40023000:133773 (Corportal Favicon). */
const RailFavicon = () => (
  <div
    className="relative size-6 shrink-0 overflow-hidden rounded-sm bg-corportal-rail-favicon-surface"
    aria-hidden
  >
    <div className="absolute inset-[20.17%_44.64%_18.88%_21.46%]">
      <svg
        className="block size-full text-corportal-rail-favicon-ink"
        viewBox="0 0 40.6867 73.133"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M35.7218 29.4766L33.2646 26.277L32.8186 25.7017L12.8918 0H0L30.7107 38.8822V73.1162L40.6867 73.133V35.5777L35.7218 29.4766Z"
          fill="currentColor"
        />
      </svg>
    </div>
    <div className="absolute inset-[20.17%_21.03%_58.8%_52.79%]">
      <svg
        className="block size-full text-corportal-rail-favicon-ink"
        viewBox="0 0 31.4163 25.236"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M31.4163 0C31.4163 0 9.74333 20.7779 9.24426 21.2637C11.2488 18.0617 13.7368 7.90369 19.2391 0.0168972L0 25.236H12.3769L31.4163 0Z"
          fill="currentColor"
        />
      </svg>
    </div>
  </div>
);

const railButtonBaseClass =
  "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-hover)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]";

const RailIconButton = ({ label, icon: Icon, href, onClick, active }: RailIconButtonProps) => {
  const className = cn(
    railButtonBaseClass,
    active && "bg-[color:var(--corportal-rail-active)] text-[color:var(--corportal-rail-indicator)]",
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

export const TenantSwitcher = () => {
  const [tenantId, setTenantId] = useState(DEMO_TENANTS[0]?.id ?? "tenant-oryx");

  useEffect(() => {
    const raw = window.localStorage.getItem(TENANT_STORAGE_KEY);
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
    window.localStorage.setItem(TENANT_STORAGE_KEY, nextId);
  };

  const currentTenant = DEMO_TENANTS.find((t) => t.id === tenantId) ?? DEMO_TENANTS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Переключить тенант"
            className="h-8 w-8"
          >
            <RailFavicon />
          </Button>
        }
      />
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

/** Левый навигационный рейл по макету Corportal (Figma node 40023000:133768). Логотип — 40023000:133773. */
export const NavRail = () => {
  const pathname = usePathname();
  const currentPathname = pathname ?? "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const isMobileAsidePage = useMemo(
    () =>
      currentPathname === "/pim" ||
      currentPathname.startsWith("/pim/") ||
      currentPathname === "/pulse" ||
      currentPathname.startsWith("/pulse/"),
    [currentPathname],
  );

  const handleOpenSearch = () => setIsSearchOpen(true);
  const handleCloseSearch = () => setIsSearchOpen(false);
  const handleBurgerClick = () => {
    if (isMobileAsidePage) {
      openMobileAside();
      return;
    }
    setIsMobileNavOpen(true);
  };

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

        <ScrollableRegion className="no-scrollbar flex w-full flex-1 flex-col items-center gap-2 px-1 pt-1">
          {RAIL_PRIMARY_ITEMS.map((item) => (
            <RailIconButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              href={item.href}
              active={
                item.match === "/" ? currentPathname === "/" : currentPathname.startsWith(item.match)
              }
            />
          ))}
        </ScrollableRegion>

        <div className="flex w-full flex-col items-center gap-2 border-t border-[color:var(--corportal-rail-divider)] px-1 py-2">
          {RAIL_FOOTER_ITEMS.map((item) => (
            <RailIconButton
              key={item.label}
              label={item.label}
              icon={item.icon}
              href={item.href}
              active={currentPathname.startsWith(item.match)}
            />
          ))}
        </div>

        <div className="flex w-full justify-center border-t border-[color:var(--corportal-rail-divider)] px-2 py-2">
          <Link
            href="/profile"
            className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[color:var(--corportal-rail-hover)] text-[color:var(--corportal-rail-foreground)] transition-colors hover:bg-[color:var(--corportal-rail-active)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color:var(--corportal-rail-focus-ring)]"
            aria-label="Профиль"
          >
            <User aria-hidden className="size-4" strokeWidth={2} />
          </Link>
        </div>
      </LeftDockShell>

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-corportal-rail sm:hidden" aria-label="Нижняя навигация">
        <div className="border-t border-[color:var(--corportal-rail-divider)] px-2 py-2 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
          <div className="grid grid-cols-5 gap-2">
            <div className="flex h-11 items-center justify-center rounded-lg">
              <TenantSwitcher />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="default"
              className="h-11 w-full gap-0 rounded-lg px-0 py-0 text-[color:var(--corportal-rail-foreground)] hover:bg-[color:var(--corportal-rail-hover)] hover:text-[color:var(--corportal-rail-foreground)]"
              aria-label="Открыть меню"
              onClick={handleBurgerClick}
            >
              <Menu aria-hidden className="size-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="default"
              className={cn(
                "h-11 w-full gap-0 rounded-lg px-0 py-0 text-[color:var(--corportal-rail-foreground)] hover:bg-[color:var(--corportal-rail-hover)] hover:text-[color:var(--corportal-rail-foreground)]",
                isSearchOpen && "bg-[color:var(--corportal-rail-active)]",
              )}
              aria-label="Открыть поиск"
              aria-expanded={isSearchOpen}
              onClick={handleOpenSearch}
            >
              <Search aria-hidden className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="default"
              nativeButton={false}
              className={cn(
                "h-11 w-full gap-0 rounded-lg px-0 py-0 text-[color:var(--corportal-rail-foreground)] hover:bg-[color:var(--corportal-rail-hover)] hover:text-[color:var(--corportal-rail-foreground)]",
                currentPathname === "/" && "bg-[color:var(--corportal-rail-active)]",
              )}
              render={
                <Link
                  href="/"
                  aria-label="Главная"
                  aria-current={currentPathname === "/" ? "page" : undefined}
                  className="inline-flex w-full items-center justify-center"
                />
              }
            >
              <Home aria-hidden className="size-5" />
            </Button>

            <Button
              variant="ghost"
              size="default"
              nativeButton={false}
              className={cn(
                "h-11 w-full gap-0 rounded-lg px-0 py-0 text-[color:var(--corportal-rail-foreground)] hover:bg-[color:var(--corportal-rail-hover)] hover:text-[color:var(--corportal-rail-foreground)]",
                currentPathname.startsWith("/profile") && "bg-[color:var(--corportal-rail-active)]",
              )}
              render={
                <Link
                  href="/profile"
                  aria-label="Профиль"
                  aria-current={currentPathname.startsWith("/profile") ? "page" : undefined}
                  className="inline-flex w-full items-center justify-center"
                />
              }
            >
              <User aria-hidden className="size-5" />
            </Button>
          </div>
        </div>
      </nav>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-[60] sm:hidden" role="dialog" aria-modal="true" aria-label="Разделы">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsMobileNavOpen(false)} />
          <div className="absolute inset-0 overflow-y-auto bg-card p-4 pt-14">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-md border border-border bg-card text-foreground"
              aria-label="Закрыть меню"
            >
              <X aria-hidden className="size-4" />
            </button>

            <div className="pb-2">
              <TenantSwitcher />
            </div>

            <div className="space-y-1">
              {RAIL_PRIMARY_ITEMS.map((item) => {
                const active = item.match === "/" ? currentPathname === "/" : currentPathname.startsWith(item.match);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant={active ? "secondary" : "ghost"}
                    size="default"
                    nativeButton={false}
                    className="h-11 w-full justify-start gap-3"
                    render={
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className="inline-flex w-full items-center gap-3"
                      />
                    }
                  >
                    <Icon aria-hidden className="size-5" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>

            <div className="my-3 h-px bg-border" />

            <div className="space-y-1">
              {RAIL_FOOTER_ITEMS.map((item) => {
                const active = currentPathname.startsWith(item.match);
                const Icon = item.icon;
                return (
                  <Button
                    key={item.label}
                    variant={active ? "secondary" : "ghost"}
                    size="default"
                    nativeButton={false}
                    className="h-11 w-full justify-start gap-3"
                    render={
                      <Link
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className="inline-flex w-full items-center gap-3"
                      />
                    }
                  >
                    <Icon aria-hidden className="size-5" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <GlobalSearchModal open={isSearchOpen} onClose={handleCloseSearch} />
    </>
  );
};
