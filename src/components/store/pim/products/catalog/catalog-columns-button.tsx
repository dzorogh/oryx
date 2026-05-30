import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CatalogColumnsButtonProps = {
  hasCustomColumns: boolean;
  disabled?: boolean;
  onClick: () => void;
};

export const CatalogColumnsButton = ({ hasCustomColumns, disabled = false, onClick }: CatalogColumnsButtonProps) => (
  <Button
    type="button"
    variant={hasCustomColumns && !disabled ? "default" : "outline"}
    size="default"
    disabled={disabled}
    onClick={onClick}
    aria-label="Open catalog columns panel"
    aria-disabled={disabled}
  >
    <Columns3 aria-hidden className="size-3.5" />
    Columns
  </Button>
);
