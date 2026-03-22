import { redirect } from "next/navigation";
import { DEFAULT_ORDER_ID } from "@/domain/packing/constants";

const PimIndexPage = () => {
  redirect(`/pim/orders/${DEFAULT_ORDER_ID}`);
};

export default PimIndexPage;
