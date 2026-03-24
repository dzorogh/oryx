"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  GraduationCap,
  HeartPulse,
  HelpCircle,
  Hexagon,
  Home,
  Search,
  ShoppingCart,
  ShieldCheck,
  Store,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlobalSearchModal } from "@/components/layout/global-search-modal";
import { LeftDockShell } from "@/components/layout/left-dock-shell";
import { ScrollableRegion } from "@/components/layout/scrollable-region";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";
import { cn } from "@/lib/utils";

type RailIconButtonProps = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

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

/** Левый навигационный рейл по макету Corportal (Figma node 40023000:133768). Логотип — 40023000:133773. */
export const NavRail = () => {
  const pathname = usePathname();
  const currentPathname = pathname ?? "/";
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { label: "Поиск", icon: Search, href: "/search", match: "/search" },
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
  ] as const;

  const footerItems = [
    { label: "Сервисы", icon: Hexagon, href: "/services", match: "/services" },
    { label: "Справка", icon: HelpCircle, href: "/help", match: "/help" },
  ] as const;

  return (
    <>
      <LeftDockShell
        className="bg-corportal-rail left-0 z-40 w-12 items-center overflow-y-auto py-0 no-scrollbar"
        ariaLabel="Основная навигация"
      >
        <div className="flex w-full justify-center px-3 py-3">
          <RailFavicon />
        </div>

        <div className="flex w-full flex-col items-center gap-3 px-1 pb-2">
          <RailIconButton
            label={navItems[0].label}
            icon={navItems[0].icon}
            onClick={() => setIsSearchOpen(true)}
            active={isSearchOpen}
          />
        </div>

        <ScrollableRegion className="no-scrollbar flex w-full flex-1 flex-col items-center gap-2 px-1 pt-1">
          {navItems.slice(1).map((item) => (
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
          {footerItems.map((item) => (
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
      <GlobalSearchModal open={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
