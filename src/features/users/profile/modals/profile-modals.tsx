"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ProfileFieldLabel } from "../profile-field-label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ProfileSimpleDialog } from "./profile-simple-dialog";
import type { UserProfileData } from "../user-profile-demo-data";
import { DELEGATE_PICKER_OPTIONS } from "../user-profile-demo-data";

type ProfileModalsProps = {
  profile: UserProfileData;
  onPatch: (patch: Partial<UserProfileData>) => void;
  absencesOpen: boolean;
  setAbsencesOpen: (v: boolean) => void;
  templateOpen: boolean;
  setTemplateOpen: (v: boolean) => void;
  assetsOpen: boolean;
  setAssetsOpen: (v: boolean) => void;
  rolesOpen: boolean;
  setRolesOpen: (v: boolean) => void;
  documentsOpen: boolean;
  setDocumentsOpen: (v: boolean) => void;
  technicalOpen: boolean;
  setTechnicalOpen: (v: boolean) => void;
  delegationOpen: boolean;
  setDelegationOpen: (v: boolean) => void;
};

export const ProfileModals = ({
  profile,
  onPatch,
  absencesOpen,
  setAbsencesOpen,
  templateOpen,
  setTemplateOpen,
  assetsOpen,
  setAssetsOpen,
  rolesOpen,
  setRolesOpen,
  documentsOpen,
  setDocumentsOpen,
  technicalOpen,
  setTechnicalOpen,
  delegationOpen,
  setDelegationOpen,
}: ProfileModalsProps) => {
  const [techParams, setTechParams] = useState(profile.technical.params);
  const [selectedAbilities, setSelectedAbilities] = useState<string[]>(
    profile.delegations[0]?.abilityIds ?? [],
  );
  const [delegateId, setDelegateId] = useState(
    profile.delegations[0]?.delegateUserId ?? "",
  );

  return (
    <>
      <ProfileSimpleDialog
        open={absencesOpen}
        onOpenChange={setAbsencesOpen}
        title="Absences"
        description="Record or adjust absence periods for this employee."
        onSave={() => {
          toast.success("Absences saved (demo).");
          setAbsencesOpen(false);
        }}
      >
        <p className="text-xs text-muted-foreground">Demo: connect to HR calendar API later.</p>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={templateOpen}
        onOpenChange={setTemplateOpen}
        title="Schedule template"
        description="Apply a recurring work schedule template."
        onSave={() => {
          toast.success("Schedule template applied (demo).");
          setTemplateOpen(false);
        }}
      >
        <p className="text-xs text-muted-foreground">Demo: 5/2 template, flexible shifts, etc.</p>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={assetsOpen}
        onOpenChange={setAssetsOpen}
        title="Assign asset"
        description="Pin a company asset to this employee."
        onSave={() => {
          toast.success("Asset assigned (demo).");
          setAssetsOpen(false);
        }}
      >
        <div className="space-y-2">
          <ProfileFieldLabel htmlFor="asset-name">Asset name</ProfileFieldLabel>
          <Input id="asset-name" placeholder="e.g. Dell Monitor U2723QE" />
        </div>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={rolesOpen}
        onOpenChange={setRolesOpen}
        title="Manage roles"
        description="Assign tenant and instance roles."
        onSave={() => {
          toast.success("Roles updated (demo).");
          setRolesOpen(false);
        }}
      >
        <p className="text-xs text-muted-foreground">
          Current: {profile.tenantRoles.map((t) => t.roles.join(", ")).join(" · ")}
        </p>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={documentsOpen}
        onOpenChange={setDocumentsOpen}
        title="Documents"
        description="Upload or remove documents by category. Visible to admins only."
        onSave={() => {
          toast.success("Documents saved (demo).");
          setDocumentsOpen(false);
        }}
      >
        <ul className="space-y-2 text-xs">
          {profile.documents.map((cat) => (
            <li key={cat.id} className="flex justify-between border-b border-border/40 py-1">
              <span>{cat.label}</span>
              <span className="text-muted-foreground">{cat.documents.length} files</span>
            </li>
          ))}
        </ul>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={technicalOpen}
        onOpenChange={setTechnicalOpen}
        title="Technical parameters"
        description="System identifiers and HR structure (admin only)."
        onSave={() => {
          onPatch({
            technical: { ...profile.technical, params: techParams },
            position: techParams.position,
            departments: techParams.departments,
          });
          toast.success("Technical parameters saved (demo).");
          setTechnicalOpen(false);
        }}
      >
        <div className="grid max-h-96 gap-3 overflow-auto sm:grid-cols-2">
          {(
            [
              ["mainTenantId", "Main tenant"],
              ["bitrixId", "Bitrix ID"],
              ["oneCId", "1C ID"],
              ["anvizId", "Anviz ID"],
              ["hireDate", "Hire date"],
              ["jobRoleType", "Job role type"],
              ["position", "Position"],
              ["snils", "SNILS"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <ProfileFieldLabel htmlFor={`tech-${key}`}>{label}</ProfileFieldLabel>
              <Input
                id={`tech-${key}`}
                value={techParams[key]}
                onChange={(e) => setTechParams({ ...techParams, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </ProfileSimpleDialog>

      <ProfileSimpleDialog
        open={delegationOpen}
        onOpenChange={setDelegationOpen}
        title="Access delegation"
        description="Grant another employee access to selected abilities."
        onSave={() => {
          const picked = DELEGATE_PICKER_OPTIONS.find((o) => o.id === delegateId);
          if (picked) {
            onPatch({
              delegations: [
                {
                  delegateUserId: picked.id,
                  delegateName: picked.label,
                  abilityIds: selectedAbilities,
                },
              ],
            });
          }
          toast.success("Delegation saved (demo).");
          setDelegationOpen(false);
        }}
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <ProfileFieldLabel>Delegate</ProfileFieldLabel>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={delegateId}
              onChange={(e) => setDelegateId(e.target.value)}
            >
              <option value="">Select…</option>
              {DELEGATE_PICKER_OPTIONS.filter((o) => o.id !== profile.id).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <ProfileFieldLabel>Abilities</ProfileFieldLabel>
            {profile.abilities.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={selectedAbilities.includes(a.id)}
                  onCheckedChange={(c) => {
                    setSelectedAbilities((prev) =>
                      c === true ? [...prev, a.id] : prev.filter((id) => id !== a.id),
                    );
                  }}
                />
                {a.label}
              </label>
            ))}
          </div>
        </div>
      </ProfileSimpleDialog>
    </>
  );
};
