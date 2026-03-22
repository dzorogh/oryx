import type { LucideIcon } from "lucide-react";
import {
  Activity,
  GraduationCap,
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
import { cn } from "@/lib/utils";

type RailIconButtonProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

const RailIconButton = ({ label, icon: Icon, active }: RailIconButtonProps) => (
  <button
    type="button"
    className={cn(
      "relative inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:ring-2 focus-visible:ring-white/40",
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
  </button>
);

/** Левый навигационный рейл по макету Corportal (Figma node 40023000:133768). */
export const IconRail = () => (
  <aside
    className="corportal-icon-rail fixed left-0 top-0 z-40 flex h-svh w-12 flex-col items-center overflow-y-auto py-0 text-white"
    aria-label="Основная навигация"
  >
    <div className="flex w-full justify-center px-3 py-3">
      <div
        className="flex size-6 items-center justify-center rounded bg-[#b7f272] text-[10px] font-bold leading-none text-[#0f172a]"
        aria-hidden
      >
        Y
      </div>
    </div>

    <div className="flex w-full flex-col items-center gap-3 px-1 pb-2">
      <RailIconButton label="Поиск" icon={Search} />
    </div>

    <div className="flex w-full flex-1 flex-col items-center gap-2 px-1 pt-1">
      <RailIconButton label="Главная" icon={Home} />
      <RailIconButton label="Согласования" icon={ShieldCheck} />
      <RailIconButton label="Упаковка и заказы" icon={ShoppingCart} active />
      <RailIconButton label="Активность" icon={Activity} />
      <RailIconButton label="Команда" icon={Users} />
      <RailIconButton label="Обучение" icon={GraduationCap} />
      <RailIconButton label="Каталог" icon={Store} />
    </div>

    <div className="flex w-full flex-col items-center gap-2 border-t border-white/10 px-1 py-2">
      <RailIconButton label="Сервисы" icon={Hexagon} />
      <RailIconButton label="Справка" icon={HelpCircle} />
    </div>

    <div className="flex w-full justify-center border-t border-white/10 px-2 py-2">
      <div
        className="flex size-7 items-center justify-center overflow-hidden rounded-full bg-[#e9e9f1] text-[#3d4c6a]"
        aria-label="Профиль"
      >
        <User aria-hidden className="size-4" strokeWidth={2} />
      </div>
    </div>
  </aside>
);
