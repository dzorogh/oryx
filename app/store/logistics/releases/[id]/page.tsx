import { redirect } from "next/navigation";

export const metadata = {
  title: "Release | Store Logistics | Oryx BMS",
  description: "Redirects to unified Reservations",
};

const Page = () => {
  redirect("/store/logistics/reservations?operation=release");
};

export default Page;
