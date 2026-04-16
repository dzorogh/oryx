"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Plus,
  Search,
  Settings2,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  SPACE_ROLE_WEIGHT,
  SPACE_SETTINGS_SEED,
  STAGE_COLORS,
  type CustomField,
  type CustomFieldType,
  type SpaceBusinessRole,
  type SpaceDraft,
  type SpaceMember,
  type TaskStage,
} from "@/components/tasks/space-settings-demo-data";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SpaceSettingsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ModalView = "main" | "stages" | "members" | "fields";

const PAGE_SIZE = 5;

const sortByRole = (a: SpaceMember, b: SpaceMember) =>
  SPACE_ROLE_WEIGHT[a.businessRole] - SPACE_ROLE_WEIGHT[b.businessRole];

export const SpaceSettingsModal = ({ open, onOpenChange }: SpaceSettingsModalProps) => {
  const [currentView, setCurrentView] = useState<ModalView>("main");
  const [spaceDraft, setSpaceDraft] = useState<SpaceDraft>(SPACE_SETTINGS_SEED.space);

  // --- Stages state ---
  const [stages, setStages] = useState<TaskStage[]>(() => [...SPACE_SETTINGS_SEED.stages]);
  const [stagesPage, setStagesPage] = useState(1);
  const [lastAddedStageId, setLastAddedStageId] = useState<string | null>(null);
  const [colorPickerStageId, setColorPickerStageId] = useState<string | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; left: number } | null>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const colorButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // --- Members state ---
  const [members, setMembers] = useState<SpaceMember[]>(() => [...SPACE_SETTINGS_SEED.members].sort(sortByRole));
  const [availableUsers, setAvailableUsers] = useState(SPACE_SETTINGS_SEED.availableUsers);
  const [membersPage, setMembersPage] = useState(1);
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const [addSearchQuery, setAddSearchQuery] = useState("");
  const [lastAddedMemberId, setLastAddedMemberId] = useState<string | null>(null);
  const addDropdownRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const addSearchInputRef = useRef<HTMLInputElement>(null);
  const [addDropdownPos, setAddDropdownPos] = useState<{ top: number; left: number } | null>(null);

  // --- Custom fields state ---
  const [customFields, setCustomFields] = useState<CustomField[]>(() => [...SPACE_SETTINGS_SEED.customFields]);
  const [fieldsPage, setFieldsPage] = useState(1);
  const [showArchivedFields, setShowArchivedFields] = useState(false);
  const [lastAddedFieldId, setLastAddedFieldId] = useState<string | null>(null);
  const [deleteFieldId, setDeleteFieldId] = useState<string | null>(null);

  // --- Archive state ---
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false);

  const hasNameError = spaceDraft.name.trim().length === 0;

  const handleGoBack = () => {
    setCurrentView("main");
    setColorPickerStageId(null);
    setIsAddDropdownOpen(false);
    setAddSearchQuery("");
  };

  // ===================== STAGES LOGIC =====================

  const stagesTotalPages = Math.max(1, Math.ceil(stages.length / PAGE_SIZE));
  const stagesSafePage = Math.min(stagesPage, stagesTotalPages);
  const paginatedStages = stages.slice((stagesSafePage - 1) * PAGE_SIZE, stagesSafePage * PAGE_SIZE);

  const handleStageRename = (id: string, name: string) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleStageColorChange = (id: string, color: string) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, color } : s)));
    setColorPickerStageId(null);
  };

  const handleStageDelete = (stage: TaskStage) => {
    if (stage.usedInTasksCount > 0) {
      toast.error(`Stage is used in ${stage.usedInTasksCount} tasks and cannot be deleted`);
      return;
    }
    setStages((prev) => {
      const filtered = prev.filter((s) => s.id !== stage.id);
      return filtered.map((s, i) => ({ ...s, order: i + 1 }));
    });
    toast.success("Stage removed");
  };

  const handleStageMove = (id: string, direction: "up" | "down") => {
    setStages((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next.map((s, i) => ({ ...s, order: i + 1 }));
    });
  };

  const handleAddStage = () => {
    const newId = `stage-${crypto.randomUUID()}`;
    const randomColor = STAGE_COLORS[Math.floor(Math.random() * STAGE_COLORS.length)].tw;
    setStages((prev) => [
      ...prev,
      { id: newId, name: "New stage", color: randomColor, order: prev.length + 1, usedInTasksCount: 0 },
    ]);
    setLastAddedStageId(newId);
  };

  useEffect(() => {
    if (!lastAddedStageId) return;
    const lastPage = Math.max(1, Math.ceil(stages.length / PAGE_SIZE));
    setStagesPage(lastPage);
  }, [lastAddedStageId, stages.length]);

  useEffect(() => {
    if (!lastAddedStageId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-stage-id="${lastAddedStageId}"] input`);
      if (el) {
        el.focus();
        el.select();
      }
      setLastAddedStageId(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [lastAddedStageId, stagesPage]);

  const openColorPicker = (stageId: string) => {
    const btn = colorButtonRefs.current.get(stageId);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setColorPickerPos({ top: rect.bottom + 4, left: rect.left });
    setColorPickerStageId(stageId);
  };

  useEffect(() => {
    if (!colorPickerStageId) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (colorPickerRef.current?.contains(target)) return;
      const btn = colorButtonRefs.current.get(colorPickerStageId);
      if (btn?.contains(target)) return;
      setColorPickerStageId(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorPickerStageId]);

  // ===================== MEMBERS LOGIC =====================

  const membersTotalPages = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
  const membersSafePage = Math.min(membersPage, membersTotalPages);
  const paginatedMembers = members.slice((membersSafePage - 1) * PAGE_SIZE, membersSafePage * PAGE_SIZE);

  const filteredAvailableUsers = useMemo(() => {
    const query = addSearchQuery.toLowerCase().trim();
    if (!query) return availableUsers;
    return availableUsers.filter((u) => u.fullName.toLowerCase().includes(query));
  }, [availableUsers, addSearchQuery]);

  const updateAddDropdownPos = useCallback(() => {
    if (!addButtonRef.current) return;
    const rect = addButtonRef.current.getBoundingClientRect();
    setAddDropdownPos({ top: rect.bottom + 4, left: rect.right - 256 });
  }, []);

  useEffect(() => {
    if (!isAddDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (addDropdownRef.current?.contains(target) || addButtonRef.current?.contains(target)) return;
      setIsAddDropdownOpen(false);
      setAddSearchQuery("");
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAddDropdownOpen]);

  useEffect(() => {
    if (isAddDropdownOpen) {
      updateAddDropdownPos();
      requestAnimationFrame(() => addSearchInputRef.current?.focus());
    }
  }, [isAddDropdownOpen, updateAddDropdownPos]);

  const handleMemberRoleChange = (memberId: string, nextRole: string | null) => {
    if (!nextRole) return;
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, businessRole: nextRole as SpaceBusinessRole } : m)),
    );
  };

  const handleRemoveMember = (memberId: string) => {
    const removed = members.find((m) => m.id === memberId);
    if (!removed) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setAvailableUsers((prev) => [...prev, { userId: removed.userId, fullName: removed.fullName }]);
    setMembersPage(1);
  };

  const handleAddMember = (userId: string) => {
    const selectedUser = availableUsers.find((u) => u.userId === userId);
    if (!selectedUser) return;
    const newId = `sm-${crypto.randomUUID()}`;
    setMembers((prev) => [
      ...prev,
      { id: newId, userId: selectedUser.userId, fullName: selectedUser.fullName, businessRole: "Viewer" as SpaceBusinessRole },
    ]);
    setAvailableUsers((prev) => prev.filter((u) => u.userId !== userId));
    setLastAddedMemberId(newId);
    setIsAddDropdownOpen(false);
    setAddSearchQuery("");
    toast.success("Member added");
  };

  useEffect(() => {
    if (!lastAddedMemberId) return;
    const lastPage = Math.max(1, Math.ceil(members.length / PAGE_SIZE));
    setMembersPage(lastPage);
  }, [lastAddedMemberId, members.length]);

  useEffect(() => {
    if (!lastAddedMemberId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLButtonElement>(`[data-member-id="${lastAddedMemberId}"] [data-slot="select-trigger"]`);
      if (el) {
        el.setAttribute("data-focus-visible", "");
        el.focus();
        const handleBlur = () => {
          el.removeAttribute("data-focus-visible");
          el.removeEventListener("blur", handleBlur);
        };
        el.addEventListener("blur", handleBlur);
      }
      setLastAddedMemberId(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [lastAddedMemberId, membersPage]);

  // ===================== CUSTOM FIELDS LOGIC =====================

  const visibleFields = useMemo(
    () => (showArchivedFields ? customFields : customFields.filter((f) => !f.isArchived)),
    [customFields, showArchivedFields],
  );

  const fieldsTotalPages = Math.max(1, Math.ceil(visibleFields.length / PAGE_SIZE));
  const fieldsSafePage = Math.min(fieldsPage, fieldsTotalPages);
  const paginatedFields = visibleFields.slice((fieldsSafePage - 1) * PAGE_SIZE, fieldsSafePage * PAGE_SIZE);

  const handleFieldRename = (id: string, name: string) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)));
  };

  const handleFieldTypeChange = (id: string, fieldType: string | null) => {
    if (!fieldType) return;
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, fieldType: fieldType as CustomFieldType } : f)));
  };

  const handleFieldArchive = (id: string) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, isArchived: true } : f)));
    toast.success("Field archived");
  };

  const handleFieldRestore = (id: string) => {
    setCustomFields((prev) => prev.map((f) => (f.id === id ? { ...f, isArchived: false } : f)));
    toast.success("Field restored");
  };

  const handleFieldDeleteConfirm = () => {
    if (!deleteFieldId) return;
    setCustomFields((prev) => prev.filter((f) => f.id !== deleteFieldId));
    setDeleteFieldId(null);
    toast.success("Field deleted");
  };

  const handleAddField = () => {
    const newId = `cf-${crypto.randomUUID()}`;
    setCustomFields((prev) => [...prev, { id: newId, name: "New field", fieldType: "Text" as CustomFieldType, isArchived: false }]);
    setLastAddedFieldId(newId);
  };

  useEffect(() => {
    if (!lastAddedFieldId) return;
    const total = showArchivedFields ? customFields.length : customFields.filter((f) => !f.isArchived).length;
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
    setFieldsPage(lastPage);
  }, [lastAddedFieldId, customFields, showArchivedFields]);

  useEffect(() => {
    if (!lastAddedFieldId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-field-id="${lastAddedFieldId}"] input`);
      if (el) {
        el.focus();
        el.select();
      }
      setLastAddedFieldId(null);
    }, 100);
    return () => clearTimeout(timer);
  }, [lastAddedFieldId, fieldsPage]);

  // ===================== GENERAL ACTIONS =====================

  const handleSpaceFieldChange = (field: keyof SpaceDraft, value: string | boolean) => {
    setSpaceDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleArchiveConfirm = () => {
    setSpaceDraft((prev) => ({ ...prev, isArchived: true }));
    setIsArchiveConfirmOpen(false);
    toast.success("Space archived");
  };

  const handleSaveChanges = () => {
    if (hasNameError) {
      toast.error("Please enter a space name.");
      return;
    }
    toast.success("Space settings saved");
    onOpenChange(false);
  };

  // ===================== PAGINATION HELPER =====================

  const PaginationRow = ({ page, totalPages: tp, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) =>
    tp > 1 ? (
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button type="button" variant="ghost" size="icon-xs" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))} aria-label="Previous page">
          <ChevronLeft aria-hidden className="size-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground">{page} / {tp}</span>
        <Button type="button" variant="ghost" size="icon-xs" disabled={page >= tp} onClick={() => onPageChange(Math.min(tp, page + 1))} aria-label="Next page">
          <ChevronRight aria-hidden className="size-3.5" />
        </Button>
      </div>
    ) : null;

  // ===================== VIEW: MAIN =====================

  const renderMainView = () => (
    <>
      <DialogHeader className="shrink-0 gap-1 px-4 py-3">
        <DialogTitle className="text-lg font-semibold">Edit space: {spaceDraft.name}</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">Manage general settings, stages, members, and custom fields for this space.</DialogDescription>
      </DialogHeader>

      <div className="max-h-[calc(90svh-8rem)] overflow-y-auto">
        <div className="grid gap-3 px-4 pb-4">
          {/* General Settings */}
          <section className="grid gap-2 rounded-xl border border-[var(--corportal-border-grey)] bg-card p-3">
            <div className="grid gap-2 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Name</span>
                <Input
                  value={spaceDraft.name}
                  onChange={(e) => handleSpaceFieldChange("name", e.target.value)}
                  aria-label="Space name"
                  aria-invalid={hasNameError}
                  placeholder="Space name"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted-foreground">Tenant</span>
                <Select value={spaceDraft.tenantId} onValueChange={(v) => handleSpaceFieldChange("tenantId", v ?? "")}>
                  <SelectTrigger className="w-full" aria-label="Tenant">
                    <SelectValue placeholder="Tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACE_SETTINGS_SEED.tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              <Input
                value={spaceDraft.description}
                onChange={(e) => handleSpaceFieldChange("description", e.target.value)}
                aria-label="Space description"
                placeholder="Short description"
              />
            </label>
          </section>

          {/* Navigation items */}
          <nav className="grid gap-1 rounded-xl border border-[var(--corportal-border-grey)] bg-card p-1">
            <button
              type="button"
              onClick={() => setCurrentView("stages")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              aria-label="Edit task stages"
            >
              <Layers aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm font-medium">Task stages</span>
                <span className="ml-2 text-xs text-muted-foreground">{stages.length}</span>
              </div>
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("members")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              aria-label="Edit members"
            >
              <Users aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm font-medium">Members</span>
                <span className="ml-2 text-xs text-muted-foreground">{members.length}</span>
              </div>
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentView("fields")}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
              aria-label="Edit custom fields"
            >
              <Settings2 aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-sm font-medium">Custom fields</span>
                <span className="ml-2 text-xs text-muted-foreground">{visibleFields.length}</span>
              </div>
              <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
            </button>
          </nav>
        </div>
      </div>

      <DialogFooter className="mx-0 mb-0 shrink-0 !justify-between border-t border-[var(--corportal-border-grey)] bg-card px-6 py-4">
        <Button type="button" variant="destructive" size="lg" onClick={() => setIsArchiveConfirmOpen(true)} aria-label="Archive space">
          <Archive aria-hidden className="size-4" />
          Archive
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="lg" onClick={() => onOpenChange(false)} aria-label="Close">
            Close
          </Button>
          <Button type="button" size="lg" onClick={handleSaveChanges} aria-label="Save changes">
            Save changes
          </Button>
        </div>
      </DialogFooter>
    </>
  );

  // ===================== VIEW: STAGES =====================

  const renderStagesView = () => (
    <>
      <DialogHeader className="shrink-0 gap-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            aria-label="Back to settings"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <DialogTitle className="flex-1 text-lg font-semibold">Task stages</DialogTitle>
        </div>
        <div className="flex items-center justify-between pl-11">
          <DialogDescription className="text-xs text-muted-foreground">Add, reorder, rename, and color-code workflow stages.</DialogDescription>
          <Button type="button" variant="outline" size="sm" onClick={handleAddStage} aria-label="Add stage" className="shrink-0">
            <Plus aria-hidden className="size-3.5" />
            Add
          </Button>
        </div>
      </DialogHeader>

      <div className="max-h-[calc(90svh-8rem)] overflow-y-auto px-4 pb-4">
        <div className="rounded-lg border border-[var(--corportal-border-grey)]">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[8%]" />
              <col className="w-[45%]" />
              <col className="w-[15%]" />
              <col className="w-[20%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 px-3 text-sm">#</TableHead>
                <TableHead className="h-9 px-3 text-sm">Color</TableHead>
                <TableHead className="h-9 px-3 text-sm">Name</TableHead>
                <TableHead className="h-9 px-3 text-sm">Tasks</TableHead>
                <TableHead className="h-9 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedStages.map((stage) => (
                <TableRow key={stage.id} data-stage-id={stage.id}>
                  <TableCell className="px-3 py-1">
                    <div className="flex items-center gap-1">
                      <span className="w-5 text-center text-sm text-muted-foreground">{stage.order}</span>
                      <div className="flex flex-col">
                        <Button
                          type="button" variant="ghost" size="icon-xs"
                          className="size-5"
                          disabled={stage.order === 1}
                          onClick={() => handleStageMove(stage.id, "up")}
                          aria-label="Move up"
                        >
                          <ChevronUp aria-hidden className="size-3.5" />
                        </Button>
                        <Button
                          type="button" variant="ghost" size="icon-xs"
                          className="size-5"
                          disabled={stage.order === stages.length}
                          onClick={() => handleStageMove(stage.id, "down")}
                          aria-label="Move down"
                        >
                          <ChevronDown aria-hidden className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <button
                      ref={(el) => { if (el) colorButtonRefs.current.set(stage.id, el); }}
                      type="button"
                      onClick={() => openColorPicker(stage.id)}
                      className={`size-6 rounded-full border border-black/10 ${stage.color}`}
                      aria-label={`Change color for ${stage.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <Input
                      value={stage.name}
                      onChange={(e) => handleStageRename(stage.id, e.target.value)}
                      aria-label={`Stage name ${stage.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1 text-sm text-muted-foreground">{stage.usedInTasksCount}</TableCell>
                  <TableCell className="px-3 py-1 text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleStageDelete(stage)} aria-label={`Delete ${stage.name}`}>
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedStages.length < PAGE_SIZE && (
                <EmptyStageRows count={PAGE_SIZE - paginatedStages.length} />
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationRow page={stagesSafePage} totalPages={stagesTotalPages} onPageChange={setStagesPage} />
      </div>
    </>
  );

  // ===================== VIEW: MEMBERS =====================

  const renderMembersView = () => (
    <>
      <DialogHeader className="shrink-0 gap-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            aria-label="Back to settings"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <DialogTitle className="flex-1 text-lg font-semibold">Members</DialogTitle>
        </div>
        <div className="flex items-center justify-between pl-11">
          <DialogDescription className="text-xs text-muted-foreground">Add or remove space members and assign business roles.</DialogDescription>
          <Button
            ref={addButtonRef}
            type="button" variant="outline" size="sm"
            onClick={() => setIsAddDropdownOpen((prev) => !prev)}
            disabled={availableUsers.length === 0}
            aria-label="Add user to space"
            aria-expanded={isAddDropdownOpen}
            className="shrink-0"
          >
            <Plus aria-hidden className="size-3.5" />
            Add
          </Button>
        </div>
      </DialogHeader>

      <div className="max-h-[calc(90svh-8rem)] overflow-y-auto px-4 pb-4">
        <div className="rounded-lg border border-[var(--corportal-border-grey)]">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[50%]" />
              <col className="w-[38%]" />
              <col className="w-[12%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 px-3 text-sm">Member</TableHead>
                <TableHead className="h-9 px-3 text-sm">Role</TableHead>
                <TableHead className="h-9 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.map((member) => (
                <TableRow key={member.id} data-member-id={member.id}>
                  <TableCell className="px-3 py-1 text-sm whitespace-normal">{member.fullName}</TableCell>
                  <TableCell className="px-3 py-1">
                    <Select value={member.businessRole} onValueChange={(v) => handleMemberRoleChange(member.id, v)}>
                      <SelectTrigger className="w-32" aria-label={`Role of ${member.fullName}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_SETTINGS_SEED.businessRoles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-3 py-1 text-right">
                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id)} aria-label={`Remove ${member.fullName}`}>
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <EmptyMemberRows count={PAGE_SIZE - paginatedMembers.length} />
            </TableBody>
          </Table>
        </div>
        <PaginationRow page={membersSafePage} totalPages={membersTotalPages} onPageChange={setMembersPage} />
      </div>
    </>
  );

  // ===================== VIEW: CUSTOM FIELDS =====================

  const renderFieldsView = () => (
    <>
      <DialogHeader className="shrink-0 gap-1 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-accent"
            aria-label="Back to settings"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <DialogTitle className="flex-1 text-lg font-semibold">Custom fields</DialogTitle>
        </div>
        <div className="flex items-center justify-between pl-11">
          <DialogDescription className="text-xs text-muted-foreground">Create and manage custom fields available across all tasks in this space.</DialogDescription>
          <Button type="button" variant="outline" size="sm" onClick={handleAddField} aria-label="Add custom field" className="shrink-0">
            <Plus aria-hidden className="size-3.5" />
            Add
          </Button>
        </div>
      </DialogHeader>

      <div className="max-h-[calc(90svh-8rem)] overflow-y-auto px-4 pb-4">
        <div className="rounded-lg border border-[var(--corportal-border-grey)]">
          <Table className="table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[25%]" />
              <col className="w-[15%]" />
              <col className="w-[25%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-9 px-3 text-sm">Name</TableHead>
                <TableHead className="h-9 px-3 text-sm">Type</TableHead>
                <TableHead className="h-9 px-3 text-sm">Status</TableHead>
                <TableHead className="h-9 px-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFields.map((field) => (
                <TableRow key={field.id} data-field-id={field.id} className={field.isArchived ? "opacity-60" : ""}>
                  <TableCell className="px-3 py-1">
                    <Input
                      value={field.name}
                      onChange={(e) => handleFieldRename(field.id, e.target.value)}
                      disabled={field.isArchived}
                      aria-label={`Field name ${field.name}`}
                    />
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    <Select value={field.fieldType} onValueChange={(v) => handleFieldTypeChange(field.id, v)} disabled={field.isArchived}>
                      <SelectTrigger className="w-28" aria-label={`Type of ${field.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SPACE_SETTINGS_SEED.fieldTypes.map((ft) => (
                          <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-3 py-1">
                    {field.isArchived ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">Archived</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>
                    )}
                  </TableCell>
                  <TableCell className="px-3 py-1 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {field.isArchived ? (
                        <>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleFieldRestore(field.id)} aria-label={`Restore ${field.name}`}>
                            <ArchiveRestore aria-hidden className="size-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" onClick={() => setDeleteFieldId(field.id)} aria-label={`Delete ${field.name}`}>
                            <Trash2 aria-hidden className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleFieldArchive(field.id)} aria-label={`Archive ${field.name}`}>
                          <Archive aria-hidden className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedFields.length < PAGE_SIZE && (
                <EmptyFieldRows count={PAGE_SIZE - paginatedFields.length} />
              )}
            </TableBody>
          </Table>
        </div>
        <div className="grid grid-cols-3 items-center pt-2">
          <div />
          <div className="flex items-center justify-center gap-2">
            {fieldsTotalPages > 1 && (
              <>
                <Button type="button" variant="ghost" size="icon-xs" disabled={fieldsSafePage <= 1} onClick={() => setFieldsPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                  <ChevronLeft aria-hidden className="size-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">{fieldsSafePage} / {fieldsTotalPages}</span>
                <Button type="button" variant="ghost" size="icon-xs" disabled={fieldsSafePage >= fieldsTotalPages} onClick={() => setFieldsPage((p) => Math.min(fieldsTotalPages, p + 1))} aria-label="Next page">
                  <ChevronRight aria-hidden className="size-3.5" />
                </Button>
              </>
            )}
          </div>
          <label className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={showArchivedFields}
              onChange={(e) => { setShowArchivedFields(e.target.checked); setFieldsPage(1); }}
              className="size-3.5 rounded border-input"
              aria-label="Show archived fields"
            />
            Show archived
          </label>
        </div>
      </div>
    </>
  );

  // ===================== RENDER =====================

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex w-[min(576px,calc(100vw-2rem))] max-w-none flex-col gap-0 overflow-x-hidden bg-background p-0 text-foreground sm:max-w-none"
          showCloseButton
        >
          {currentView === "main" && renderMainView()}
          {currentView === "stages" && renderStagesView()}
          {currentView === "members" && renderMembersView()}
          {currentView === "fields" && renderFieldsView()}
        </DialogContent>

        {/* Add member dropdown (portal) */}
        {isAddDropdownOpen && addDropdownPos
          ? createPortal(
            <div
              ref={addDropdownRef}
              className="fixed z-[100] w-64 rounded-lg border border-[var(--corportal-border-grey)] bg-popover p-1 shadow-md"
              style={{ top: addDropdownPos.top, left: addDropdownPos.left }}
            >
              <div className="relative px-1 pb-1">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={addSearchInputRef}
                  type="text"
                  value={addSearchQuery}
                  onChange={(e) => setAddSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full rounded-md border border-input bg-transparent py-1.5 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  aria-label="Search user by name"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredAvailableUsers.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">No users found</p>
                ) : (
                  filteredAvailableUsers.map((u) => (
                    <button
                      key={u.userId}
                      type="button"
                      onClick={() => handleAddMember(u.userId)}
                      className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {u.fullName}
                    </button>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
          : null}

        {/* Color picker dropdown (portal) */}
        {colorPickerStageId && colorPickerPos
          ? createPortal(
            <div
              ref={colorPickerRef}
              className="fixed z-[100] rounded-lg border border-[var(--corportal-border-grey)] bg-popover p-2 shadow-md"
              style={{ top: colorPickerPos.top, left: colorPickerPos.left }}
            >
              <div className="grid grid-cols-6 gap-1.5">
                {STAGE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleStageColorChange(colorPickerStageId, c.tw)}
                    className={`size-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${c.tw}`}
                    aria-label={c.label}
                  />
                ))}
              </div>
            </div>,
            document.body,
          )
          : null}
      </Dialog>

      {/* Archive space confirmation */}
      <AlertDialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive space</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive &quot;{spaceDraft.name}&quot;? This action can be undone later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete field confirmation */}
      <AlertDialog open={!!deleteFieldId} onOpenChange={(o) => { if (!o) setDeleteFieldId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this field? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFieldDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const EmptyStageRows = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <TableRow key={`empty-s-${i}`} className="pointer-events-none hover:bg-transparent border-b-transparent">
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-10 items-center text-sm">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-10 items-center text-sm">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-10 items-center text-sm">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-10 items-center text-sm">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-10 items-center text-sm">—</span></TableCell>
      </TableRow>
    ))}
  </>
);

const EmptyMemberRows = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <TableRow key={`empty-m-${i}`} className="pointer-events-none hover:bg-transparent border-b-transparent">
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
      </TableRow>
    ))}
  </>
);

const EmptyFieldRows = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <TableRow key={`empty-f-${i}`} className="pointer-events-none hover:bg-transparent border-b-transparent">
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
        <TableCell className="px-3 py-1"><span className="invisible inline-flex h-8 items-center">—</span></TableCell>
      </TableRow>
    ))}
  </>
);
