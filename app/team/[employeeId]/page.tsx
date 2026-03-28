import { permanentRedirect } from "next/navigation";

export const generateStaticParams = () =>
  [];

type TeamProfileRouteProps = {
  params: Promise<{ employeeId: string }>;
};

const TeamProfileRoute = async ({ params }: TeamProfileRouteProps) => {
  const { employeeId } = await params;
  permanentRedirect(`/team/users/${employeeId}`);
};

export default TeamProfileRoute;
