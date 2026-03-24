"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ModuleSubnavItem = {
  href: string;
  label: string;
};

type ModuleSubnavProps = {
  items: ModuleSubnavItem[];
  navAriaLabel: string;
};

export const ModuleSubnav = ({ items, navAriaLabel }: ModuleSubnavProps) => {
  const pathname = usePathname();
  const current = pathname ?? "";

  return (
    <nav aria-label={navAriaLabel} className="min-h-0 flex-1 overflow-y-auto">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = current === item.href || current.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Button
                variant="ghost"
                nativeButton={false}
                className={cn(
                  "h-auto w-full justify-start rounded-lg px-2 py-2 text-left text-[12px] font-normal leading-[1.2] text-muted-foreground hover:bg-muted hover:text-foreground",
                  active && "bg-muted font-medium text-foreground",
                )}
                render={
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className="inline-flex w-full items-center"
                  />
                }
              >
                {item.label}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
