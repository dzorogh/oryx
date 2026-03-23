import { Bell, Boxes, ClipboardCheck, Users } from "lucide-react";

type OverviewCard = {
  id: string;
  title: string;
  description: string;
  value: string;
  Icon: typeof Boxes;
};

const OVERVIEW_CARDS: OverviewCard[] = [
  {
    id: "approvals",
    title: "Согласования",
    description: "Требуют внимания",
    value: "8",
    Icon: ClipboardCheck,
  },
  {
    id: "orders",
    title: "Упаковка и заказы",
    description: "Активных заказов",
    value: "12",
    Icon: Boxes,
  },
  {
    id: "team",
    title: "Команда",
    description: "Новых уведомлений",
    value: "5",
    Icon: Users,
  },
  {
    id: "alerts",
    title: "Активность",
    description: "Новых событий",
    value: "23",
    Icon: Bell,
  },
];

export const HomeOverviewGrid = () => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {OVERVIEW_CARDS.map(({ id, title, description, value, Icon }) => (
      <article
        key={id}
        className="flex min-h-32 flex-col justify-between rounded-xl border border-[var(--corportal-border-grey)] bg-card p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
          <div className="rounded-md bg-muted p-2 text-muted-foreground">
            <Icon aria-hidden className="size-4" />
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-2xl font-bold leading-none text-foreground">{value}</p>
          <p className="pt-1 text-xs text-muted-foreground">{description}</p>
        </div>
      </article>
    ))}
  </div>
);
