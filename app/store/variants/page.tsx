import { redirect } from "next/navigation";

const StoreVariantsRedirectPage = () => {
  redirect("/store/pim/products?listing=variants");
};

export default StoreVariantsRedirectPage;
