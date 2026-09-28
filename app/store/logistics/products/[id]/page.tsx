import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

const Page = async ({ params }: PageProps) => {
  const { id } = await params;
  redirect(`/store/pim/variants/${id}`);
};

export default Page;
