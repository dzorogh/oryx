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
  "Отгрузка с региональных хабов с полной серийной прослеживаемостью и стандартной гарантией.",
  "Настроен для дилерского канала: стабильные сроки поставки и видимость пополнения.",
  "Поддержка каталогом запчастей Sharmax и сервисной сетью на ключевых рынках.",
  "Документация под контейнерную погрузку и экспортную упаковку — по запросу.",
] as const;

const PRODUCT_DESCRIPTION_OVERRIDES: Record<string, ProductDescriptions> = {
  "bike-001": {
    shortDescription:
      "Флагманский квадроцикл Force 1000 EFI с электронным впрыском, рассчитанный на тяжёлые грузы и длинные маршруты.",
    description:
      "Force 1000 EFI — старшая модель семейства Force: утилитарный квадроцикл большого объёма для буксировки, перевозки груза и смешанного рельефа. Электронный впрыск сохраняет предсказуемый отклик в жару и на высоте, а полный привод и усиленная рама подходят для ферм, леса и туристических парков. Производство SH-53, дилерская комплектация и поддержка розничного канала.",
  },
  "bike-002": {
    shortDescription:
      "Туристический Force 750 с эргономикой для долгих поездок по разным покрытиям.",
    description:
      "Force 750 Touring — для тех, кому нужна более лёгкая машина без потери устойчивости на гравии и лёгкой грязи. Акцент на комфорт, удобный доступ к сервису и предсказуемый расход — для проката и гостиничных парков. Под заказ на SH-21, с опциями для пассажира и груза.",
  },
  "bike-003": {
    shortDescription:
      "Эндуро Cross 300 RX для техничных трасс, клубных гонок и прогресса райдера.",
    description:
      "Cross 300 RX — подвижная эндуро-платформа с ходами подвески под корни, бёрмы и смешанный синглтрек. Геометрия рассчитана на райдеров среднего уровня, которые переходят от любительской езды к стартам. Ожидает поставки с SH-53; дилерское распределение идёт по региональным окнам запуска.",
  },
  "bike-004": {
    shortDescription:
      "Электрический Cross E-250 для тихой городской мобильности и лёгкой внедорожной подготовки.",
    description:
      "Cross E-250 — батарея-электрический силовой агрегат для кампусов, курортов и муниципалитетов, где нужен низкий шум. Рекуперация и сменная батарея упрощают ротацию парка. Сборка на SH-40, розничная доступность и стандартная дилерская маржа.",
  },
  "bike-005": {
    shortDescription:
      "Компактный скутер Urban 180 для плотного города, last-mile доставки и студенческой мобильности.",
    description:
      "Urban 180 — малый радиус разворота, прямая посадка и длинные межсервисные интервалы для частого городского использования. Багажник под сиденьем и опциональный кофр закрывают курьерские сценарии. В рознице в архиве, скрыт от дилерской закупки, пока с SH-12 выходят модели-преемники.",
  },
  "bike-006": {
    shortDescription:
      "Скутер Sprint 200 ABS с комбинированным торможением для уверенных остановок в мокром городе.",
    description:
      "Sprint 200 ABS сочетает отзывчивый одноцилиндровый мотор с антиблокировкой, настроенной на повседневную безопасность. Свет, зеркала и шины — под обычную дорогу без лишнего веса. На складе SH-53 для дилеров, которым нужен быстрый оборот скутеров.",
  },
  "bike-009": {
    shortDescription:
      "Снегоход RST 520 для укатанных трасс, замёрзших озёр и зимней буксировки.",
    description:
      "RST 520 балансирует зацеп гусеницы и устойчивость лыж для тех, кто делит время между отдыхом и лёгкой работой. Утеплённая эргономика и устойчивое охлаждение держат длинные морозные сессии. Производство SH-21, сильная розничная доступность в северных регионах.",
  },
  "bike-011": {
    shortDescription:
      "Багги Ace 1000 с двухместной кабиной, грузовой платформой и рабочей буксировкой.",
    description:
      "Ace 1000 Side-by-Side — для бригад, которым нужна перевозка двоих, инструмент и предсказуемый полный привод на площадке. Защита от опрокидывания, фаркоп и рейлинги в экосистеме Ace. Ожидает поставки с SH-53; варианты окраски и телематики — под парк.",
  },
};

type CategoryDescriptionBuilder = (context: DescriptionContext) => ProductDescriptions;

const buildAtvDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const useCase = pick(
    ["сельхозработы", "обслуживание трасс", "охотничьи угодья", "утилитарные парки"],
    seed,
  );
  const feature = pick(
    ["независимую подвеску", "подключаемый полный привод", "помощь двигательным торможением", "герметичную электропроводку"],
    seed + 1,
  );

  return {
    shortDescription: `${displayName} — квадроцикл серии ${family} для ${useCase}: ${feature} и уверенное управление на любом грунте.`,
    description: `${displayName} входит в линейку квадроциклов ${family} и рассчитан на дилеров, которым нужна универсальная платформа по почве, гравию и лёгкой грязи. Модель выделяет ${feature}, усиленные багажники и удобный доступ к фильтрам и трансмиссии. Производство: ${productionSite}. ${pick(CLOSING_LINES, seed + 2)}`,
  };
};

const buildEnduroDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const terrain = pick(["синглтрек", "лесные петли", "клубные эндуро-спецучастки", "тренировочные круги"], seed);

  return {
    shortDescription: `${displayName} — эндуро ${family}, настроенный под ${terrain}: подвижная геометрия и прогрессивная тяга.`,
    description: `${displayName} — для райдеров, которым нужна рама ${family} с подвеской и тормозами под ${terrain}. Развос масс и эргономика удобны для езды стоя и быстрых смен направления без потери стабильности на спусках. Площадка: ${productionSite}. ${pick(CLOSING_LINES, seed + 1)}`,
  };
};

const buildElectricDescriptions: CategoryDescriptionBuilder = ({ displayName, productionSite, seed }) => ({
  shortDescription: `${displayName} — электромотоцикл для тихих кампусов, курортов и контролируемой внедорожной подготовки.`,
  description: `${displayName} использует модульную батарею с настраиваемыми окнами зарядки для операторов парка. Силовой агрегат даёт плавный момент на малых скоростях и меньше обслуживания, чем ДВС. Сборка: ${productionSite}. ${pick(CLOSING_LINES, seed)}`,
});

const buildScooterDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const focus = pick(["ежедневных поездок", "доставочных маршрутов", "кампусной мобильности", "прокатных парков"], seed);

  return {
    shortDescription: `${displayName} — скутер ${family} для ${focus}: компактные габариты и низкая стоимость владения.`,
    description: `${displayName} из семейства скутеров ${family} делает ставку на доступность в сценарии ${focus}. Багажник под сиденьем, удобная высота посадки и понятные межсервисные интервалы держат расходы предсказуемыми для дилеров и парков. Сборка: ${productionSite}. ${pick(CLOSING_LINES, seed + 3)}`,
  };
};

const buildStreetBikeDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const style = pick(["спорт-туризма", "городского спорта", "дальних поездок", "выходных серпантинов"], seed);

  return {
    shortDescription: `${displayName} — дорожный мотоцикл ${family} для ${style}: сбалансированная посадка и дорожные тормоза.`,
    description: `${displayName} расширяет дорожную линейку ${family} для райдеров и дилеров, которым важен ${style}. Жёсткость рамы, шины и свет рассчитаны на смешанную езду по трассе и городу. Финальная сборка и контроль качества — на ${productionSite}. ${pick(CLOSING_LINES, seed + 2)}`,
  };
};

const buildSnowmobileDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => ({
  shortDescription: `${displayName} — снегоход ${family} для укатанных трасс, утилитарной буксировки и зимнего отдыха.`,
  description: `${displayName} даёт устойчивость гусеницы, контроль лыж и термоменеджмент для длинных зимних сессий. Серия ${family} подходит и любителям, и операторам, которым нужна предсказуемая работа ниже нуля. Производство: ${productionSite}. ${pick(CLOSING_LINES, seed + 1)}`,
});

const buildSideBySideDescriptions: CategoryDescriptionBuilder = ({ displayName, family, productionSite, seed }) => {
  const role = pick(["рабочих бригад", "обслуживания территории", "приключенческого туризма", "сельхозподдержки"], seed);

  return {
    shortDescription: `${displayName} — багги ${family} для ${role}: двухместная кабина и универсальный кузов.`,
    description: `${displayName} — UTV семейства ${family} для ${role}: защита пассажиров, фаркоп и полный привод на смешанном рельефе площадки. Рейлинги и дилерские пакеты упрощают стандартизацию парка. Производство: ${productionSite}. ${pick(CLOSING_LINES, seed + 4)}`,
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
  shortDescription: `${context.displayName} — продукт Sharmax категории «${context.category}» семейства ${context.family}, готов к дилерскому и розничному каналам.`,
  description: `${context.displayName} числится в категории «${context.category}», семейство ${context.family}, сборка на ${context.productionSite}. Артикул поддерживает стандартную гарантию, логистические данные и цены вариантов в каталоге магазина. ${pick(CLOSING_LINES, context.seed)}`,
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
