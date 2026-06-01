import {
  Activity,
  ChevronRight,
  Clock3,
  FileBarChart2,
  Filter,
  LineChart,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type ReportVisual = {
  description: string;
  icon: LucideIcon;
  iconClassName: string;
};

const DEFAULT_REPORT_VISUAL: ReportVisual = {
  description: "Open dashboard",
  icon: FileBarChart2,
  iconClassName: "bg-muted text-muted-foreground",
};

const REPORT_VISUALS: Record<string, ReportVisual> = {
  "sales overview": {
    description: "Revenue, orders, and conversion",
    icon: LineChart,
    iconClassName: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
  "inventory health": {
    description: "Stock levels and turnover",
    icon: Package,
    iconClassName: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  "operational kpis": {
    description: "Daily performance metrics",
    icon: Activity,
    iconClassName: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  "order funnel": {
    description: "Pipeline stages and drop-off",
    icon: Filter,
    iconClassName: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "sla and deadline compliance": {
    description: "On-time delivery and response",
    icon: Clock3,
    iconClassName: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "logistics: timelines and throughput": {
    description: "Shipments, routes, and capacity",
    icon: Truck,
    iconClassName: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
};

export const getReportVisual = (title: string): ReportVisual => {
  const key = title.trim().toLowerCase();
  return REPORT_VISUALS[key] ?? DEFAULT_REPORT_VISUAL;
};

type ReportLinkCardProps = {
  title: string;
  href: string;
  ariaLabel?: string;
  className?: string;
};

export const ReportLinkCard = ({ title, href, ariaLabel, className }: ReportLinkCardProps) => {
  const { description, icon: Icon, iconClassName } = getReportVisual(title);

  return (
    <Link
      href={href}
      className={
        className ??
        "group flex min-h-0 w-full items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-card-foreground no-underline transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      }
      aria-label={ariaLabel ?? `Open report: ${title}`}
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        aria-hidden
      >
        <Icon className="size-5" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 text-sm font-semibold leading-snug text-foreground">{title}</span>
        <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">{description}</span>
      </span>

      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
};
