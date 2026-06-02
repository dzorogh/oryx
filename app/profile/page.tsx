import { permanentRedirect } from "next/navigation";
import { USER_PROFILE_CURRENT_USER_ID } from "@/features/users/profile/user-profile-demo-data";

const ProfileRedirectPage = () => {
  permanentRedirect(`/team/users/${USER_PROFILE_CURRENT_USER_ID}`);
};

export default ProfileRedirectPage;
