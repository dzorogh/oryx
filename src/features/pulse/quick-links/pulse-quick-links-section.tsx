"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { isExternalQuickLinkHref } from "./normalize";
import type { PulseQuickLink } from "./types";

type PulseQuickLinksSectionProps = {
  links: PulseQuickLink[];
  isLoading?: boolean;
  onAddLink: (label: string, href: string) => boolean;
  onUpdateLink: (id: string, patch: Partial<Pick<PulseQuickLink, "label" | "href">>) => boolean;
  onRemoveLink: (id: string) => boolean;
  onReorderLinks: (fromIndex: number, toIndex: number) => void;
  onItemClick?: () => void;
};

const subnavLinkClassName =
  "inline-flex h-auto w-full items-center rounded-lg px-2 py-2 text-left text-[12px] font-normal leading-[1.2] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const QuickLinksSectionTitle = ({ children }: { children: string }) => (
  <p className="px-1 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{children}</p>
);

export const PulseQuickLinksSection = ({
  links,
  isLoading = false,
  onAddLink,
  onUpdateLink,
  onRemoveLink,
  onReorderLinks,
  onItemClick,
}: PulseQuickLinksSectionProps) => {
  const pathname = usePathname();
  const current = pathname ?? "";

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newHref, setNewHref] = useState("");

  const resetEditState = () => {
    setIsAdding(false);
    setNewLabel("");
    setNewHref("");
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleEditOpenChange = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      resetEditState();
    }
  };

  const handleAddSubmit = () => {
    const added = onAddLink(newLabel, newHref);
    if (!added) {
      return;
    }
    setNewLabel("");
    setNewHref("");
    setIsAdding(false);
  };

  const handleAddCancel = () => {
    setIsAdding(false);
    setNewLabel("");
    setNewHref("");
  };

  const handleDragStart = (linkId: string) => {
    setDraggedId(linkId);
  };

  const handleDragOver = (event: React.DragEvent, linkId: string) => {
    event.preventDefault();
    if (draggedId && draggedId !== linkId) {
      setDragOverId(linkId);
    }
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const fromIndex = links.findIndex((link) => link.id === draggedId);
    const toIndex = links.findIndex((link) => link.id === targetId);

    if (fromIndex >= 0 && toIndex >= 0) {
      onReorderLinks(fromIndex, toIndex);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleMoveByKeyboard = useCallback(
    (linkId: string, direction: "up" | "down") => {
      const index = links.findIndex((link) => link.id === linkId);
      if (index < 0) {
        return;
      }

      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= links.length) {
        return;
      }

      onReorderLinks(index, nextIndex);
    },
    [links, onReorderLinks],
  );

  const handleRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>, linkId: string) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      handleMoveByKeyboard(linkId, "up");
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      handleMoveByKeyboard(linkId, "down");
    }
  };

  const renderViewLink = (link: PulseQuickLink) => {
    const isExternal = isExternalQuickLinkHref(link.href);
    const active = !isExternal && (current === link.href || current.startsWith(`${link.href}/`));

    if (isExternal) {
      return (
        <li key={link.id}>
          <a
            href={link.href}
            onClick={onItemClick}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={link.label}
            className={subnavLinkClassName}
          >
            {link.label}
          </a>
        </li>
      );
    }

    return (
      <li key={link.id}>
        <Link
          href={link.href}
          onClick={onItemClick}
          aria-current={active ? "page" : undefined}
          aria-label={link.label}
          className={cn(subnavLinkClassName, active && "bg-muted font-medium text-foreground")}
        >
          {link.label}
        </Link>
      </li>
    );
  };

  const renderEditRow = (link: PulseQuickLink) => {
    const isDragging = draggedId === link.id;
    const isDropTarget = dragOverId === link.id;

    return (
      <li
        key={link.id}
        className={cn(
          "flex items-start gap-1 rounded-lg border border-transparent p-0.5",
          isDropTarget && "border-primary/40 bg-muted/40",
          isDragging && "opacity-50",
        )}
        onDragOver={(event) => handleDragOver(event, link.id)}
        onDrop={() => handleDrop(link.id)}
      >
        <button
          type="button"
          draggable
          onDragStart={() => handleDragStart(link.id)}
          onDragEnd={handleDragEnd}
          onKeyDown={(event) => handleRowKeyDown(event, link.id)}
          aria-label={`Переместить ссылку ${link.label}`}
          aria-grabbed={isDragging}
          className="mt-1 inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Input
            value={link.label}
            onChange={(event) => onUpdateLink(link.id, { label: event.target.value })}
            aria-label={`Название ссылки ${link.label}`}
            className="h-8 text-xs"
          />
          <Input
            value={link.href}
            onChange={(event) => onUpdateLink(link.id, { href: event.target.value })}
            aria-label={`URL ссылки ${link.label}`}
            className="h-8 text-xs"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={links.length <= 1}
          onClick={() => onRemoveLink(link.id)}
          aria-label={`Удалить ссылку ${link.label}`}
          className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 aria-hidden className="size-4" />
        </Button>
      </li>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <QuickLinksSectionTitle>Быстрые ссылки</QuickLinksSectionTitle>
        <div className="space-y-1 px-1">
          <div className="h-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <QuickLinksSectionTitle>Быстрые ссылки</QuickLinksSectionTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setIsEditOpen(true)}
            aria-label="Редактировать быстрые ссылки"
            className="size-7 shrink-0 text-muted-foreground"
          >
            <Pencil aria-hidden className="size-4" />
          </Button>
        </div>

        <nav aria-label="Быстрые ссылки">
          <ul className="flex flex-col gap-0.5">{links.map(renderViewLink)}</ul>
        </nav>
      </div>

      <Dialog open={isEditOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md" showCloseButton>
          <DialogHeader className="border-b px-4 py-3">
            <DialogTitle>Быстрые ссылки</DialogTitle>
            <DialogDescription>
              Добавляйте, переименовывайте и перетаскивайте ссылки для aside главной страницы.
            </DialogDescription>
          </DialogHeader>

          <div className="flex max-h-[min(60vh,28rem)] flex-col gap-3 overflow-y-auto px-4 py-3">
            <ul role="list" aria-label="Редактирование быстрых ссылок" className="flex flex-col gap-1">
              {links.map(renderEditRow)}
            </ul>

            {isAdding ? (
              <div className="flex flex-col gap-1 rounded-lg border border-[var(--corportal-border-grey)] p-2">
                <Input
                  value={newLabel}
                  onChange={(event) => setNewLabel(event.target.value)}
                  placeholder="Название"
                  aria-label="Название новой ссылки"
                  className="h-8 text-xs"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddSubmit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      handleAddCancel();
                    }
                  }}
                />
                <Input
                  value={newHref}
                  onChange={(event) => setNewHref(event.target.value)}
                  placeholder="https://... или /path"
                  aria-label="URL новой ссылки"
                  className="h-8 text-xs"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddSubmit();
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      handleAddCancel();
                    }
                  }}
                />
                <div className="flex items-center gap-1">
                  <Button type="button" size="sm" onClick={handleAddSubmit} className="h-7 text-xs">
                    Добавить
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={handleAddCancel} aria-label="Отменить добавление">
                    <X aria-hidden className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAdding(true)}
                className="h-8 justify-start px-2 text-xs text-muted-foreground"
              >
                <Plus aria-hidden className="size-3.5" />
                Добавить ссылку
              </Button>
            )}
          </div>

          <div className="flex justify-end border-t bg-muted/50 px-4 py-3">
            <Button type="button" onClick={() => handleEditOpenChange(false)}>
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
