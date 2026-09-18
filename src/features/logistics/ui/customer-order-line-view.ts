import {
  freePlacesForProduct,
  remainingToReserveForLine,
  reservedPlacesForLine,
  type StockPlaceQty,
} from "@/features/logistics/logistics-availability";
import { sumReservedForLine, sumShippedForLine } from "@/features/logistics/logistics-balances";
import { productById, productCode } from "@/features/logistics/logistics-lookups";
import type {
  CustomerOrderLine,
  LocationType,
  LogisticsSnapshot,
  StockBalance,
} from "@/features/logistics/logistics-types";

const ofType = (places: StockPlaceQty[], locationType: LocationType): StockPlaceQty[] =>
  places.filter((place) => place.locationType === locationType);

const qtyOf = (places: StockPlaceQty[]): number => places.reduce((sum, place) => sum + place.quantity, 0);

export type WarehouseStockSplit = {
  locationId: string;
  reserved: number;
  free: number;
};

export type CustomerOrderLineView = {
  line: CustomerOrderLine;
  productId: string;
  productName: string;
  productCode: string;
  imageUrl: string | null;
  unit?: string;
  ordered: number;
  produced: number;
  inTransit: number;
  inWarehouse: number;
  shipped: number;
  toReserve: number;
  freeQty: number;
  shortQty: number;
  covered: number;
  productionPlaces: StockPlaceQty[];
  transitPlaces: StockPlaceQty[];
  warehousePlaces: StockPlaceQty[];
  freePlaces: StockPlaceQty[];
  reservedPlaces: StockPlaceQty[];
  warehouseStock: WarehouseStockSplit[];
  canReserve: boolean;
  canShip: boolean;
};

export const buildCustomerOrderLineView = (
  snapshot: LogisticsSnapshot,
  balances: StockBalance[],
  line: CustomerOrderLine,
  canAct: boolean,
): CustomerOrderLineView => {
  const product = productById(snapshot, line.productId);
  const reservedPlaces = reservedPlacesForLine(balances, line.id);
  const freePlaces = freePlacesForProduct(balances, line.productId);
  const productionPlaces = ofType(reservedPlaces, "production_order_line");
  const transitPlaces = ofType(reservedPlaces, "transfer");
  const warehousePlaces = ofType(reservedPlaces, "warehouse");
  const reservedQty = sumReservedForLine(balances, line.id);
  const shipped = sumShippedForLine(balances, line.id);
  const toReserve = remainingToReserveForLine(line, balances);
  const freeQty = qtyOf(freePlaces);
  const warehouseIds = [
    ...new Set([
      ...warehousePlaces.map((place) => place.locationId),
      ...ofType(freePlaces, "warehouse").map((place) => place.locationId),
    ]),
  ];

  return {
    line,
    productId: line.productId,
    productName: product?.name ?? line.productId,
    productCode: productCode(snapshot, line.productId),
    imageUrl: product?.imageUrl ?? null,
    unit: product?.unit,
    ordered: line.quantity,
    produced: qtyOf(productionPlaces),
    inTransit: qtyOf(transitPlaces),
    inWarehouse: qtyOf(warehousePlaces),
    shipped,
    toReserve,
    freeQty,
    shortQty: Math.max(0, toReserve - freeQty),
    covered: reservedQty + shipped,
    productionPlaces,
    transitPlaces,
    warehousePlaces,
    freePlaces,
    reservedPlaces,
    warehouseStock: warehouseIds.map((locationId) => ({
      locationId,
      reserved: qtyOf(warehousePlaces.filter((place) => place.locationId === locationId)),
      free: qtyOf(ofType(freePlaces, "warehouse").filter((place) => place.locationId === locationId)),
    })),
    canReserve: canAct && toReserve > 0 && freePlaces.length > 0,
    canShip: canAct && warehousePlaces.length > 0,
  };
};
