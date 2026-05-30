import type { Metadata } from "next";
import { ModuleShell } from "@/components/layout/module-shell";
import { PULSE_SUBNAV_ITEMS } from "@/features/pulse/pulse-nav";
import { PulseHomePage } from "@/features/pulse/pulse-home-page";
import { PulseHomeAsideContent } from "@/features/pulse/pulse-home-aside-content";

export const metadata: Metadata = {
  title: "Home | Pulse | Oryx BMS",
  description: "Pulse home feed: news, rankings, tasks, and widgets",
};

const HomePage = () => (
  <ModuleShell
    moduleTitle="Pulse"
    asideLabel="Pulse"
    subnavItems={PULSE_SUBNAV_ITEMS}
    subnavAriaLabel="Pulse sections"
    asideContent={<PulseHomeAsideContent />}
  >
    <PulseHomePage />
  </ModuleShell>
);

export default HomePage;
