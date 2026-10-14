import { Suspense } from "react";
import { MyRequestsPage } from "@/features/tracker/requests/ui/my-requests-page";

const TrackerMyRequestsRoute = () => (
  <Suspense fallback={<main className="min-h-screen bg-muted/30" />}>
    <MyRequestsPage />
  </Suspense>
);

export default TrackerMyRequestsRoute;
