import { Extension, type Editor, type Range } from "@tiptap/core";
import { Suggestion, type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import {
  Code,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  CircleCheck,
  Table as TableIcon,
  TriangleAlert,
  Type,
  type LucideIcon,
} from "lucide-react";
import {
  SlashCommandList,
  type SlashCommandListHandle,
  type SlashCommandListProps,
} from "@/features/comments/comment-slash-list";

export type SlashCommandItem = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
};

/** The block palette offered by the `/` menu (mirrors the toolbar's blocks). */
export const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Text",
    subtitle: "Plain paragraph",
    icon: Type,
    keywords: ["text", "paragraph", "plain"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    title: "Heading 2",
    subtitle: "Section heading",
    icon: Heading2,
    keywords: ["heading", "h2", "title"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Heading 3",
    subtitle: "Subsection heading",
    icon: Heading3,
    keywords: ["heading", "h3", "subtitle"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run(),
  },
  {
    title: "Bulleted list",
    subtitle: "Simple bullet list",
    icon: List,
    keywords: ["bullet", "list", "unordered", "ul"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    subtitle: "Ordered list",
    icon: ListOrdered,
    keywords: ["numbered", "ordered", "list", "ol"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Checklist",
    subtitle: "To-do list with checkboxes",
    icon: ListChecks,
    keywords: ["check", "task", "todo", "checklist"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Quote",
    subtitle: "Blockquote",
    icon: Quote,
    keywords: ["quote", "blockquote", "citation"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    subtitle: "Monospaced code",
    icon: Code,
    keywords: ["code", "snippet", "pre"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    subtitle: "3×3 table with header",
    icon: TableIcon,
    keywords: ["table", "grid", "rows", "columns"],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Callout: info",
    subtitle: "Highlighted note",
    icon: Info,
    keywords: ["callout", "info", "note", "tip"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCallout({ tone: "info" }).run(),
  },
  {
    title: "Callout: warning",
    subtitle: "Highlighted warning",
    icon: TriangleAlert,
    keywords: ["callout", "warning", "caution", "alert"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCallout({ tone: "warning" }).run(),
  },
  {
    title: "Callout: success",
    subtitle: "Highlighted success",
    icon: CircleCheck,
    keywords: ["callout", "success", "done", "ok"],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCallout({ tone: "success" }).run(),
  },
  {
    title: "Divider",
    subtitle: "Horizontal rule",
    icon: Minus,
    keywords: ["divider", "hr", "separator", "rule"],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Image",
    subtitle: "Embed image by URL",
    icon: ImageIcon,
    keywords: ["image", "picture", "photo", "embed"],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt("Image URL", "https://");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
];

const filterCommands = (query: string): SlashCommandItem[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return SLASH_COMMANDS;
  }
  return SLASH_COMMANDS.filter((item) =>
    [item.title, ...item.keywords].some((text) => text.toLowerCase().includes(normalized)),
  );
};

/** Suggestion config for the slash menu (mirrors the mention popup's lifecycle). */
export const slashSuggestion: Omit<SuggestionOptions<SlashCommandItem>, "editor"> = {
  char: "/",
  startOfLine: false,
  command: ({ editor, range, props }) => {
    props.run(editor, range);
  },
  items: ({ query }) => filterCommands(query),
  render: () => {
    let renderer: ReactRenderer<SlashCommandListHandle, SlashCommandListProps> | null = null;
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
      onStart: (props: SuggestionProps<SlashCommandItem>) => {
        container = document.createElement("div");
        container.style.position = "fixed";
        container.style.zIndex = "60";
        document.body.appendChild(container);
        renderer = new ReactRenderer(SlashCommandList, {
          props: { items: props.items, command: props.command },
          editor: props.editor,
        });
        container.appendChild(renderer.element);
        positionContainer(props.clientRect);
      },
      onUpdate: (props: SuggestionProps<SlashCommandItem>) => {
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
};

/** Tiptap extension that wires the slash menu via the shared Suggestion utility. */
export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {} as Omit<SuggestionOptions<SlashCommandItem>, "editor">,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
