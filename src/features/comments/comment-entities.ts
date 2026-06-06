import type { CommentEntityRef } from "@/features/comments/comments-types";

/** Demo registry of business entities that can be referenced via `#` in a comment. */
export const COMMENT_ENTITIES: CommentEntityRef[] = [
  {
    id: "GP-2283",
    type: "task",
    label: "GP-2283 · Migrate intake to Service Desk",
    href: "/tracker/tasks/GP-2283",
  },
  {
    id: "GP-2310",
    type: "task",
    label: "GP-2310 · Deprecate legacy email aliases",
    href: "/tracker/tasks/GP-2310",
  },
  {
    id: "GP-2356",
    type: "task",
    label: "GP-2356 · Publish migration FAQ",
    href: "/tracker/tasks/GP-2356",
  },
  {
    id: "OMS-1041",
    type: "oms",
    label: "OMS-1041 · Acme Corp rollout order",
    href: "/store/orders/OMS-1041",
  },
  {
    id: "OMS-1088",
    type: "oms",
    label: "OMS-1088 · APAC hardware refresh",
    href: "/store/orders/OMS-1088",
  },
];

const byId = new Map(COMMENT_ENTITIES.map((entity) => [entity.id, entity]));

export const getEntity = (id: string): CommentEntityRef | undefined => byId.get(id);

/** Filter the registry for a `#` suggestion query (matches id + label, case-insensitive). */
export const searchEntities = (query: string, limit = 6): CommentEntityRef[] => {
  const normalized = query.trim().toLowerCase();
  const base = normalized
    ? COMMENT_ENTITIES.filter(
      (entity) =>
        entity.id.toLowerCase().includes(normalized) ||
        entity.label.toLowerCase().includes(normalized),
    )
    : COMMENT_ENTITIES;
  return base.slice(0, limit);
};
