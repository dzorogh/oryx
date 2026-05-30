import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polls | Oryx BMS",
  description: "Company polls and voting",
};

const PulsePollsPage = () => (
  <section className="p-5">
    <div className="w-full max-w-4xl rounded-xl border border-[var(--corportal-border-grey)] bg-card p-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Polls</h1>
      <p className="pt-2 text-sm text-muted-foreground">
        The polls section is ready: active votes and archived results will appear here.
      </p>
    </div>
  </section>
);

export default PulsePollsPage;
