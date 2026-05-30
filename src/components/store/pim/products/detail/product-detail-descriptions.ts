import type { StoreCatalogItem } from "../store-catalog-demo-data";
import { getDisplayProductName } from "../catalog/catalog-display";

export type ProductDescriptions = {
  shortDescription: string;
  description: string;
};

type DescriptionContext = {
  displayName: string;
  category: string;
  family: string;
  productionSite: string;
  seed: number;
};

const hashProductId = (id: string): number => {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash + id.charCodeAt(index) * (index + 1)) % 997;
  }
  return hash;
};

const pick = <T>(items: readonly T[], seed: number): T => items[seed % items.length] as T;

const CLOSING_LINES = [
  "Shipped from regional hubs with full serial traceability and standard warranty coverage.",
  "Configured for dealer channels with consistent lead times and replenishment visibility.",
  "Supported by the Sharmax parts catalog and field service network in key markets.",
  "Documented for container loading and compliant export packaging on request.",
] as const;

const PRODUCT_DESCRIPTION_OVERRIDES: Record<string, ProductDescriptions> = {
  "bike-001": {
    shortDescription:
      "Flagship Force 1000 EFI ATV with electronic fuel injection, balanced for heavy loads and long trail days.",
    description:
      "The Force 1000 EFI anchors the Force family as a high-displacement utility ATV tuned for towing, cargo runs, and mixed terrain. Electronic fuel injection keeps throttle response predictable in heat and altitude, while the 4x4 driveline and reinforced frame suit farm, forestry, and adventure fleets. Produced at SH-53 with dealer-ready configuration and retail channel support.",
  },
  "bike-002": {
    shortDescription:
      "Touring-oriented Force 750 with comfort-focused ergonomics for all-day rides across varied surfaces.",
    description:
      "Force 750 Touring targets operators who need a lighter footprint without giving up stability on gravel and light mud. The model emphasizes ride comfort, accessible service points, and predictable fuel use for rental and hospitality fleets. Made to order at SH-21 with configurable accessories for passenger and cargo setups.",
  },
  "bike-003": {
    shortDescription:
      "Cross 300 RX enduro platform aimed at technical trails, club events, and rider progression.",
    description:
      "Cross 300 RX delivers a nimble enduro package with suspension travel suited to roots, berms, and mixed single-track. The chassis is sized for intermediate riders moving from recreational use to organized events. Currently awaiting delivery from SH-53; dealer allocation follows regional launch windows.",
  },
  "bike-004": {
    shortDescription:
      "Electric Cross E-250 for quiet urban mobility and light off-road training environments.",
    description:
      "Cross E-250 introduces a battery-electric powertrain for campuses, resorts, and municipalities that require low-noise operation. Regenerative braking profiles and swappable battery logistics simplify fleet rotation. Built at SH-40 with retail availability and standard dealer margin structures.",
  },
  "bike-005": {
    shortDescription:
      "Compact Urban 180 scooter for dense city routes, last-mile delivery, and student mobility.",
    description:
      "Urban 180 focuses on tight turning circles, upright seating, and low maintenance intervals for high-frequency urban use. Storage under the seat and optional top-case mounts support courier workflows. Archived in retail; hidden from dealer purchase while successor models roll out from SH-12.",
  },
  "bike-006": {
    shortDescription:
      "Sprint 200 ABS scooter with combined braking for confident stops in wet city traffic.",
    description:
      "Sprint 200 ABS pairs a responsive single-cylinder engine with an anti-lock braking package tuned for commuter safety. Lighting, mirrors, and tire specs meet everyday road use without oversized weight. Stocked at SH-53 for dealers needing fast-turn scooter inventory.",
  },
  "bike-009": {
    shortDescription:
      "RST 520 snowmobile engineered for groomed trails, frozen lakes, and utility towing in winter.",
    description:
      "RST 520 balances track bite and ski stability for operators who split time between recreation and light work. Insulated ergonomics and a robust cooling strategy support long cold-weather sessions. SH-21 production with strong retail availability across northern territories.",
  },
  "bike-011": {
    shortDescription:
      "Ace 1000 side-by-side with dual-seat cabin, cargo bed, and work-grade towing capacity.",
    description:
      "Ace 1000 Side-by-Side is built for crews that need two-up transport, tool hauling, and predictable 4x4 traction on job sites. Roll-over protection, hitch points, and accessory rails integrate with the Ace ecosystem. Awaiting delivery from SH-53; configure variants for fleet paint and telematics.",
  },
};

type CategoryDescriptionBuilder = (context: DescriptionContext) => ProductDescriptions;

const buildAtvDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const useCase = pick(
    ["farm operations", "trail maintenance", "hunting leases", "utility fleets"],
    seed,
  );
  const feature = pick(
    ["independent suspension", "selectable 4x4 drive", "engine braking assist", "sealed electrical routing"],
    seed + 1,
  );

  return {
    shortDescription: `${displayName} is a ${family} series ATV for ${useCase}, pairing ${feature} with dependable all-terrain control.`,
    description: `${displayName} belongs to the ${family} ATV line and is spec'd for dealers who need a versatile platform across soil, gravel, and light mud. The model highlights ${feature}, reinforced racks, and service-friendly access to filters and driveline components. Manufactured at ${productionSite}. ${pick(CLOSING_LINES, seed + 2)}`,
  };
};

const buildEnduroDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const terrain = pick(["single-track", "forest loops", "club enduro stages", "training circuits"], seed);

  return {
    shortDescription: `${displayName} — ${family} enduro bike tuned for ${terrain} with agile handling and progressive power delivery.`,
    description: `${displayName} targets riders who want a ${family} chassis with suspension and braking tuned for ${terrain}. Weight distribution and ergonomics favor stand-up riding and quick direction changes without sacrificing stability on descents. Production site: ${productionSite}. ${pick(CLOSING_LINES, seed + 1)}`,
  };
};

const buildElectricDescriptions: CategoryDescriptionBuilder = ({ displayName, productionSite, seed }) => ({
  shortDescription: `${displayName} is a battery-electric motorcycle for quiet campuses, resorts, and controlled off-road training.`,
  description: `${displayName} uses a modular battery architecture with configurable charge windows for fleet operators. The powertrain is optimized for smooth torque at low speeds and minimal maintenance versus ICE counterparts. Built at ${productionSite}. ${pick(CLOSING_LINES, seed)}`,
});

const buildScooterDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const focus = pick(["daily commuting", "delivery routes", "campus mobility", "rental pools"], seed);

  return {
    shortDescription: `${displayName} — ${family} scooter designed for ${focus} with compact dimensions and low running costs.`,
    description: `${displayName} from the ${family} scooter family emphasizes uptime in ${focus}. Under-seat storage, approachable seat height, and straightforward service intervals keep operating costs predictable for dealers and fleet buyers. Assembled at ${productionSite}. ${pick(CLOSING_LINES, seed + 3)}`,
  };
};

const buildStreetBikeDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const style = pick(["sport-touring", "urban sport", "long-distance touring", "weekend canyon rides"], seed);

  return {
    shortDescription: `${displayName} — ${family} street motorcycle configured for ${style} with balanced ergonomics and road-ready braking.`,
    description: `${displayName} extends the ${family} road lineup for riders and dealers focused on ${style}. Frame rigidity, tire selection, and lighting packages align with mixed highway and city use. ${productionSite} handles final assembly and quality gates. ${pick(CLOSING_LINES, seed + 2)}`,
  };
};

const buildSnowmobileDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => ({
  shortDescription: `${displayName} — ${family} snowmobile for groomed trails, utility towing, and cold-climate recreation.`,
  description: `${displayName} delivers track stability, ski control, and thermal management for extended winter sessions. The ${family} series supports both recreational buyers and operators who need predictable performance below freezing. Produced at ${productionSite}. ${pick(CLOSING_LINES, seed + 1)}`,
});

const buildSideBySideDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const role = pick(["work crews", "estate maintenance", "adventure tourism", "agricultural support"], seed);

  return {
    shortDescription: `${displayName} — ${family} side-by-side built for ${role} with two-up cabin comfort and cargo versatility.`,
    description: `${displayName} is a ${family} UTV configured for ${role}, combining passenger protection, hitch capability, and 4x4 traction for mixed job-site terrain. Accessory rails and dealer-fit packages simplify fleet standardization. ${productionSite} production. ${pick(CLOSING_LINES, seed + 4)}`,
  };
};

const CATEGORY_DESCRIPTION_BUILDERS: Record<string, CategoryDescriptionBuilder> = {
  "atv-4x4": buildAtvDescriptions,
  "off-road-enduro": buildEnduroDescriptions,
  "atv-electric-motorcycles": buildElectricDescriptions,
  "road-scooter": buildScooterDescriptions,
  "road-street-bike": buildStreetBikeDescriptions,
  "off-road-snowmobile": buildSnowmobileDescriptions,
  "atv-side-by-side": buildSideBySideDescriptions,
};

const buildFallbackDescriptions = (context: DescriptionContext): ProductDescriptions => ({
  shortDescription: `${context.displayName} is a Sharmax ${context.category} product in the ${context.family} family, ready for dealer and retail channels.`,
  description: `${context.displayName} is listed under ${context.category} with ${context.family} lineage and assembly at ${context.productionSite}. The SKU supports standard warranty, logistics data, and variant-level pricing in the store catalog. ${pick(CLOSING_LINES, context.seed)}`,
});

export const buildProductDescriptions = (item: StoreCatalogItem): ProductDescriptions => {
  const override = PRODUCT_DESCRIPTION_OVERRIDES[item.id];
  if (override) {
    return override;
  }

  const context: DescriptionContext = {
    displayName: getDisplayProductName(item.name),
    category: item.category,
    family: item.family,
    productionSite: item.productionSite,
    seed: hashProductId(item.id),
  };

  const builder = CATEGORY_DESCRIPTION_BUILDERS[item.categoryId] ?? buildFallbackDescriptions;
  return builder(context);
};
