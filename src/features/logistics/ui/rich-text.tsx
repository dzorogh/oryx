"use client";

import { useEffect, type ReactNode } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";
import { isRichTextHtml } from "@/features/logistics/rich-text-plain";
import { cn } from "@/lib/utils";

const extensions = (placeholder?: string) => [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    blockquote: false,
    horizontalRule: false,
    link: false,
  }),
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

const proseClass =
  "comment-prose text-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-0 [&_ul]:list-disc [&_ul]:pl-5";

const ToolbarButton = ({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon-xs"
    aria-label={label}
    title={label}
    aria-pressed={active}
    onClick={onClick}
    className={cn(active && "bg-muted")}
  >
    {children}
  </Button>
);

export const RichTextEditor = ({
  value,
  onChange,
  ariaLabel,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
  className?: string;
}) => {
  const editor = useEditor({
    extensions: extensions(placeholder),
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(proseClass, "max-h-32 min-h-14 overflow-y-auto px-3 py-2 outline-none"),
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.isEmpty ? "" : instance.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? "" : editor.getHTML();
    if (value !== current) editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
  }, [value, editor]);

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-background focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        className,
      )}
    >
      <div className="flex items-center gap-0.5 border-b border-input px-1.5 py-1">
        <ToolbarButton
          label="Жирный"
          active={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Курсив"
          active={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Маркированный список"
          active={editor?.isActive("bulletList") ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" aria-hidden />
        </ToolbarButton>
        <ToolbarButton
          label="Нумерованный список"
          active={editor?.isActive("orderedList") ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" aria-hidden />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

const RichTextHtmlView = ({ value, className }: { value: string; className?: string }) => {
  const editor = useEditor({
    extensions: extensions(),
    content: value,
    editable: false,
    immediatelyRender: false,
    editorProps: { attributes: { class: cn(proseClass, className) } },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [value, editor]);

  return <EditorContent editor={editor} />;
};

/** Stored HTML is rendered through the TipTap schema, which drops markup outside it. */
export const RichTextView = ({ value, className }: { value: string; className?: string }) =>
  isRichTextHtml(value) ? (
    <RichTextHtmlView value={value} className={className} />
  ) : (
    <p className={cn("text-sm whitespace-pre-line", className)}>{value}</p>
  );
