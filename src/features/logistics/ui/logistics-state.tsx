// english-ui:ignore-file
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const LogisticsLoading = () => (
  <div className="grid gap-2">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export const LogisticsError = ({ message }: { message: string }) => (
  <Alert variant="destructive">
    <AlertTitle>Не удалось загрузить логистику</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
);
