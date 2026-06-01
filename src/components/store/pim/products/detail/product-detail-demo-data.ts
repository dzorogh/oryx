import type { StaticImageData } from "next/image";

import { STORE_DEMO_IMAGE_LIST } from "@/assets/store/demo-images";
import {
  STORE_CATALOG_ITEMS,
  type DealerStatus,
  type RetailStatus,
  type StoreCatalogItem,
} from "../store-catalog-demo-data";
import { getDisplayProductName } from "../catalog/catalog-display";
import { buildProductDescriptions } from "./product-detail-descriptions";

export type ProductAttributeRow = {
  label: string;
  value: string;
};

export type ProductAttributeGroup = {
  id: string;
  label: string;
  rows: ProductAttributeRow[];
};

export type ProductVariant = {
  id: string;
  name: string;
  isDefault: boolean;
  sku: string | null;
  productionSite: string;
  unitQuantity: number;
  dealerStatus: DealerStatus;
  retailStatus: RetailStatus;
  stock: number;
  dealerPrice: number | null;
  retailPrice: number | null;
  imageSrc: StaticImageData;
  imageAlt: string;
  attributeGroups: ProductAttributeGroup[];
  logistics: ProductAttributeRow[];
};

export type ProductDetail = {
  id: string;
  name: string;
  displayName: string;
  sku: string | null;
  brand: string;
  family: string;
  category: string;
  categoryId: string;
  stock: number;
  description: string;
  shortDescription: string;
  imageSrc: StaticImageData;
  imageAlt: string;
  galleryImages: StaticImageData[];
  variants: ProductVariant[];
};

const ATTRIBUTE_GROUPS_TEMPLATE: ProductAttributeGroup[] = [
  {
    id: "dimensions",
    label: "Dimensions",
    rows: [{ label: "Fuel tank volume", value: "5" }],
  },
  {
    id: "engine",
    label: "Engine",
    rows: [
      { label: "Number of strokes", value: "4" },
      { label: "Number of cylinders", value: "1" },
      { label: "Maximum speed", value: "32" },
      { label: "Power (hp)", value: "21" },
      { label: "Engine displacement", value: "250" },
      { label: "Fuel consumption", value: "3" },
      { label: "Starting system", value: "Electric starter" },
      { label: "Fuel delivery system", value: "Carburetor" },
      { label: "Ignition type", value: "CDI" },
      { label: "Cooling type", value: "Air" },
    ],
  },
  {
    id: "recommendations",
    label: "Recommendations",
    rows: [{ label: "Recommended fuel", value: "AI-92" }],
  },
  {
    id: "transmission",
    label: "Transmission",
    rows: [{ label: "Transmission type", value: "Automatic" }],
  },
  {
    id: "specifications",
    label: "Specifications",
    rows: [{ label: "Drive type", value: "4x4" }],
  },
  {
    id: "chassis",
    label: "Chassis",
    rows: [{ label: "Suspension", value: "Independent" }],
  },
];

const LOGISTICS_TEMPLATE: ProductAttributeRow[] = [
  { label: "Height (cm)", value: "85" },
  { label: "Width (cm)", value: "80" },
  { label: "Length (cm)", value: "149" },
  { label: "Weight (kg)", value: "208" },
  { label: "Max units per container", value: "64" },
  { label: "Volume (m³)", value: "1.0132" },
  { label: "Stacking", value: "Yes" },
  { label: "Stacking limit", value: "—" },
  { label: "Rotate along length", value: "No" },
  { label: "Rotate along width", value: "No" },
];

type VariantTrim = {
  suffix: string;
  trimLabel: string;
  color: string;
  powerDelta: number;
  speedDelta: number;
  priceDelta: number;
  productionSite: string | null;
};

const VARIANT_TRIMS: VariantTrim[] = [
  { suffix: "", trimLabel: "Standard", color: "Graphite Black", powerDelta: 0, speedDelta: 0, priceDelta: 0, productionSite: null },
  { suffix: "Touring", trimLabel: "Touring", color: "Arctic White", powerDelta: 3, speedDelta: 5, priceDelta: 750, productionSite: "SH-21" },
  { suffix: "Expedition", trimLabel: "Expedition", color: "Forest Green", powerDelta: 6, speedDelta: 9, priceDelta: 1450, productionSite: "SH-40" },
  { suffix: "Pro", trimLabel: "Pro", color: "Racing Red", powerDelta: 10, speedDelta: 14, priceDelta: 2400, productionSite: "SH-53" },
];

// Распределение количества вариантов по «корзине» хэша: чаще 1, реже 2, ещё реже 3–4.
const VARIANT_COUNT_BY_BUCKET = [3, 1, 2, 1, 2, 1, 4, 2, 1, 3] as const;

const hashProductId = (id: string): number => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % 997;
  }
  return hash;
};

const getVariantCount = (productId: string): number =>
  VARIANT_COUNT_BY_BUCKET[hashProductId(productId) % VARIANT_COUNT_BY_BUCKET.length] ?? 1;

const buildVariantStock = (baseStock: number, variantIndex: number): number => {
  const offset = variantIndex * 17.42;
  return Math.round((baseStock - offset) * 100) / 100;
};

const BASE_POWER_HP = 21;
const BASE_MAX_SPEED = 32;

