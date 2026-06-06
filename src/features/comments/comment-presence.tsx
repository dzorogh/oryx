"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { CommentUser } from "@/features/comments/comments-types";

type PresenceUser = Pick<CommentUser, "id" | "name" | "avatarUrl">;

const AvatarStack = ({ users, max = 4 }: { users: PresenceUser[]; max?: number }) => {
  const shown = users.slice(0, max);
  const overflow = users.length - shown.length;
  return (
    <div className="flex items-center -space-x-1.5">
      {shown.map((user) => (
        <Image
          key={user.id}
          src={user.avatarUrl}
          alt={user.name}
          title={user.name}
          width={22}
          height={22}
          className="size-[22px] rounded-full border-2 border-card object-cover"
        />
      ))}
      {overflow > 0 ? (
        <span className="flex size-[22px] items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
};

/** Header presence: a live dot + stacked avatars of others viewing this thread. */
export const CommentPresenceBar = ({
  connected,
  onlineUsers,
}: {
  connected: boolean;
  onlineUsers: PresenceUser[];
}) => {
  if (!connected) {
    return null;
  }
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      {onlineUsers.length > 0 ? (
        <>
          <AvatarStack users={onlineUsers} />
          <span className="hidden sm:inline">
            {onlineUsers.length} {onlineUsers.length === 1 ? "other viewing" : "others viewing"}
          </span>
        </>
      ) : (
        <span>Live</span>
      )}
    </div>
  );
};

/** Composer-adjacent "X is typing…" line with an animated ellipsis. */
export const CommentTypingLine = ({
  users,
  className,
}: {
  users: PresenceUser[];
  className?: string;
}) => {
  if (users.length === 0) {
    return null;
  }
  const names =
    users.length === 1
      ? `${users[0].name} is typing`
      : users.length === 2
        ? `${users[0].name} and ${users[1].name} are typing`
        : `${users[0].name} and ${users.length - 1} others are typing`;
  return (
    <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      <span>{names}…</span>
    </div>
  );
};
