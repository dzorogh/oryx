import { permanentRedirect } from "next/navigation";
import { USER_PROFILE_ROUTE_IDS } from "@/features/users/profile/user-profile-demo-data";

export const generateStaticParams = () =>
  USER_PROFILE_ROUTE_IDS.map((userId) => ({ userId }));

type UserProfileLegacyRedirectProps = {
  params: Promise<{ userId: string }>;
};

const UserProfileLegacyRedirectPage = async ({ params }: UserProfileLegacyRedirectProps) => {
  const { userId } = await params;
  permanentRedirect(`/team/users/${userId}`);
};

export default UserProfileLegacyRedirectPage;
