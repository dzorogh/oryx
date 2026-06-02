"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProfileFieldLabel } from "../profile-field-label";
import type { UserProfileData } from "../user-profile-demo-data";

type ProfileIdentityEditDialogProps = {
  profile: UserProfileData;
  onPatch: (patch: Partial<UserProfileData>) => void;
};

export const ProfileIdentityEditDialog = ({ profile, onPatch }: ProfileIdentityEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [nameLocale, setNameLocale] = useState<"en" | "ru" | "es-MX">("en");

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setDraft(profile);
    }
    setOpen(next);
  };

  const handleSave = () => {
    onPatch({ names: draft.names, avatarUrl: draft.avatarUrl });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-3 top-3 z-20 border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white sm:right-4 sm:top-4"
            aria-label="Edit name and avatar"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit name & avatar</DialogTitle>
          <DialogDescription>
            Update how your name appears on the portal and your profile photo URL.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["en", "ru", "es-MX"] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                className={`rounded-md border px-2 py-1 text-xs ${nameLocale === loc ? "border-primary bg-primary/5" : "border-border"}`}
                onClick={() => setNameLocale(loc)}
              >
                {loc === "es-MX" ? "ES (MX)" : loc.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <ProfileFieldLabel htmlFor="profile-name-modal">Full name ({nameLocale})</ProfileFieldLabel>
            <Input
              id="profile-name-modal"
              value={draft.names[nameLocale]}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  names: { ...draft.names, [nameLocale]: e.target.value },
                })
              }
            />
          </div>
          <div className="space-y-1">
            <ProfileFieldLabel htmlFor="profile-avatar-modal">Avatar URL</ProfileFieldLabel>
            <Input
              id="profile-avatar-modal"
              value={draft.avatarUrl}
              onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
          <Button type="button" onClick={handleSave}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
