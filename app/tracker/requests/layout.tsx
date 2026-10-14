import type { ReactNode } from "react";
import { RequestsProvider } from "@/features/tracker/requests/requests-store";

const TrackerRequestsLayout = ({ children }: { children: ReactNode }) => (
  <RequestsProvider>{children}</RequestsProvider>
);

export default TrackerRequestsLayout;
