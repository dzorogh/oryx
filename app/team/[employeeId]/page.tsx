import { notFound } from "next/navigation";
import { TeamProfilePage } from "@/components/team/team-profile-page";
import { TEAM_PROFILE_DEMO_IDS, getTeamProfileDemoById } from "@/components/team/team-profile-demo-data";

export const generateStaticParams = () =>
  TEAM_PROFILE_DEMO_IDS.map((employeeId) => ({ employeeId }));

type TeamProfileRouteProps = {
  params: Promise<{ employeeId: string }>;
};

const TeamProfileRoute = async ({ params }: TeamProfileRouteProps) => {
  const { employeeId } = await params;
  const profile = getTeamProfileDemoById(employeeId);

  if (!profile) {
    notFound();
  }

  return <TeamProfilePage profile={profile} />;
};

export default TeamProfileRoute;
