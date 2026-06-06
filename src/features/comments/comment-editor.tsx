"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import {
  EditorContent,
  ReactRenderer,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  Bold,
  CircleCheck,
  Code,
  Image as ImageIcon,
  Info,
  Italic,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Quote,
  Sparkles,
  SpellCheck,
  Strikethrough,
  Table as TableIcon,
  TriangleAlert,
  Underline as UnderlineIcon,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  CommentEntityRef,
  CommentUser,
} from "@/features/comments/comments-types";
import { Callout, type CalloutTone } from "@/features/comments/comment-callout";
import { runAiAction } from "@/features/comments/comments-ai-service";
import { lowlight } from "@/features/comments/comment-highlight";
import { SlashCommand, slashSuggestion } from "@/features/comments/comment-slash-command";
import {
  MentionList,
  type MentionListHandle,
  type MentionListProps,
} from "@/features/comments/comment-mention-list";
import { EntityMention } from "@/features/comments/comment-entity-mention";
import { searchEntities } from "@/features/comments/comment-entities";
import {
  EntityList,
  type EntityListHandle,
  type EntityListProps,
} from "@/features/comments/comment-entity-list";

export type CommentEditorHandle = {
  focus: () => void;
  clear: () => void;
  getHtml: () => string;
  getJson: () => JSONContent;
  setContent: (content: JSONContent | string, focus?: boolean) => void;
  insertContent: (content: JSONContent | string) => void;
  insertImage: (src: string, alt?: string) => void;
};

/** True when a drag carries OS files (vs. editor content being moved). */
const isFileDrag = (event: DragEvent): boolean =>
  !!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");

type CommentEditorProps = {
  ref?: Ref<CommentEditorHandle>;
  placeholder: string;
  mentionableUsers: CommentUser[];
  initialContent?: JSONContent | string;
  autoFocus?: boolean;
  onSubmit?: () => void;
  onChange?: (isEmpty: boolean) => void;
};

/** Lightweight, dependency-free popup positioner for the mention suggestion. */
const createMentionSuggestion = (mentionableUsers: CommentUser[]) => ({
  items: ({ query }: { query: string }): CommentUser[] => {
    const normalized = query.trim().toLowerCase();
    const base = normalized
      ? mentionableUsers.filter((user) => user.name.toLowerCase().includes(normalized))
      : mentionableUsers;
    return base.slice(0, 6);
  },
  render: () => {
    let renderer: ReactRenderer<MentionListHandle, MentionListProps> | null = null;
    let container: HTMLDivElement | null = null;

    const positionContainer = (clientRect?: (() => DOMRect | null) | null) => {
      if (!container || !clientRect) {
        return;
      }
      const rect = clientRect();
      if (!rect) {
        return;
      }
      container.style.top = `${rect.bottom + 6}px`;
      container.style.left = `${rect.left}px`;
    };

    return {
      onStart: (props: SuggestionProps<CommentUser>) => {
        container = document.createElement("div");
        container.style.position = "fixed";
        container.style.zIndex = "60";
        document.body.appendChild(container);
        renderer = new ReactRenderer(MentionList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });
        container.appendChild(renderer.element);
        positionContainer(props.clientRect);
      },
      onUpdate: (props: SuggestionProps<CommentUser>) => {
        renderer?.updateProps({ items: props.items, command: props.command });
        positionContainer(props.clientRect);
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          return true;
        }
        return renderer?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        renderer?.destroy();
        container?.remove();
        renderer = null;
        container = null;
      },
    };
  },
});

