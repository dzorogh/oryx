import Link from "next/link";
import { MY_THANK_YOU_ENTRIES } from "@/components/home/thanks-mine-demo-data";

const ThanksMinePage = () => (
  <main className="min-h-screen pl-12">
    <section className="p-5">
      <div className="rounded-xl bg-card p-5">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Мои благодарности</h1>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-[var(--corportal-border-grey)] bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            aria-label="Вернуться на главную"
          >
            На главную
          </Link>
        </header>

        <ul className="mt-4 flex flex-col gap-3" aria-label="Список отправленных благодарностей">
          {MY_THANK_YOU_ENTRIES.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-[var(--corportal-border-grey)] bg-card p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {entry.recipientName}
                  <span className="font-normal text-muted-foreground"> · {entry.recipientDepartment}</span>
                </p>
                <span className="text-xs text-muted-foreground">{entry.sentAtLabel}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{entry.message}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </main>
);

export default ThanksMinePage;
