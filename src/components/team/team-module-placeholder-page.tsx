type TeamModulePlaceholderPageProps = {
  title: string;
  description: string;
};

export const TeamModulePlaceholderPage = ({
  title,
  description,
}: TeamModulePlaceholderPageProps) => (
  <section className="flex min-h-screen items-start p-5">
    <div className="w-full max-w-4xl rounded-xl border border-[var(--corportal-border-grey)] bg-card p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="pt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  </section>
);
