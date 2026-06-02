"use client";

import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSectionCard } from "../profile-section-card";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { canEditBlock } from "../user-profile-permissions";

type ProfileAssetsSectionProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onAssign: () => void;
};

const AssetList = ({
  items,
}: {
  items: { id: string; name: string; inventoryId: string; note?: string }[];
}) =>
  items.length === 0 ? (
    <p className="text-xs text-muted-foreground">None</p>
  ) : (
    <ul className="divide-y divide-border/60 rounded-lg border border-[var(--corportal-border-grey)]">
      {items.map((item) => (
        <li key={item.id} className="px-3 py-2 text-xs">
          <p className="font-medium">{item.name}</p>
          <p className="text-muted-foreground">
            {item.inventoryId}
            {item.note ? ` · ${item.note}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );

export const ProfileAssetsSection = ({ profile, ctx, onAssign }: ProfileAssetsSectionProps) => {
  const canEdit = canEditBlock("assets", ctx);

  return (
    <ProfileSectionCard
      title="Assets"
      icon={Package}
      headerExtra={
        canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={onAssign}>
            Assign asset
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-semibold">Assigned (by category)</p>
          <div className="space-y-2">
            {profile.assetCategories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-lg border border-[var(--corportal-border-grey)] p-2"
              >
                <p className="text-xs font-medium">
                  {cat.label}
                  <span className="ml-1 text-muted-foreground">({cat.items.length})</span>
                </p>
                <div className="mt-1">
                  <AssetList items={cat.items} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Registrant</p>
          <AssetList items={profile.registrantAssets} />
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold">Materially responsible</p>
          <AssetList items={profile.materialAssets} />
        </div>
      </div>
    </ProfileSectionCard>
  );
};
