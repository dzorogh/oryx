import {
  Building2,
  Megaphone,
  Monitor,
  Scale,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  RequestSection,
  RequestSectionIcon as RequestSectionIconKey,
  RequestSectionTone,
} from "@/features/tracker/requests/requests-catalog";
import type { MyRequestStatus } from "@/features/tracker/requests/my-requests";
import { cn } from "@/lib/utils";

const ICONS: Record<RequestSectionIconKey, LucideIcon> = {
  monitor: Monitor,
  users: Users,
  wallet: Wallet,
  building: Building2,
  scale: Scale,
  cart: ShoppingCart,
  megaphone: Megaphone,
};

const TONES: Record<RequestSectionTone, string> = {
  blue: "bg-blue-50 text-blue-600",
  violet: "bg-violet-50 text-violet-600",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-orange-50 text-orange-700",
  slate: "bg-slate-100 text-slate-700",
  cyan: "bg-cyan-50 text-cyan-700",
  pink: "bg-pink-50 text-pink-700",
};

const SIZES = {
  sm: { box: "size-6 rounded-md", icon: "size-3.5" },
  md: { box: "size-9 rounded-lg", icon: "size-4" },
  lg: { box: "size-11 rounded-xl", icon: "size-5" },
} as const;

type RequestSectionIconProps = {
  section: Pick<RequestSection, "icon" | "tone">;
  size?: keyof typeof SIZES;
  className?: string;
};

export const RequestSectionIcon = ({ section, size = "md", className }: RequestSectionIconProps) => {
  const Icon = ICONS[section.icon];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center", SIZES[size].box, TONES[section.tone], className)}
    >
      <Icon className={SIZES[size].icon} />
    </span>
  );
};

const STATUS_DOT: Record<MyRequestStatus, string> = {
  new: "bg-slate-400",
  approval: "bg-violet-500",
  progress: "bg-blue-500",
  waiting: "bg-amber-500",
  done: "bg-emerald-500",
  rejected: "bg-red-500",
};

export const RequestStatusDot = ({ status }: { status: MyRequestStatus }) => (
  <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", STATUS_DOT[status])} />
);
