"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, GraduationCap, HelpCircle, Hexagon, Home, Search, ShoppingCart, ShieldCheck, Store, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";
import { cn } from "@/lib/utils";

type RailIconButtonProps = {
  label: string;
  icon: LucideIcon;
  href: string;
  active?: boolean;
};

/** Фавикон рейла — Figma node 40023000:133773 (Corportal Favicon). */
const RailFavicon = () => (
  <div
    className="relative size-6 shrink-0 overflow-hidden rounded-sm bg-[#b7f272]"
    aria-hidden
  >
    <div className="absolute inset-[20.17%_44.64%_18.88%_21.46%]">
      <svg
        className="block size-full"
        viewBox="0 0 40.6867 73.133"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M35.7218 29.4766L33.2646 26.277L32.8186 25.7017L12.8918 0H0L30.7107 38.8822V73.1162L40.6867 73.133V35.5777L35.7218 29.4766Z"
          fill="#1A1E29"
        />
      </svg>
    </div>
    <div className="absolute inset-[20.17%_21.03%_58.8%_52.79%]">
      <svg
        className="block size-full"
        viewBox="0 0 31.4163 25.236"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path
          d="M31.4163 0C31.4163 0 9.74333 20.7779 9.24426 21.2637C11.2488 18.0617 13.7368 7.90369 19.2391 0.0168972L0 25.236H12.3769L31.4163 0Z"
          fill="#1A1E29"
        />
      </svg>
    </div>
  </div>
);

const RailIconButton = ({ label, icon: Icon, href, active }: RailIconButtonProps) => (
  <Link
    href={href}
    className={cn(
      "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white/40",
      active && "bg-white/15 text-white",
    )}
    aria-label={label}
    aria-current={active ? "page" : undefined}
  >
    {active ? (
      <span
        className="absolute -left-0.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white"
        aria-hidden
      />
    ) : null}
    <Icon aria-hidden className="size-5" strokeWidth={2} />
  </Link>
);

/** Левый навигационный рейл по макету Corportal (Figma node 40023000:133768). Логотип — 40023000:133773. */
export const NavRail = () => {
  const pathname = usePathname();
  const currentPathname = pathname ?? "/";

  const navItems = [
    { label: "Поиск", icon: Search, href: "/search", match: "/search" },
    { label: "Главная", icon: Home, href: "/", match: "/" },
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
    <aside
      className="fixed left-0 top-0 z-40 flex h-svh w-12 flex-col items-center overflow-y-auto border-r border-solid border-[var(--corportal-border-grey)] bg-[linear-gradient(355deg,#1a2445_32.34%,var(--Brand-Common-BrandColor_Pressed)_36.11%,var(--corportal-rail)_71.81%)] py-0 text-white no-scrollbar"
      aria-label="Основная навигация"
    >
      <div className="flex w-full justify-center px-3 py-3">
        <RailFavicon />
      </div>

      <div className="flex w-full flex-col items-center gap-3 px-1 pb-2">
        <RailIconButton
          label={navItems[0].label}
          icon={navItems[0].icon}
          href={navItems[0].href}
          active={currentPathname.startsWith(navItems[0].match)}
        />
      </div>

      <div className="flex w-full flex-1 flex-col items-center gap-2 px-1 pt-1">
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
      </div>

      <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 px-1 py-2">
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

      <div className="flex w-full justify-center border-t border-white/10 px-2 py-2">
        <Link
          href="/profile"
          className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Профиль"
        >
          <User aria-hidden className="size-4" strokeWidth={2} />
        </Link>
      </div>
    </aside>
  );
};
