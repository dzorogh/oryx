import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type PricelistParameterMenuProps = {
  isSystem: boolean;
  onEdit: () => void;
  onInsertBefore: () => void;
  onInsertAfter: () => void;
  onResetAll: () => void;
  onDelete: () => void;
};

export const PricelistParameterMenu = ({
  isSystem,
  onEdit,
  onInsertBefore,
  onInsertAfter,
  onResetAll,
  onDelete,
}: PricelistParameterMenuProps) => (
  <DropdownMenuContent align="end" className="w-44">
    <DropdownMenuItem onClick={onEdit}>
      <Pencil aria-hidden />
      Edit parameter
    </DropdownMenuItem>
    <DropdownMenuItem onClick={onInsertBefore}>
      <Plus aria-hidden />
      Insert left
    </DropdownMenuItem>
    {!isSystem ? (
      <DropdownMenuItem onClick={onInsertAfter}>
        <Plus aria-hidden />
        Insert right
      </DropdownMenuItem>
    ) : null}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={onResetAll}>
      <RotateCcw aria-hidden />
      Reset all
    </DropdownMenuItem>
    {!isSystem ? (
      <DropdownMenuItem variant="destructive" onClick={onDelete}>
        <Trash2 aria-hidden />
        Delete
      </DropdownMenuItem>
    ) : null}
  </DropdownMenuContent>
);