/** Suggestion config for the `#` entity mention (tasks / orders). */
const createEntitySuggestion = () => ({
  char: "#",
  items: ({ query }: { query: string }): CommentEntityRef[] => searchEntities(query),
  render: () => {
    let renderer: ReactRenderer<EntityListHandle, EntityListProps> | null = null;
    let container: HTMLDivElement | null = null;

    const positionContainer = (clientRect?: (() => DOMRect | null) | null) => {
      if (!container || !clientRect) {
        return;
      }
      const rect = clientRect();
      if (!rect) {
        return;
      }
      container.style.top = `${rect.bottom + 6}px`;
      container.style.left = `${rect.left}px`;
    };

    return {
      onStart: (props: SuggestionProps<CommentEntityRef>) => {
        container = document.createElement("div");
        container.style.position = "fixed";
        container.style.zIndex = "60";
        document.body.appendChild(container);
        renderer = new ReactRenderer(EntityList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });
        container.appendChild(renderer.element);
        positionContainer(props.clientRect);
      },
      onUpdate: (props: SuggestionProps<CommentEntityRef>) => {
        renderer?.updateProps({ items: props.items, command: props.command });
        positionContainer(props.clientRect);
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === "Escape") {
          return true;
        }
        return renderer?.ref?.onKeyDown(props.event) ?? false;
      },
      onExit: () => {
        renderer?.destroy();
        container?.remove();
        renderer = null;
        container = null;
      },
    };
  },
});

const ToolbarButton = ({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon-sm"
    aria-label={label}
    aria-pressed={active}
    data-active={active ? "" : undefined}
    className="text-muted-foreground data-active:bg-muted data-active:text-foreground"
    onClick={onClick}
  >
    {children}
  </Button>
);

export const CommentEditor = ({
  ref,
  placeholder,
  mentionableUsers,
  initialContent,
  autoFocus,
  onSubmit,
  onChange,
}: CommentEditorProps) => {
  const submitRef = useRef(onSubmit);
  useEffect(() => {
    submitRef.current = onSubmit;
  }, [onSubmit]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 already bundles Link and Underline, so configure Link here
      // instead of registering a duplicate extension.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
      }),
      CodeBlockLowlight.configure({ lowlight }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "comment-mention" },
        suggestion: createMentionSuggestion(mentionableUsers),
      }),
      EntityMention.configure({
        HTMLAttributes: { class: "comment-entity" },
        suggestion: createEntitySuggestion(),
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Callout,
      SlashCommand.configure({ suggestion: slashSuggestion }),
    ],
    content: initialContent ?? "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class:
          "comment-prose min-h-16 max-h-56 overflow-y-auto px-3 py-2 text-sm outline-none",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          submitRef.current?.();
          return true;
        }
        return false;
      },
      // Files dropped here are attachments, not editor content. Returning true on
      // file drags keeps ProseMirror's dropcursor (the insertion line) and default
      // drop handling out of the way; the composer's drop zone handles the files.
      handleDOMEvents: {
        dragenter: (_view, event) => isFileDrag(event),
        dragover: (_view, event) => isFileDrag(event),
        drop: (_view, event) => isFileDrag(event),
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange?.(instance.isEmpty);
    },
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => editor?.chain().focus().run(),
      clear: () => editor?.commands.clearContent(true),
      getHtml: () => editor?.getHTML() ?? "",
      getJson: () => editor?.getJSON() ?? { type: "doc", content: [] },
      setContent: (content, focus) => {
        editor?.commands.setContent(content);
        if (focus) {
          editor?.commands.focus("end");
        }
      },
      insertContent: (content) => {
        editor?.chain().focus().insertContent(content).run();
      },
      insertImage: (src, alt) => {
        editor?.chain().focus().setImage({ src, alt }).run();
      },
    }),
    [editor],
  );

  useEffect(() => {
    onChange?.(editor?.isEmpty ?? true);
  }, [editor, onChange]);

  return (
    <div className="rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

const Toolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const promptLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) {
      return;
    }
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImageByUrl = () => {
    const url = window.prompt("Image URL", "https://");
    if (!url) {
      return;
    }
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        label="Bulleted list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        label="Checklist"
        active={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
      >
        <ListChecks />
      </ToolbarButton>
      <ToolbarButton
        label="Table"
        active={editor.isActive("table")}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon />
      </ToolbarButton>
      <CalloutMenu editor={editor} />

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={promptLink}>
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={insertImageByUrl}>
        <ImageIcon />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <AiAssistMenu editor={editor} />
    </div>
  );
};

type AiActionId = "improve" | "grammar" | "shorten" | "lengthen" | "summarize";

