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
            aria-label="Действия с комментарием"
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
            Ответить
          </DropdownMenuItem>
        ) : null}
        {onQuote ? (
          <DropdownMenuItem onClick={onQuote}>
            <Quote />
            Ответить с цитатой
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onCopy}>
          <Copy />
          Копировать текст
        </DropdownMenuItem>
        {onTranslate ? (
          <DropdownMenuItem onClick={onTranslate}>
            <Languages />
            {translated ? "Показать оригинал" : "Перевести"}
          </DropdownMenuItem>
        ) : null}

        {hasModeration ? <DropdownMenuSeparator /> : null}
        {onTogglePin ? (
          <DropdownMenuItem onClick={onTogglePin}>
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "Открепить" : "Закрепить наверху"}
          </DropdownMenuItem>
        ) : null}
        {onConvertToTask ? (
          <DropdownMenuItem onClick={onConvertToTask}>
            <ListTodo />
            Создать задачу
          </DropdownMenuItem>
        ) : null}

        {canEdit || canDelete ? <DropdownMenuSeparator /> : null}
        {canEdit ? (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil />
            Изменить
          </DropdownMenuItem>
        ) : null}
        {canDelete ? (
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Удалить
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
