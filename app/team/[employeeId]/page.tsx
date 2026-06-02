import { permanentRedirect } from "next/navigation";
import { USER_PROFILE_ROUTE_IDS } from "@/features/users/profile/user-profile-demo-data";

export const generateStaticParams = () =>
  USER_PROFILE_ROUTE_IDS.map((employeeId) => ({ employeeId }));

type TeamLegacyRedirectProps = {
  params: Promise<{ employeeId: string }>;
};

const TeamLegacyRedirectPage = async ({ params }: TeamLegacyRedirectProps) => {
  const { employeeId } = await params;
  permanentRedirect(`/team/users/${employeeId}`);
};

export default TeamLegacyRedirectPage;
