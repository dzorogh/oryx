"use client";

import { Copy, MoreHorizontal, Pencil, Reply, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CommentActionsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onReply?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
};

/** Context menu for a comment — opened by the ⋯ button and by right-click on the comment. */
export const CommentActionsMenu = ({
  open,
  onOpenChange,
  canReply,
  canEdit,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  onCopy,
}: CommentActionsMenuProps) => (
  <DropdownMenu open={open} onOpenChange={onOpenChange}>
    <DropdownMenuTrigger
      render={
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Comment actions"
          className="text-muted-foreground"
        />
      }
    >
      <MoreHorizontal />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-40">
      {canReply ? (
        <DropdownMenuItem onClick={onReply}>
          <Reply />
          Reply
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={onCopy}>
        <Copy />
        Copy text
      </DropdownMenuItem>
      {canEdit || canDelete ? <DropdownMenuSeparator /> : null}
      {canEdit ? (
        <DropdownMenuItem onClick={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
      ) : null}
      {canDelete ? (
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 />
          Delete
        </DropdownMenuItem>
      ) : null}
    </DropdownMenuContent>
  </DropdownMenu>
);
