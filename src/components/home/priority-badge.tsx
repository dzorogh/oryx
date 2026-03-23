import type { LucideIcon } from "lucide-react";
import { ChevronUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "./tasks-today-demo-data";

/** Бейдж приоритета по макету Figma node 40007746:22096 (иконка + подпись, фон tint). */
const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; Icon: LucideIcon; containerClass: string; iconClass: string; textClass: string }
> = {
  high: {
    label: "Высокий",
    Icon: ChevronsUp,
    /** Фон как в Figma: rgba(190,18,60,0.1) ≈ rose-600/10 */
    containerClass: "bg-rose-600/10",
    iconClass: "text-rose-700",
    textClass: "text-foreground",
  },
  medium: {
    label: "Средний",
    Icon: ChevronUp,
    containerClass: "bg-amber-500/10",
    iconClass: "text-amber-700",
    textClass: "text-foreground",
  },
  low: {
    label: "Низкий",
    Icon: ChevronsDown,
    containerClass: "bg-muted",
    iconClass: "text-muted-foreground",
    textClass: "text-muted-foreground",
  },
};

type PriorityBadgeProps = {
  priority: TaskPriority;
  className?: string;
};

export const PriorityBadge = ({ priority, className }: PriorityBadgeProps) => {
  const { label, Icon, containerClass, iconClass, textClass } = PRIORITY_CONFIG[priority];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-sm px-1 py-0.5",
        containerClass,
        className,
      )}
      data-node-id="40007746:22096"
    >
      <Icon aria-hidden className={cn("size-4", iconClass)} strokeWidth={2} />
      <span className={cn("whitespace-nowrap text-xs font-normal leading-snug", textClass)}>{label}</span>
    </span>
  );
};
