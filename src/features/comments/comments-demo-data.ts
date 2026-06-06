import type { JSONContent } from "@tiptap/react";
import { EMPLOYEE_OPTIONS } from "@/components/home/thanks-demo-data";
import type {
  CommentFeedItem,
  CommentRecord,
  CommentUser,
} from "@/features/comments/comments-types";

const avatarFor = (id: string): string => `https://i.pravatar.cc/96?u=comment-${id}`;

/** Everyone who can author or be mentioned, derived from the shared employee roster. */
export const COMMENT_MENTIONABLE_USERS: CommentUser[] = EMPLOYEE_OPTIONS.map((employee) => ({
  id: employee.id,
  name: employee.fullName,
  role: employee.role,
  avatarUrl: avatarFor(employee.id),
}));

const usersById = new Map(COMMENT_MENTIONABLE_USERS.map((user) => [user.id, user]));

const requireUser = (id: string): CommentUser => {
  const user = usersById.get(id);
  if (!user) {
    throw new Error(`Unknown comment user: ${id}`);
  }
  return user;
};

/** Demo "me" — matches the article-page author identity. */
export const COMMENT_CURRENT_USER: CommentUser = requireUser("emp-12");

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Build a single-paragraph Tiptap doc + HTML, optionally prefixed with a mention. */
const buildContent = (
  text: string,
  mention?: CommentUser,
): { contentHtml: string; contentJson: JSONContent; mentionIds: string[] } => {
  if (mention) {
    return {
      contentHtml: `<p><span class="comment-mention" data-type="mention" data-id="${mention.id}">@${escapeHtml(
        mention.name,
      )}</span> ${escapeHtml(text)}</p>`,
      contentJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "mention", attrs: { id: mention.id, label: mention.name } },
              { type: "text", text: ` ${text}` },
            ],
          },
        ],
      },
      mentionIds: [mention.id],
    };
  }
  return {
    contentHtml: `<p>${escapeHtml(text)}</p>`,
    contentJson: {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    },
    mentionIds: [],
  };
};

const minutesAgo = (minutes: number): string =>
  new Date(Date.now() - minutes * 60_000).toISOString();

type SeedComment = {
  id: string;
  authorId: string;
  parentId: string | null;
  text: string;
  mentionId?: string;
  minutesAgo: number;
  likeCount?: number;
  likedByMe?: boolean;
};

const SEED_COMMENTS: SeedComment[] = [
  {
    id: "root-0a",
    authorId: "emp-2",
    parentId: null,
    text: "First! Bookmarking this — we have been waiting for an official word on the change for a while.",
    minutesAgo: 1450,
    likeCount: 9,
  },
  {
    id: "root-0b",
    authorId: "emp-7",
    parentId: null,
    text: "Could we get a short FAQ pinned somewhere? Support is already getting questions about it.",
    minutesAgo: 1320,
    likeCount: 21,
  },
  {
    id: "reply-0b",
    authorId: "emp-12",
    parentId: "root-0b",
    text: "good idea — I'll put together a quick FAQ and link it from the article.",
    mentionId: "emp-7",
    minutesAgo: 1290,
    likeCount: 5,
  },
  {
    id: "root-0c",
    authorId: "emp-10",
    parentId: null,
    text: "Will the QA environment follow the same flow, or is this production-only for now?",
    minutesAgo: 1100,
  },
  {
    id: "root-0d",
    authorId: "emp-8",
    parentId: null,
    text: "Appreciate the heads-up. Operations will update the internal runbooks accordingly.",
    minutesAgo: 920,
    likeCount: 4,
  },
  {
    id: "root-0e",
    authorId: "emp-11",
    parentId: null,
    text: "Does this affect procurement tickets too, or only IT requests?",
    minutesAgo: 760,
  },
  {
    id: "reply-0e",
    authorId: "emp-1",
    parentId: "root-0e",
    text: "only IT requests for now — procurement keeps its current process.",
    mentionId: "emp-11",
    minutesAgo: 700,
    likeCount: 2,
  },
  {
    id: "root-0f",
    authorId: "emp-9",
    parentId: null,
    text: "The staged rollout approach is reassuring. Nice to see change management done right.",
    minutesAgo: 540,
    likeCount: 7,
  },
  {
    id: "root-1",
    authorId: "emp-5",
    parentId: null,
    text: "Clear and to the point — thanks for sharing this ahead of the rollout. Looking forward to the details.",
    minutesAgo: 320,
    likeCount: 14,
  },
  {
    id: "reply-1",
    authorId: "emp-6",
    parentId: "root-1",
    text: "agreed, the timeline finally makes sense now.",
    mentionId: "emp-5",
    minutesAgo: 295,
    likeCount: 3,
  },
  {
    id: "root-2",
    authorId: "emp-1",
    parentId: null,
    text: "Will the migration guide cover the legacy endpoints too? We still have a few integrations on the old API.",
    minutesAgo: 180,
    likeCount: 6,
  },
  {
    id: "reply-2",
    authorId: "emp-12",
    parentId: "root-2",
    text: "yes — there's a dedicated section for that, I'll link it once it's published.",
    mentionId: "emp-1",
    minutesAgo: 150,
  },
  {
    id: "root-3",
    authorId: "emp-9",
    parentId: null,
    text: "Great write-up. The before/after numbers are genuinely impressive.",
    minutesAgo: 40,
    likeCount: 2,
    likedByMe: true,
  },
];

const buildSeedComment = (scopeId: string, seed: SeedComment): CommentRecord => {
  const content = buildContent(
    seed.text,
    seed.mentionId ? requireUser(seed.mentionId) : undefined,
  );
  return {
    kind: "comment",
    id: `${scopeId}-${seed.id}`,
    parentId: seed.parentId ? `${scopeId}-${seed.parentId}` : null,
    author: requireUser(seed.authorId),
    contentHtml: content.contentHtml,
    contentJson: content.contentJson,
    mentionIds: content.mentionIds,
    attachments: [],
    createdAtIso: minutesAgo(seed.minutesAgo),
    likedByMe: seed.likedByMe ?? false,
    likeCount: seed.likeCount ?? 0,
  };
};

/** Demo feed: a few threaded comments plus interleaved author-less system notices. */
export const buildCommentSeed = (scopeId: string): CommentFeedItem[] => {
  const comments = SEED_COMMENTS.map((seed) => buildSeedComment(scopeId, seed));
  const notices: CommentFeedItem[] = [
    {
      kind: "system",
      id: `${scopeId}-sys-published`,
      tone: "success",
      title: "Article published",
      description: "This article is now visible to the whole company.",
      createdAtIso: minutesAgo(360),
    },
    {
      kind: "system",
      id: `${scopeId}-sys-pinned`,
      tone: "info",
      title: "Pinned by the editorial team",
      createdAtIso: minutesAgo(120),
    },
  ];
  return [...comments, ...notices];
};
