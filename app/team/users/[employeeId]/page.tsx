import { notFound } from "next/navigation";
import { UserProfilePage } from "@/features/users/profile/user-profile-page";
import {
  USER_PROFILE_ROUTE_IDS,
  getUserProfileDemoById,
} from "@/features/users/profile/user-profile-demo-data";

export const generateStaticParams = () =>
  USER_PROFILE_ROUTE_IDS.map((employeeId) => ({ employeeId }));

type TeamUserProfileRouteProps = {
  params: Promise<{ employeeId: string }>;
};

const TeamUserProfileRoute = async ({ params }: TeamUserProfileRouteProps) => {
  const { employeeId } = await params;
  const profile = getUserProfileDemoById(employeeId);

  if (!profile) {
    notFound();
  }

  return <UserProfilePage initialProfile={profile} />;
};

export default TeamUserProfileRoute;
