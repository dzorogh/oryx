"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import {
  EditorContent,
  ReactRenderer,
  useEditor,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";
import {
  Bold,
  Code,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
  Underline as UnderlineIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { CommentUser } from "@/features/comments/comments-types";
import {
  MentionList,
  type MentionListHandle,
  type MentionListProps,
} from "@/features/comments/comment-mention-list";

export type CommentEditorHandle = {
  focus: () => void;
  clear: () => void;
  getHtml: () => string;
  getJson: () => JSONContent;
  insertImage: (src: string, alt?: string) => void;
};

type CommentEditorProps = {
  ref?: Ref<CommentEditorHandle>;
  placeholder: string;
  mentionableUsers: CommentUser[];
  initialContent?: JSONContent;
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
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: { class: "comment-mention" },
        suggestion: createMentionSuggestion(mentionableUsers),
      }),
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

      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={promptLink}>
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton label="Insert image" onClick={insertImageByUrl}>
        <ImageIcon />
      </ToolbarButton>
    </div>
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

/** True when a Tiptap document has no text and no embedded images. */
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
    if (node.type === "image" || node.type === "mention") {
      hasContent = true;
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return !hasContent;
};
