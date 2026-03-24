import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Опросы | Oryx BMS",
  description: "Корпоративные опросы и голосования",
};

const PulsePollsPage = () => (
  <section className="p-5">
    <div className="w-full max-w-4xl rounded-xl border border-[var(--corportal-border-grey)] bg-card p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Опросы</h1>
      <p className="pt-2 text-sm text-muted-foreground">
        Раздел опросов подготовлен: здесь будут активные голосования и архив результатов.
      </p>
    </div>
  </section>
);

export default PulsePollsPage;
