import type { Metadata } from "next";
import { ThanksPage } from "@/features/pulse/thanks/thanks-page";

export const metadata: Metadata = {
  title: "My thanks | Oryx BMS",
  description: "Thank-you messages you have sent to colleagues",
};

const PulseThanksPage = () => <ThanksPage />;

export default PulseThanksPage;
