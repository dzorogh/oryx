import { Suspense } from "react";
import { RequestsCatalogPage } from "@/features/tracker/requests/ui/requests-catalog-page";

const TrackerRequestsCatalogRoute = () => (
  <Suspense fallback={<main className="min-h-screen bg-muted/30" />}>
    <RequestsCatalogPage />
  </Suspense>
);

export default TrackerRequestsCatalogRoute;
