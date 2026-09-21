"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { hrefForRegion } from "@/features/logistics/logistics-availability";
import { createRegion, updateRegion } from "@/features/logistics/logistics-api";
import { formatQuantity } from "@/features/logistics/logistics-labels";
import { productById } from "@/features/logistics/logistics-lookups";
import { relatedReservationsForRegion } from "@/features/logistics/logistics-related";
import { documentKey, documentKeysForAssignedEntity } from "@/features/logistics/logistics-types";
import { DocumentLedger } from "@/features/logistics/ui/document-ledger";
import { LogisticsDialog } from "@/features/logistics/ui/logistics-dialog";
import { LogisticsCodeBadge } from "@/features/logistics/ui/logistics-code-badge";
import { LogisticsError, LogisticsLoading } from "@/features/logistics/ui/logistics-state";
import { LogisticsPageShell } from "@/features/logistics/ui/logistics-page-shell";
import { LogisticsTableCard } from "@/features/logistics/ui/logistics-table-card";
import { LogisticsToolbar } from "@/features/logistics/ui/logistics-toolbar";
import { RelatedDocuments } from "@/features/logistics/ui/related-documents";
import { runLogisticsAction } from "@/features/logistics/ui/run-action";
import { useLogisticsStore } from "@/features/logistics/use-logistics-store";
import { ProductIdentity } from "@/features/logistics/ui/product-identity";

export const RegionsPage = () => {
  const { snapshot, isLoading, error, reload } = useLogisticsStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const create = async () => {
    if (!name.trim()) {
      toast.error("Enter a region name");
      return;
    }
    const ok = await runLogisticsAction(
      () => createRegion({ name: name.trim() }),
      "Region added",
      reload,
    );
    if (ok) {
      setOpen(false);
      setName("");
    }
  };

  return (
    <LogisticsPageShell crumbs={[{ label: "Regions" }]}>
      <LogisticsToolbar
        title="Regions"
        description="Sales regions that can own reserved stock. The code is assigned automatically."
        actionLabel="New region"
        onAction={() => setOpen(true)}
      />
      {isLoading ? <LogisticsLoading /> : null}
      {error ? <LogisticsError message={error} /> : null}
      {!isLoading && !error ? (
        <LogisticsTableCard headers={["Code", "Name"]} isEmpty={snapshot.regions.length === 0}>
          {snapshot.regions.map((region) => (
            <TableRow key={region.id}>
              <TableCell className="px-3 py-2">
                <LogisticsCodeBadge code={region.code} href={hrefForRegion(region.id)} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm">
                <Link href={hrefForRegion(region.id)} className="text-primary hover:underline">
                  {region.name}
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </LogisticsTableCard>
      ) : null}

      <LogisticsDialog
        open={open}
        onOpenChange={setOpen}
        title="New region"
        description="The code appears after save as REG-n."
      >
        <div className="flex flex-col gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="United Arab Emirates" />
          </label>
          <Button type="button" onClick={() => void create()}>
            Add
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};

export const RegionDetailPage = () => {
  const params = useParams<{ id: string }>();
  const { snapshot, balances, isLoading, error, reload } = useLogisticsStore();
  const region = snapshot.regions.find((item) => item.id === params.id);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");

  const reserved = region
    ? balances.filter(
        (entry) =>
          entry.stockState === "reserved" &&
          entry.ownerType === "region" &&
          entry.ownerId === region.id &&
          Math.abs(entry.quantity) > 1e-9,
      )
    : [];
  const reservedByProduct = new Map<string, number>();
  for (const entry of reserved) {
    reservedByProduct.set(entry.productId, (reservedByProduct.get(entry.productId) ?? 0) + entry.quantity);
  }
  const stockRows = [...reservedByProduct.entries()].sort((left, right) => left[0].localeCompare(right[0]));
  const reservations = region ? relatedReservationsForRegion(snapshot, region.id) : [];

  const openEdit = () => {
    setName(region?.name ?? "");
    setEditOpen(true);
  };

  const save = async () => {
    if (!region || !name.trim()) {
      toast.error("Enter a region name");
      return;
    }
    const ok = await runLogisticsAction(
      () => updateRegion({ id: region.id, name: name.trim() }),
      "Region updated",
      reload,
    );
    if (ok) {
      setEditOpen(false);
    }
  };

  if (isLoading || error || !region) {
    return (
      <LogisticsPageShell crumbs={[{ label: "Regions", href: "/store/logistics/regions" }, { label: "Region" }]}>
        {isLoading ? <LogisticsLoading /> : <LogisticsError message={error ?? "Region not found."} />}
      </LogisticsPageShell>
    );
  }

  return (
    <LogisticsPageShell crumbs={[{ label: "Regions", href: "/store/logistics/regions" }, { label: region.name }]}>
      <LogisticsToolbar
        title={region.name}
        titleMeta={<LogisticsCodeBadge code={region.code} />}
        description="Reserved stock owned by this region. Release or reassign it with a Reservation."
        actions={
          <Button type="button" size="sm" onClick={openEdit}>
            Edit
          </Button>
        }
      />
      <LogisticsTableCard
        title="Reserved stock"
        headers={["Product", "Reserved"]}
        isEmpty={stockRows.length === 0}
        empty="This region does not own reserved stock yet."
      >
        {stockRows.map(([productId, quantity]) => {
          const product = productById(snapshot, productId);
          return (
            <TableRow key={productId}>
              <TableCell className="px-3 py-2">
                <ProductIdentity snapshot={snapshot} productId={productId} />
              </TableCell>
              <TableCell className="px-3 py-2 text-sm tabular-nums">
                {formatQuantity(quantity, product?.unit)}
              </TableCell>
            </TableRow>
          );
        })}
      </LogisticsTableCard>
      <RelatedDocuments title="Reservations" href="/store/logistics/reservations" items={reservations} />
      <DocumentLedger
        snapshot={snapshot}
        hide="assignedTo"
        filter={(entry) =>
          documentKeysForAssignedEntity(snapshot.transactions, "region", region.id).has(
            documentKey(entry.documentType, entry.documentId),
          )
        }
      />

      <LogisticsDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Region"
        description="The name can be changed. The code is not editable."
      >
        <div className="flex flex-col gap-3">
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            Code: <LogisticsCodeBadge code={region.code} />
          </p>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Name</span>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="United Arab Emirates" />
          </label>
          <Button type="button" onClick={() => void save()}>
            Save
          </Button>
        </div>
      </LogisticsDialog>
    </LogisticsPageShell>
  );
};
