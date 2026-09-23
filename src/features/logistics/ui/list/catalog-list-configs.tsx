"use client";

import type { ReactNode } from "react";
import { warehouseOwnerLabel } from "@/features/logistics/logistics-lookups";
import type { LogisticsSnapshot } from "@/features/logistics/logistics-types";
import { PlantLink } from "@/features/logistics/ui/plant-link";
import { WarehouseLink } from "@/features/logistics/ui/warehouse-link";
import { catalogCodeColumn, catalogNameColumn } from "./list-helpers";
import type { ListColumnDef, ListGroupDef, ListSortDef } from "./list-types";

export type CatalogListRow = {
  id: string;
  code: string;
  name: string;
  href: string;
  relation?: string;
  relationNode?: ReactNode;
  plantOwned?: boolean;
};

export const regionColumns: ListColumnDef<CatalogListRow>[] = [
  catalogCodeColumn<CatalogListRow>(),
  catalogNameColumn<CatalogListRow>(),
];

export const regionSortDefs: ListSortDef<CatalogListRow>[] = [
  { id: "code", label: "Код", type: "text", value: (row) => row.code },
  { id: "name", label: "Название", type: "text", value: (row) => row.name },
];

export const warehouseColumns = (snapshot: LogisticsSnapshot): ListColumnDef<CatalogListRow>[] => [
  catalogCodeColumn<CatalogListRow>(),
  catalogNameColumn<CatalogListRow>(),
  {
    id: "relation",
    label: "Завод",
    sortType: "text",
    sortValue: (row) => row.relation ?? "",
    render: (row) => row.relationNode ?? row.relation ?? "—",
  },
];

export const warehouseSortDefs: ListSortDef<CatalogListRow>[] = [
  { id: "code", label: "Код", type: "text", value: (row) => row.code },
  { id: "name", label: "Название", type: "text", value: (row) => row.name },
];

export const warehouseGroupDefs: ListGroupDef<CatalogListRow>[] = [
  {
    id: "type",
    label: "Тип",
    key: (row) => (row.plantOwned ? "plant" : "standalone"),
    renderHeader: (key) => (key === "plant" ? "Заводской" : "Самостоятельный"),
  },
];

export const plantColumns: ListColumnDef<CatalogListRow>[] = [
  catalogCodeColumn<CatalogListRow>(),
  catalogNameColumn<CatalogListRow>(),
  {
    id: "relation",
    label: "Склад",
    sortType: "text",
    sortValue: (row) => row.relation ?? "",
    render: (row) => row.relationNode ?? row.relation ?? "—",
  },
];

export const plantSortDefs: ListSortDef<CatalogListRow>[] = [
  { id: "code", label: "Код", type: "text", value: (row) => row.code },
  { id: "name", label: "Название", type: "text", value: (row) => row.name },
];

export const mapWarehouseRows = (snapshot: LogisticsSnapshot): CatalogListRow[] =>
  snapshot.warehouses.map((warehouse) => ({
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    href: `/store/logistics/warehouses/${warehouse.id}`,
    plantOwned: Boolean(warehouse.plantId),
    relation: warehouse.plantId
      ? (snapshot.plants.find((plant) => plant.id === warehouse.plantId)?.code ?? warehouse.plantId)
      : warehouseOwnerLabel(snapshot, warehouse.id),
    relationNode: warehouse.plantId ? (
      <PlantLink snapshot={snapshot} plantId={warehouse.plantId} />
    ) : (
      warehouseOwnerLabel(snapshot, warehouse.id)
    ),
  }));

export const mapPlantRows = (snapshot: LogisticsSnapshot): CatalogListRow[] =>
  snapshot.plants.map((plant) => {
    const warehouse = snapshot.warehouses.find((item) => item.plantId === plant.id);
    return {
      id: plant.id,
      code: plant.code,
      name: plant.name,
      href: `/store/logistics/plants/${plant.id}`,
      relation: warehouse?.code,
      relationNode: warehouse ? <WarehouseLink snapshot={snapshot} warehouseId={warehouse.id} /> : "—",
    };
  });

export const mapRegionRows = (snapshot: LogisticsSnapshot): CatalogListRow[] =>
  snapshot.regions.map((region) => ({
    id: region.id,
    code: region.code,
    name: region.name,
    href: `/store/logistics/regions/${region.id}`,
  }));
