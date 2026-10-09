// english-ui:ignore-file
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const LogisticsLoading = () => (
  <div className="grid gap-2">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export const LogisticsError = ({
  message,
  title = "Не удалось загрузить логистику",
  onRetry,
}: {
  message: string;
  title?: string;
  onRetry?: () => void;
}) => (
  <Alert variant="destructive">
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>
      <div className="flex flex-col items-start gap-2">
        <span>{message}</span>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" className="text-foreground" onClick={onRetry}>
            Повторить
          </Button>
        ) : null}
      </div>
    </AlertDescription>
  </Alert>
);

export const BackendUnsetNotice = () => (
  <Alert>
    <AlertTitle>Бэкенд демо не настроен</AlertTitle>
  </Alert>
);
