"use client";

import { useMemo } from "react";
import { COMMENT_CURRENT_USER, COMMENT_MENTIONABLE_USERS } from "@/features/comments/comments-demo-data";
import { CommentsPanel } from "@/features/comments/comments-panel";
import type { CommentFeedItem, SystemNotification } from "@/features/comments/comments-types";
import type { OrderSystemNotice } from "@/features/logistics/customer-order-oms";

const NO_SEED: CommentFeedItem[] = [];

/** «Комментарии»: the shared module with the order scope; order events come in as system notices. */
export const CustomerOrderCommentsTab = ({
  orderId,
  notices,
}: {
  orderId: string;
  notices: OrderSystemNotice[];
}) => {
  const scope = useMemo(() => ({ type: "customer_order", id: orderId }), [orderId]);
  const systemNotices = useMemo<SystemNotification[]>(
    () =>
      notices.map((notice) => ({
        kind: "system",
        id: notice.id,
        tone: notice.tone,
        title: notice.title,
        description: notice.description,
        createdAtIso: notice.createdAtIso,
      })),
    [notices],
  );

  return (
    <CommentsPanel
      key={orderId}
      scope={scope}
      currentUser={COMMENT_CURRENT_USER}
      mentionableUsers={COMMENT_MENTIONABLE_USERS}
      initialItems={NO_SEED}
      systemNotices={systemNotices}
      persist
      maxHeight="36rem"
    />
  );
};
