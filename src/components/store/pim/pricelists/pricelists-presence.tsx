import { cn } from "@/lib/utils";
import { getUserInitials, type CollabUser } from "./collab/collab-config";

type PricelistsPresenceProps = {
  users: CollabUser[];
  connected: boolean;
};

const MAX_VISIBLE = 5;

export const PricelistsPresence = ({ users, connected }: PricelistsPresenceProps) => {
  const activeCount = users.length;
  const visibleUsers = users.slice(0, MAX_VISIBLE);
  const overflow = activeCount - visibleUsers.length;
  const statusLabel =
    connected && activeCount > 0 ? `Live (${activeCount})` : connected ? "Live" : "Offline";

  return (
    <div className="flex items-center gap-2" aria-label={`Collaboration status: ${statusLabel}`}>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn("size-2 rounded-full", connected ? "bg-emerald-500" : "bg-amber-500")}
          aria-hidden
        />
        {statusLabel}
      </span>
      <div className="flex -space-x-1.5">
        {visibleUsers.map((user, index) => (
          <span
            key={`${user.name}-${index}`}
            className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-background"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {getUserInitials(user.name)}
          </span>
        ))}
        {overflow > 0 ? (
          <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
};
