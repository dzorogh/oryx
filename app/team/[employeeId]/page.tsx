import { permanentRedirect } from "next/navigation";
import { TEAM_PROFILE_DEMO_IDS } from "@/components/team/team-profile-demo-data";

export function generateStaticParams() {
  return TEAM_PROFILE_DEMO_IDS.map((employeeId) => ({ employeeId }));
}

type TeamProfileRouteProps = {
  params: Promise<{ employeeId: string }>;
};

const TeamProfileRoute = async ({ params }: TeamProfileRouteProps) => {
  const { employeeId } = await params;
  permanentRedirect(`/team/users/${employeeId}`);
};

export default TeamProfileRoute;
