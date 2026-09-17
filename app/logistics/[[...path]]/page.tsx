import { redirect } from "next/navigation";
import { redirectLegacyLogisticsPath } from "@/features/logistics/logistics-paths";

type LegacyLogisticsPageProps = {
  params: Promise<{ path?: string[] }>;
};

const LegacyLogisticsPage = async ({ params }: LegacyLogisticsPageProps) => {
  const { path } = await params;
  redirect(redirectLegacyLogisticsPath(path));
};

export default LegacyLogisticsPage;