const buildAttributeGroups = (trim: VariantTrim): ProductAttributeGroup[] =>
  ATTRIBUTE_GROUPS_TEMPLATE.map((group) => {
    if (group.id === "engine") {
      return {
        ...group,
        rows: group.rows.map((row) => {
          if (row.label === "Power (hp)") {
            return { ...row, value: String(BASE_POWER_HP + trim.powerDelta) };
          }
          if (row.label === "Maximum speed") {
            return { ...row, value: String(BASE_MAX_SPEED + trim.speedDelta) };
          }
          return row;
        }),
      };
    }

    if (group.id === "specifications") {
      return {
        ...group,
        rows: [
          ...group.rows,
          { label: "Trim level", value: trim.trimLabel },
          { label: "Color", value: trim.color },
        ],
      };
    }

    return group;
  });

const buildVariants = (item: StoreCatalogItem): ProductVariant[] => {
  const count = getVariantCount(item.id);
  const displayName = getDisplayProductName(item.name);
  const baseStock = 390.32 + (hashProductId(item.id) % 50);

  return Array.from({ length: count }, (_, variantIndex) => {
    const trim = VARIANT_TRIMS[variantIndex] ?? VARIANT_TRIMS[VARIANT_TRIMS.length - 1];
    const isDefault = variantIndex === 0;
    const variantName = isDefault ? displayName : `${displayName} ${trim.suffix}`;

    return {
      id: `${item.id}-v${variantIndex + 1}`,
      name: variantName,
      isDefault,
      sku: isDefault ? item.sku || null : `${item.sku || "000000"}-${variantIndex + 1}`,
      productionSite: trim.productionSite ?? item.productionSite,
      unitQuantity: 1,
      dealerStatus: item.dealerStatus,
      retailStatus: item.retailStatus,
      stock: buildVariantStock(baseStock, variantIndex),
      dealerPrice: item.dealerPrice === null ? null : item.dealerPrice + trim.priceDelta,
      retailPrice: item.retailPrice === null ? null : item.retailPrice + Math.round(trim.priceDelta * 1.15),
      imageSrc: item.imageSrc,
      imageAlt: item.imageAlt,
      attributeGroups: buildAttributeGroups(trim),
      logistics: LOGISTICS_TEMPLATE,
    };
  });
};

// Формирует галерею: главное фото товара первым, затем все остальные кадры из общего пула.
const buildGalleryImages = (item: StoreCatalogItem): StaticImageData[] => {
  const others = STORE_DEMO_IMAGE_LIST.filter((image) => image !== item.imageSrc);
  return [item.imageSrc, ...others];
};

const buildProductDetail = (item: StoreCatalogItem): ProductDetail => {
  const displayName = getDisplayProductName(item.name);
  const stock = 722.52 + (hashProductId(item.id) % 100);
  const { shortDescription, description } = buildProductDescriptions(item);

  return {
    id: item.id,
    name: item.name,
    displayName,
    sku: item.sku || null,
    brand: "Sharmax",
    family: item.family,
    category: item.category,
    categoryId: item.categoryId,
    stock,
    description,
    shortDescription,
    imageSrc: item.imageSrc,
    imageAlt: item.imageAlt,
    galleryImages: buildGalleryImages(item),
    variants: buildVariants(item),
  };
};

const PRODUCT_DETAIL_MAP = new Map(
  STORE_CATALOG_ITEMS.map((item) => [item.id, buildProductDetail(item)]),
);

export const getProductDetail = (productId: string): ProductDetail | null =>
  PRODUCT_DETAIL_MAP.get(productId) ?? null;

export const getProductDetailHref = (productId: string): string => `/store/pim/products/${productId}`;

const VARIANT_CATALOG_ITEM_ID_PATTERN = /-v\d+$/;

export const getParentProductIdFromVariantCatalogId = (variantCatalogItemId: string): string =>
  variantCatalogItemId.replace(VARIANT_CATALOG_ITEM_ID_PATTERN, "");

let variantCatalogItemsCache: StoreCatalogItem[] | null = null;

/** Flattened variant rows for the variants catalog listing (demo). */
export const getVariantCatalogItems = (): StoreCatalogItem[] => {
  if (variantCatalogItemsCache) {
    return variantCatalogItemsCache;
  }

  variantCatalogItemsCache = STORE_CATALOG_ITEMS.flatMap((product, productIndex) =>
    buildVariants(product).map((variant, variantIndex) => ({
      id: variant.id,
      name: variant.isDefault ? product.name : `Oryx ${variant.name}`,
      sku: variant.sku ?? "",
      imageSrc: variant.imageSrc,
      imageAlt: variant.imageAlt,
      categoryId: product.categoryId,
      category: product.category,
      family: product.family,
      dealerPrice: variant.dealerPrice,
      retailPrice: variant.retailPrice,
      dealerStatus: variant.dealerStatus,
      retailStatus: variant.retailStatus,
      productionSite: variant.productionSite,
      brand: product.brand,
      stock: Math.max(0, Math.round(variant.stock)),
      updatedAt: new Date(
        Date.UTC(2026, 0, 12 - ((productIndex + variantIndex) % 40), 10 + (variantIndex % 8), 0, 0),
      ).toISOString(),
    })),
  );

  return variantCatalogItemsCache;
};
