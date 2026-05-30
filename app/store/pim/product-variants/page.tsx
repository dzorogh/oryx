import { redirect } from "next/navigation";

const StoreProductVariantsRedirectPage = () => {
  redirect("/store/pim/products?listing=variants");
};

export default StoreProductVariantsRedirectPage;
