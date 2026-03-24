import type { LucideIcon } from "lucide-react";
import { ChevronUp, ChevronsDown, ChevronsUp } from "lucide-react";
import { CorportalSoftBadge } from "@/components/ui/corportal-soft-badge";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "./tasks-today-demo-data";

/** Бейдж приоритета (тот же `CorportalSoftBadge`, что и статусы идей). Figma node 40007746:22096. */
const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; Icon: LucideIcon; containerClass: string; iconClass: string; textClass: string }
> = {
  high: {
    label: "Высокий",
    Icon: ChevronsUp,
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
    <CorportalSoftBadge
      className={cn(containerClass, textClass, className)}
      icon={Icon}
      iconClassName={iconClass}
      data-node-id="40007746:22096"
    >
      {label}
    </CorportalSoftBadge>
  );
};
