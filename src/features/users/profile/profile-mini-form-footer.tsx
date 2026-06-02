"use client";

import { Button } from "@/components/ui/button";

type ProfileMiniFormFooterProps = {
  onSave: () => void;
  onCancel: () => void;
  saveLabel?: string;
  disabled?: boolean;
};

export const ProfileMiniFormFooter = ({
  onSave,
  onCancel,
  saveLabel = "Save",
  disabled = false,
}: ProfileMiniFormFooterProps) => (
  <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-[var(--corportal-border-grey)] pt-3">
    <Button type="button" variant="outline" size="sm" onClick={onCancel}>
      Cancel
    </Button>
    <Button type="button" size="sm" onClick={onSave} disabled={disabled}>
      {saveLabel}
    </Button>
  </div>
);
