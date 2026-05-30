import type { Metadata } from "next";
import { ThanksPage } from "@/features/pulse/thanks/thanks-page";

export const metadata: Metadata = {
  title: "Thanks | Oryx BMS",
  description: "Received, sent, and company-wide thank-you messages",
};

const PulseThanksPage = () => <ThanksPage />;

export default PulseThanksPage;
