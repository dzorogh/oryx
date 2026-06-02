"use client";

import { useState, type ReactNode } from "react";
import {
  Bell,
  FileText,
  KeyRound,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProfileFieldLabel } from "../profile-field-label";
import { toast } from "sonner";
import { ProfileSectionCard } from "../profile-section-card";
import { ProfileMiniFormFooter } from "../profile-mini-form-footer";
import type { UserProfileData } from "../user-profile-demo-data";
import type { ViewerContext } from "../user-profile-permissions";
import { getProfileSectionDomId } from "../profile-section-nav";
import { canEditBlock, canViewBlock, type ProfileSectionId } from "../user-profile-permissions";

const AdminSectionAnchor = ({
  section,
  children,
}: {
  section: ProfileSectionId;
  children: ReactNode;
}) => (
  <div id={getProfileSectionDomId(section)} className="scroll-mt-3">
    {children}
  </div>
);

type ProfileAdminSectionsProps = {
  profile: UserProfileData;
  ctx: ViewerContext;
  onPatch: (patch: Partial<UserProfileData>) => void;
  onOpenDocuments: () => void;
  onOpenTechnicalParams: () => void;
};

export const ProfileDocumentsSection = ({ onOpenDocuments }: { onOpenDocuments: () => void }) => (
  <ProfileSectionCard
    title="Documents"
    icon={FileText}
    headerExtra={
      <Button type="button" variant="outline" size="sm" onClick={onOpenDocuments}>
        Manage
      </Button>
    }
  >
    <p className="text-xs text-muted-foreground">
      Admin-only. Employees cannot view this block.
    </p>
  </ProfileSectionCard>
);

export const ProfileTechnicalSection = ({ profile }: { profile: UserProfileData }) => (
  <ProfileSectionCard title="Technical data" icon={Settings2}>
    <dl className="grid gap-2 text-xs sm:grid-cols-2">
      <div>
        <dt className="text-[10px] uppercase text-muted-foreground">Created</dt>
        <dd>{new Date(profile.technical.createdAt).toLocaleString()}</dd>
      </div>
      <div>
        <dt className="text-[10px] uppercase text-muted-foreground">Updated</dt>
        <dd>{new Date(profile.technical.updatedAt).toLocaleString()}</dd>
      </div>
    </dl>
  </ProfileSectionCard>
);

export const ProfilePasswordSection = ({ ctx }: { ctx: ViewerContext }) => {
  const isAdmin = ctx.viewerMode === "admin";
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleResetEmail = () => {
    toast.success("Password reset link sent to email (demo).");
  };

  return (
    <ProfileSectionCard title="Password" icon={KeyRound}>
      <div className="space-y-3 max-w-md">
        {!isAdmin ? (
          <div className="space-y-1">
            <ProfileFieldLabel htmlFor="old-pw">Current password</ProfileFieldLabel>
            <Input
              id="old-pw"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        ) : null}
        <div className="space-y-1">
          <ProfileFieldLabel htmlFor="new-pw">New password</ProfileFieldLabel>
          <Input
            id="new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="space-y-1">
          <ProfileFieldLabel htmlFor="confirm-pw">Confirm new password</ProfileFieldLabel>
          <Input
            id="confirm-pw"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {newPassword.length > 0 ? (
          <p className="text-[10px] text-muted-foreground">
            Strength: {newPassword.length >= 12 ? "Strong" : newPassword.length >= 8 ? "Medium" : "Weak"}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => toast.success("Password updated (demo).")}
          >
            Update password
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleResetEmail}>
            Reset via email
          </Button>
        </div>
      </div>
    </ProfileSectionCard>
  );
};

export const ProfileNotificationsSection = ({
  profile,
  ctx,
  onPatch,
}: {
  profile: UserProfileData;
  ctx: ViewerContext;
  onPatch: (patch: Partial<UserProfileData>) => void;
}) => {
  const canEdit = canEditBlock("notifications", ctx);
  const [draft, setDraft] = useState(profile.notifications);

  return (
    <ProfileSectionCard title="Notification settings" icon={Bell}>
      <div className="space-y-3">
        {draft.map((row, idx) => (
          <div
            key={row.moduleId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--corportal-border-grey)] px-3 py-2"
          >
            <span className="text-xs font-medium">{row.moduleLabel}</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={row.email}
                  disabled={!canEdit}
                  onCheckedChange={(c) => {
                    const next = [...draft];
                    next[idx] = { ...row, email: c === true };
                    setDraft(next);
                  }}
                />
                Email
              </label>
              <label className="flex items-center gap-1.5 text-xs">
                <Checkbox
                  checked={row.portal}
                  disabled={!canEdit}
                  onCheckedChange={(c) => {
                    const next = [...draft];
                    next[idx] = { ...row, portal: c === true };
                    setDraft(next);
                  }}
                />
                Portal
              </label>
            </div>
          </div>
        ))}
      </div>
      {canEdit ? (
        <ProfileMiniFormFooter
          onSave={() => onPatch({ notifications: draft })}
          onCancel={() => setDraft(profile.notifications)}
        />
      ) : null}
    </ProfileSectionCard>
  );
};

export const ProfileAdminRow = (props: ProfileAdminSectionsProps) => {
  const { profile, ctx, onPatch, onOpenDocuments, onOpenTechnicalParams } = props;

  if (ctx.viewerMode !== "admin") {
    return (
      <div className="flex flex-col gap-3">
        {canViewBlock("password", ctx) ? (
          <AdminSectionAnchor section="password">
            <ProfilePasswordSection ctx={ctx} />
          </AdminSectionAnchor>
        ) : null}
        {canViewBlock("notifications", ctx) ? (
          <AdminSectionAnchor section="notifications">
            <ProfileNotificationsSection profile={profile} ctx={ctx} onPatch={onPatch} />
          </AdminSectionAnchor>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3">
        <AdminSectionAnchor section="documents">
          <ProfileDocumentsSection onOpenDocuments={onOpenDocuments} />
        </AdminSectionAnchor>
        <AdminSectionAnchor section="technical">
          <ProfileTechnicalSection profile={profile} />
        </AdminSectionAnchor>
      </div>
      <AdminSectionAnchor section="technicalParams">
        <ProfileSectionCard
          title="Technical parameters"
          icon={Settings2}
          headerExtra={
            <Button type="button" variant="outline" size="sm" onClick={onOpenTechnicalParams}>
              Edit
            </Button>
          }
        >
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">Main tenant</dt>
              <dd>{profile.technical.params.mainTenantId}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">Hire date</dt>
              <dd>{profile.technical.params.hireDate}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">Bitrix ID</dt>
              <dd>{profile.technical.params.bitrixId}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase text-muted-foreground">SNILS</dt>
              <dd>{profile.technical.params.snils}</dd>
            </div>
          </dl>
        </ProfileSectionCard>
      </AdminSectionAnchor>
      <div className="flex flex-col gap-3">
        <AdminSectionAnchor section="password">
          <ProfilePasswordSection ctx={ctx} />
        </AdminSectionAnchor>
        <AdminSectionAnchor section="notifications">
          <ProfileNotificationsSection profile={profile} ctx={ctx} onPatch={onPatch} />
        </AdminSectionAnchor>
      </div>
    </div>
  );
};
