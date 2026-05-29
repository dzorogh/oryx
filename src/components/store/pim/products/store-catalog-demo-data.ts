export type DealerStatus = "Hidden" | "Available for purchase" | "Unavailable for purchase";

export type RetailStatus = "Available for sale" | "Made to order" | "Awaiting delivery" | "Archived";

export type StoreCatalogItem = {
  id: string;
  name: string;
  sku: string;
  imageSrc: string;
  imageAlt: string;
  categoryId: string;
  category: string;
  family: string;
  dealerPrice: number | null;
  retailPrice: number | null;
  dealerStatus: DealerStatus;
  retailStatus: RetailStatus;
  productionSite: string;
};

const STORE_CATALOG_BASE_ITEMS: StoreCatalogItem[] = [
  {
    id: "bike-001",
    name: "Oryx Force 1000 EFI",
    sku: "100451",
    imageSrc: "/store/demo-images/force-1000-photo.jpg",
    imageAlt: "ATV Oryx Force 1000 EFI",
    categoryId: "atv-4x4",
    category: "4x4",
    family: "Force",
    dealerPrice: 11990,
    retailPrice: 13990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-53",
  },
  {
    id: "bike-002",
    name: "Oryx Force 750 Touring",
    sku: "100452",
    imageSrc: "/store/demo-images/force-750-photo.jpg",
    imageAlt: "ATV Oryx Force 750 Touring",
    categoryId: "atv-4x4",
    category: "4x4",
    family: "Force",
    dealerPrice: 9790,
    retailPrice: 11490,
    dealerStatus: "Available for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-21",
  },
  {
    id: "bike-003",
    name: "Oryx Cross 300 RX",
    sku: "203781",
    imageSrc: "/store/demo-images/cross-300-photo.jpg",
    imageAlt: "Enduro Oryx Cross 300 RX",
    categoryId: "off-road-enduro",
    category: "Enduro",
    family: "Cross",
    dealerPrice: 5490,
    retailPrice: 6490,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-53",
  },
  {
    id: "bike-004",
    name: "Oryx Cross E-250",
    sku: "203782",
    imageSrc: "/store/demo-images/cross-e250-photo.jpg",
    imageAlt: "Electric bike Oryx Cross E-250",
    categoryId: "atv-electric-motorcycles",
    category: "Electric Motorcycles",
    family: "Cross",
    dealerPrice: 4990,
    retailPrice: 5990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-40",
  },
  {
    id: "bike-005",
    name: "Oryx Urban 180",
    sku: "310945",
    imageSrc: "/store/demo-images/urban-180-photo.jpg",
    imageAlt: "Scooter Oryx Urban 180",
    categoryId: "road-scooter",
    category: "Scooter",
    family: "Urban",
    dealerPrice: 2790,
    retailPrice: 3290,
    dealerStatus: "Hidden",
    retailStatus: "Archived",
    productionSite: "SH-12",
  },
  {
    id: "bike-006",
    name: "Oryx Sprint 200 ABS",
    sku: "310946",
    imageSrc: "/store/demo-images/sprint-200-photo.jpg",
    imageAlt: "Scooter Oryx Sprint 200 ABS",
    categoryId: "road-scooter",
    category: "Scooter",
    family: "Sprint",
    dealerPrice: 3290,
    retailPrice: 3890,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-53",
  },
  {
    id: "bike-007",
    name: "Oryx GP 450 Rally",
    sku: "427501",
    imageSrc: "/store/demo-images/gp-450-photo.jpg",
    imageAlt: "Motorcycle Oryx GP 450 Rally",
    categoryId: "road-street-bike",
    category: "Street Bike",
    family: "GP",
    dealerPrice: 7190,
    retailPrice: 8490,
    dealerStatus: "Available for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-53",
  },
  {
    id: "bike-008",
    name: "Oryx GP 650 Touring",
    sku: "427502",
    imageSrc: "/store/demo-images/gp-650-photo.jpg",
    imageAlt: "Motorcycle Oryx GP 650 Touring",
    categoryId: "road-street-bike",
    category: "Street Bike",
    family: "GP",
    dealerPrice: 9290,
    retailPrice: 10990,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-08",
  },
  {
    id: "bike-009",
    name: "Oryx RST 520",
    sku: "518340",
    imageSrc: "/store/demo-images/rst-520-photo.jpg",
    imageAlt: "Snowmobile Oryx RST 520",
    categoryId: "off-road-snowmobile",
    category: "Snowmobile",
    family: "RST",
    dealerPrice: 10290,
    retailPrice: 11990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-21",
  },
  {
    id: "bike-010",
    name: "Oryx RST 620 Ultra",
    sku: "518341",
    imageSrc: "/store/demo-images/rst-620-photo.jpg",
    imageAlt: "Snowmobile Oryx RST 620 Ultra",
    categoryId: "off-road-snowmobile",
    category: "Snowmobile",
    family: "RST",
    dealerPrice: 11590,
    retailPrice: 13490,
    dealerStatus: "Available for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-53",
  },
  {
    id: "bike-011",
    name: "Oryx Ace 1000 Side-by-Side",
    sku: "689220",
    imageSrc: "/store/demo-images/ace-1000-photo.jpg",
    imageAlt: "Side-by-side Oryx Ace 1000 Side-by-Side",
    categoryId: "atv-side-by-side",
    category: "Side-by-Side",
    family: "Ace",
    dealerPrice: 18990,
    retailPrice: 21990,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-53",
  },
  {
    id: "bike-012",
    name: "Oryx Ace 700 Trail",
    sku: "689221",
    imageSrc: "/store/demo-images/ace-700-photo.jpg",
    imageAlt: "Side-by-side Oryx Ace 700 Trail",
    categoryId: "atv-side-by-side",
    category: "Side-by-Side",
    family: "Ace",
    dealerPrice: 14490,
    retailPrice: 16990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-40",
  },
  {
    id: "bike-013",
    name: "Oryx Force 650 PRO",
    sku: "100453",
    imageSrc: "/store/demo-images/force-650-photo.jpg",
    imageAlt: "ATV Oryx Force 650 PRO",
    categoryId: "atv-4x4",
    category: "4x4",
    family: "Force",
    dealerPrice: 8490,
    retailPrice: 9990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-53",
  },
  {
    id: "bike-014",
    name: "Oryx Force 850 Expedition",
    sku: "100454",
    imageSrc: "/store/demo-images/force-1000-photo.jpg",
    imageAlt: "ATV Oryx Force 850 Expedition",
    categoryId: "atv-4x4",
    category: "4x4",
    family: "Force",
    dealerPrice: 10690,
    retailPrice: 12490,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-21",
  },
  {
    id: "bike-015",
    name: "Oryx Cross 280 Enduro",
    sku: "203783",
    imageSrc: "/store/demo-images/cross-300-photo.jpg",
    imageAlt: "Enduro Oryx Cross 280 Enduro",
    categoryId: "off-road-enduro",
    category: "Enduro",
    family: "Cross",
    dealerPrice: 4990,
    retailPrice: 5990,
    dealerStatus: "Available for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-40",
  },
  {
    id: "bike-016",
    name: "Oryx Cross 450 Adventure",
    sku: "203784",
    imageSrc: "/store/demo-images/cross-450-photo.jpg",
    imageAlt: "Enduro Oryx Cross 450 Adventure",
    categoryId: "off-road-enduro",
    category: "Enduro",
    family: "Cross",
    dealerPrice: 6790,
    retailPrice: 7990,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-53",
  },
  {
    id: "bike-017",
    name: "Oryx Urban 125 City",
    sku: "310947",
    imageSrc: "/store/demo-images/urban-180-photo.jpg",
    imageAlt: "Scooter Oryx Urban 125 City",
    categoryId: "road-scooter",
    category: "Scooter",
    family: "Urban",
    dealerPrice: 2290,
    retailPrice: 2790,
    dealerStatus: "Hidden",
    retailStatus: "Archived",
    productionSite: "SH-12",
  },
  {
    id: "bike-018",
    name: "Oryx Sprint 300 MAX",
    sku: "310948",
    imageSrc: "/store/demo-images/urban-180-photo.jpg",
    imageAlt: "Scooter Oryx Sprint 300 MAX",
    categoryId: "road-scooter",
    category: "Scooter",
    family: "Sprint",
    dealerPrice: 3790,
    retailPrice: 4490,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-53",
  },
  {
    id: "bike-019",
    name: "Oryx GP 300 Street",
    sku: "427503",
    imageSrc: "/store/demo-images/gp-300-photo.jpg",
    imageAlt: "Motorcycle Oryx GP 300 Street",
    categoryId: "road-street-bike",
    category: "Street Bike",
    family: "GP",
    dealerPrice: 5490,
    retailPrice: 6490,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-08",
  },
  {
    id: "bike-020",
    name: "Oryx GP 700 Touring Plus",
    sku: "427504",
    imageSrc: "/store/demo-images/gp-450-photo.jpg",
    imageAlt: "Motorcycle Oryx GP 700 Touring Plus",
    categoryId: "road-street-bike",
    category: "Street Bike",
    family: "GP",
    dealerPrice: 9790,
    retailPrice: 11490,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-53",
  },
  {
    id: "bike-021",
    name: "Oryx RST 450 Snow",
    sku: "518342",
    imageSrc: "/store/demo-images/rst-520-photo.jpg",
    imageAlt: "Snowmobile Oryx RST 450 Snow",
    categoryId: "off-road-snowmobile",
    category: "Snowmobile",
    family: "RST",
    dealerPrice: 8490,
    retailPrice: 9990,
    dealerStatus: "Available for purchase",
    retailStatus: "Available for sale",
    productionSite: "SH-21",
  },
  {
    id: "bike-022",
    name: "Oryx RST 720 Arctic",
    sku: "518343",
    imageSrc: "/store/demo-images/rst-520-photo.jpg",
    imageAlt: "Snowmobile Oryx RST 720 Arctic",
    categoryId: "off-road-snowmobile",
    category: "Snowmobile",
    family: "RST",
    dealerPrice: 12890,
    retailPrice: 14990,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-53",
  },
  {
    id: "bike-023",
    name: "Oryx Ace 900 Trail Pro",
    sku: "689222",
    imageSrc: "/store/demo-images/ace-1000-photo.jpg",
    imageAlt: "Side-by-side Oryx Ace 900 Trail Pro",
    categoryId: "atv-side-by-side",
    category: "Side-by-Side",
    family: "Ace",
    dealerPrice: 16290,
    retailPrice: 18990,
    dealerStatus: "Available for purchase",
    retailStatus: "Made to order",
    productionSite: "SH-40",
  },
  {
    id: "bike-024",
    name: "Oryx Ace 1100 Rally",
    sku: "689223",
    imageSrc: "/store/demo-images/ace-1000-photo.jpg",
    imageAlt: "Side-by-side Oryx Ace 1100 Rally",
    categoryId: "atv-side-by-side",
    category: "Side-by-Side",
    family: "Ace",
    dealerPrice: 20490,
    retailPrice: 23990,
    dealerStatus: "Unavailable for purchase",
    retailStatus: "Awaiting delivery",
    productionSite: "SH-53",
  },
];