const AI_ACTIONS: { id: AiActionId; label: string; icon: React.ReactNode }[] = [
  { id: "improve", label: "Improve writing", icon: <Wand2 /> },
  { id: "grammar", label: "Fix spelling & grammar", icon: <SpellCheck /> },
  { id: "shorten", label: "Make shorter", icon: <Minimize2 /> },
  { id: "lengthen", label: "Make longer", icon: <Maximize2 /> },
  { id: "summarize", label: "Summarize", icon: <Sparkles /> },
];

/**
 * Toolbar dropdown that rewrites the current draft via the AI service
 * (`/api/comments/ai`), falling back to the deterministic local mock when no
 * provider is configured.
 */
const AiAssistMenu = ({ editor }: { editor: Editor }) => {
  const [busy, setBusy] = useState(false);

  const runAction = (action: AiActionId) => {
    if (busy) {
      return;
    }
    const source = editor.getText();
    setBusy(true);
    void runAiAction(action, source)
      .then(({ result }) => {
        editor.chain().focus().clearContent().insertContent(result).run();
      })
      .finally(() => setBusy(false));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="AI assist"
            disabled={busy}
            className="text-violet-600 hover:text-violet-700 dark:text-violet-400"
          />
        }
      >
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {AI_ACTIONS.map((action) => (
          <DropdownMenuItem key={action.id} onClick={() => runAction(action.id)}>
            {action.icon}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const CALLOUT_OPTIONS: { tone: CalloutTone; label: string; icon: React.ReactNode }[] = [
  { tone: "info", label: "Info", icon: <Info /> },
  { tone: "warning", label: "Warning", icon: <TriangleAlert /> },
  { tone: "success", label: "Success", icon: <CircleCheck /> },
];

/** Toolbar dropdown that inserts/retones/removes a callout block. */
const CalloutMenu = ({ editor }: { editor: Editor }) => {
  const isActive = editor.isActive("callout");

  const applyTone = (tone: CalloutTone) => {
    if (!isActive) {
      editor.chain().focus().toggleCallout({ tone }).run();
      return;
    }
    if (editor.getAttributes("callout").tone === tone) {
      editor.chain().focus().unsetCallout().run();
      return;
    }
    editor.chain().focus().updateAttributes("callout", { tone }).run();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Callout"
            aria-pressed={isActive}
            data-active={isActive ? "" : undefined}
            className="text-muted-foreground data-active:bg-muted data-active:text-foreground"
          />
        }
      >
        <Info />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-36">
        {CALLOUT_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.tone} onClick={() => applyTone(option.tone)}>
            {option.icon}
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Pull mentioned user ids out of a Tiptap JSON document. */
export const collectMentionIds = (doc: JSONContent): string[] => {
  const ids = new Set<string>();
  const walk = (node: JSONContent | undefined) => {
    if (!node) {
      return;
    }
    if (node.type === "mention" && node.attrs?.id) {
      ids.add(String(node.attrs.id));
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return [...ids];
};

/** Pull `#`-referenced entities (tasks/orders) out of a Tiptap JSON document. */
export const collectEntityRefs = (doc: JSONContent): CommentEntityRef[] => {
  const refs = new Map<string, CommentEntityRef>();
  const walk = (node: JSONContent | undefined) => {
    if (!node) {
      return;
    }
    if (node.type === "entityMention" && node.attrs?.id) {
      const id = String(node.attrs.id);
      refs.set(id, {
        id,
        type: (node.attrs.entityType as CommentEntityRef["type"]) ?? "task",
        label: String(node.attrs.label ?? id),
        href: String(node.attrs.href ?? "#"),
      });
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return [...refs.values()];
};

/** True when a Tiptap document has no text and no embedded images/mentions/entities. */
export const isDocEmpty = (doc: JSONContent): boolean => {
  let hasContent = false;
  const walk = (node: JSONContent | undefined) => {
    if (!node || hasContent) {
      return;
    }
    if (node.type === "text" && node.text?.trim()) {
      hasContent = true;
      return;
    }
    if (
      node.type === "image" ||
      node.type === "mention" ||
      node.type === "entityMention"
    ) {
      hasContent = true;
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return !hasContent;
};
