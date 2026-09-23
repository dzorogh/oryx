"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModuleSubnavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: LucideIcon;
};

export type ModuleSubnavGroup = {
  /** When omitted, the group has no heading (footer links). */
  title?: string;
  items: ModuleSubnavItem[];
};

type ModuleSubnavProps = {
  items?: ModuleSubnavItem[];
  groups?: ModuleSubnavGroup[];
  navAriaLabel: string;
  onItemClick?: () => void;
  className?: string;
};

const isActive = (pathname: string, item: ModuleSubnavItem): boolean =>
  item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

const NavItem = ({
  item,
  active,
  onItemClick,
}: {
  item: ModuleSubnavItem;
  active: boolean;
  onItemClick?: () => void;
}) => {
  const Icon = item.icon;
  return (
    <li>
      <Button
        variant="ghost"
        nativeButton={false}
        className={cn(
          "h-auto min-h-8 w-full justify-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-normal leading-snug whitespace-normal text-muted-foreground hover:bg-muted hover:text-foreground",
          active && "bg-muted font-medium text-foreground",
        )}
        render={
          <Link
            href={item.href}
            onClick={onItemClick}
            aria-current={active ? "page" : undefined}
            className="inline-flex w-full items-start gap-2"
          />
        }
      >
        {Icon ? (
          <Icon
            className={cn("mt-0.5 size-[15px] shrink-0 text-muted-foreground", active && "text-foreground")}
            aria-hidden
          />
        ) : null}
        <span className="min-w-0 flex-1 whitespace-normal">{item.label}</span>
      </Button>
    </li>
  );
};

const NavGroup = ({
  group,
  pathname,
  onItemClick,
}: {
  group: ModuleSubnavGroup;
  pathname: string;
  onItemClick?: () => void;
}) => (
  <div className="flex flex-col gap-0.5">
    {group.title ? (
      <p className="px-2 pb-1 text-xs font-semibold tracking-[0.06em] text-muted-foreground/70 uppercase">
        {group.title}
      </p>
    ) : null}
    <ul className="flex flex-col gap-0.5">
      {group.items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          active={isActive(pathname, item)}
          onItemClick={onItemClick}
        />
      ))}
    </ul>
  </div>
);

export const ModuleSubnav = ({
  items,
  groups,
  navAriaLabel,
  onItemClick,
  className,
}: ModuleSubnavProps) => {
  const pathname = usePathname();
  const current = pathname ?? "";

  if (groups && groups.length > 0) {
    return (
      <nav aria-label={navAriaLabel} className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
        <div className="flex flex-col gap-3.5">
          {groups.map((group, index) => (
            <NavGroup
              key={group.title ?? `group-${index}`}
              group={group}
              pathname={current}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label={navAriaLabel} className={cn("min-h-0 flex-1 overflow-y-auto", className)}>
      <ul className="flex flex-col gap-0.5">
        {(items ?? []).map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(current, item)}
            onItemClick={onItemClick}
          />
        ))}
      </ul>
    </nav>
  );
};
