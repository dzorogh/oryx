import type { ModuleSubnavItem } from "@/components/layout/module-subnav";

export const PULSE_SUBNAV_ITEMS: ModuleSubnavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/pulse/company", label: "Company workspace" },
  { href: "/pulse/ideas", label: "Ideas" },
  { href: "/pulse/news", label: "News" },
  { href: "/pulse/polls", label: "Polls" },
  { href: "/pulse/thanks", label: "Thanks" },
  { href: "/pulse/approvals/invoices", label: "Invoice Approvals" },
  { href: "/pulse/approvals/payments", label: "Payment Approvals" },
];
