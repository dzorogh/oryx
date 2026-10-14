import { Suspense } from "react";
import { RequestBuilderPage } from "@/features/tracker/requests/ui/request-builder-page";

const TrackerRequestBuilderRoute = () => (
  <Suspense fallback={<main className="min-h-screen bg-muted/30" />}>
    <RequestBuilderPage />
  </Suspense>
);

export default TrackerRequestBuilderRoute;
