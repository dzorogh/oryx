"use client";

import {
  Copy,
  Languages,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Quote,
  Reply,
  Trash2,
} from "lucide-react";
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
  /** Root-only moderation state (undefined hides the item). */
  pinned?: boolean;
  onReply?: () => void;
  onQuote?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onTogglePin?: () => void;
  onConvertToTask?: () => void;
  onTranslate?: () => void;
  /** When true the translation is shown; the item toggles back to the original. */
  translated?: boolean;
};

/** Context menu for a comment — opened by the ⋯ button and by right-click on the comment. */
export const CommentActionsMenu = ({
  open,
  onOpenChange,
  canReply,
  canEdit,
  canDelete,
  pinned,
  onReply,
  onQuote,
  onEdit,
  onDelete,
  onCopy,
  onTogglePin,
  onConvertToTask,
  onTranslate,
  translated,
}: CommentActionsMenuProps) => {
  const hasModeration = !!onTogglePin || !!onConvertToTask;

  return (
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
      <DropdownMenuContent align="end" className="min-w-44">
        {canReply ? (
          <DropdownMenuItem onClick={onReply}>
            <Reply />
            Reply
          </DropdownMenuItem>
        ) : null}
        {onQuote ? (
          <DropdownMenuItem onClick={onQuote}>
            <Quote />
            Quote reply
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onCopy}>
          <Copy />
          Copy text
        </DropdownMenuItem>
        {onTranslate ? (
          <DropdownMenuItem onClick={onTranslate}>
            <Languages />
            {translated ? "Show original" : "Translate"}
          </DropdownMenuItem>
        ) : null}

        {hasModeration ? <DropdownMenuSeparator /> : null}
        {onTogglePin ? (
          <DropdownMenuItem onClick={onTogglePin}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "Unpin" : "Pin to top"}
          </DropdownMenuItem>
        ) : null}
        {onConvertToTask ? (
          <DropdownMenuItem onClick={onConvertToTask}>
            <ListTodo />
            Convert to task
          </DropdownMenuItem>
        ) : null}

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
};
