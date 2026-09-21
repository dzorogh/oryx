import Link from "next/link";
import type { TransferActivityEvent } from "@/features/logistics/transfer-detail-projection";

const formatActivityStamp = (value: string): { date: string; time: string } => {
  const date = new Date(value);
  return {
    date: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    time: date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", hour12: false }),
  };
};

export const TransferActivity = ({ events }: { events: TransferActivityEvent[] }) => (
  <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-card lg:min-w-[280px]">
    <div className="border-b border-border px-3 py-2">
      <h2 className="text-sm font-semibold">История документа</h2>
    </div>
    {events.length === 0 ? (
      <p className="px-3 py-8 text-center text-sm text-muted-foreground">Пока нет событий.</p>
    ) : (
      <ol className="px-3 pb-2">
        {events.map((event, index) => {
          const stamp = formatActivityStamp(event.occurredAt);
          return (
            <li
              key={event.id}
              className="grid grid-cols-[4.5rem_10px_minmax(0,1fr)] gap-2 border-b border-border py-2.5 last:border-b-0"
            >
              <time dateTime={event.occurredAt} className="text-[11px] text-muted-foreground tabular-nums">
                <span className="block">{stamp.date}</span>
                <span className="block">{stamp.time}</span>
              </time>
              <span className="relative" aria-hidden="true">
                <span className="absolute top-1 left-0.5 size-1.5 rounded-full bg-muted-foreground/70" />
                {index < events.length - 1 ? (
                  <span className="absolute top-3 bottom-[-14px] left-[4.5px] w-px bg-border" />
                ) : null}
              </span>
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-foreground">{event.title}</p>
                {event.detail ? <p className="text-muted-foreground">{event.detail}</p> : null}
                {event.refLabel ? (
                  event.href ? (
                    <Link href={event.href} className="mt-0.5 inline-block font-semibold text-primary hover:underline">
                      {event.refLabel}
                    </Link>
                  ) : (
                    <span className="mt-0.5 inline-block font-semibold">{event.refLabel}</span>
                  )
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    )}
  </section>
);