const GENERATED_ITEMS_COUNT = 48;
const GENERATED_SITE_CODES = ["SH-12", "SH-21", "SH-40", "SH-53", "SH-08"] as const;
const GENERATED_DEALER_STATUSES: DealerStatus[] = [
  "Available for purchase",
  "Unavailable for purchase",
  "Hidden",
];
const GENERATED_RETAIL_STATUSES: RetailStatus[] = [
  "Available for sale",
  "Made to order",
  "Awaiting delivery",
];

const GENERATED_CATALOG_ITEMS: StoreCatalogItem[] = Array.from({ length: GENERATED_ITEMS_COUNT }, (_, index) => {
  const baseItem = STORE_CATALOG_BASE_ITEMS[index % STORE_CATALOG_BASE_ITEMS.length] ?? STORE_CATALOG_BASE_ITEMS[0];
  const serial = index + 1;
  const sku = String(700000 + serial);
  const dealerPrice = (baseItem.dealerPrice ?? 0) + ((serial % 12) - 6) * 50;
  const retailPrice = Math.round((dealerPrice * 1.17) / 10) * 10;

  return {
    id: `bike-g${String(serial).padStart(3, "0")}`,
    name: `${baseItem.name} Series ${String(serial).padStart(2, "0")}`,
    sku,
    imageSrc: baseItem.imageSrc,
    imageAlt: baseItem.imageAlt,
    categoryId: baseItem.categoryId,
    category: baseItem.category,
    family: baseItem.family,
    dealerPrice,
    retailPrice,
    dealerStatus: GENERATED_DEALER_STATUSES[index % GENERATED_DEALER_STATUSES.length] ?? "Available for purchase",
    retailStatus: GENERATED_RETAIL_STATUSES[index % GENERATED_RETAIL_STATUSES.length] ?? "Available for sale",
    productionSite: GENERATED_SITE_CODES[index % GENERATED_SITE_CODES.length] ?? "SH-53",
  };
});

type PriceGapMode = "none" | "no-dealer" | "no-retail" | "no-both";

// Примерно 20% товаров остаются без одной или обеих цен (3 из каждых 15 позиций).
const getPriceGapMode = (index: number): PriceGapMode => {
  switch (index % 15) {
    case 3:
      return "no-dealer";
    case 8:
      return "no-retail";
    case 12:
      return "no-both";
    default:
      return "none";
  }
};

const applyPriceGaps = (items: StoreCatalogItem[]): StoreCatalogItem[] =>
  items.map((item, index) => {
    const mode = getPriceGapMode(index);

    if (mode === "none") {
      return item;
    }

    return {
      ...item,
      dealerPrice: mode === "no-dealer" || mode === "no-both" ? null : item.dealerPrice,
      retailPrice: mode === "no-retail" || mode === "no-both" ? null : item.retailPrice,
    };
  });

export const STORE_CATALOG_ITEMS: StoreCatalogItem[] = applyPriceGaps([
  ...STORE_CATALOG_BASE_ITEMS,
  ...GENERATED_CATALOG_ITEMS,
]);
