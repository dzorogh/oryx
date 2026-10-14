import { RequestFormPage } from "@/features/tracker/requests/ui/request-form-page";

type TrackerRequestFormRouteProps = {
  params: Promise<{ typeId: string }>;
};

const TrackerRequestFormRoute = async ({ params }: TrackerRequestFormRouteProps) => {
  const { typeId } = await params;
  return <RequestFormPage key={typeId} typeId={typeId} />;
};

export default TrackerRequestFormRoute;
