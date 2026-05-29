type ModulePlaceholderPageProps = {
  title: string;
  description?: string;
};

/** Заглушка раздела внутри ModuleShell (без собственного main/offset — их даёт лейаут модуля). */
export const ModulePlaceholderPage = ({ title, description }: ModulePlaceholderPageProps) => (
  <section className="flex min-h-screen items-start p-5">
    <div className="w-full max-w-4xl rounded-xl border border-[var(--corportal-border-grey)] bg-card p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="pt-2 text-sm text-muted-foreground">
        {description ?? `The ${title} section is ready for data and widgets.`}
      </p>
    </div>
  </section>
);
