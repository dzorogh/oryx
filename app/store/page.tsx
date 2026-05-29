import { redirect } from "next/navigation";

const StoreIndexPage = () => {
  redirect("/store/pim/products");
};

export default StoreIndexPage;
