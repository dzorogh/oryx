// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { deterministicSort, type Comparator } from "../../lib/deterministic-sort";
import { placementsOverlap } from "./placement-validation";
import { HEIGHT_TOLERANCE_MM } from "./tolerances";
import type { ContainerType, ContainerInstance, OrderItemUnit, Placement } from "./types";
export type PackingEngineOutput = {
  containers: ContainerInstance[];
  unplacedItemUnitIds: string[];
};

// Свободный 2D-прямоугольник на плоскости слоя (ось X/ось Y).
type FreeRect = {
  x: number;
  y: number;
  width: number;
  length: number;
};
// Слой внутри контейнера: высота полки + доступные области + размещения в этом слое.
type Layer = {
  z: number;
  height: number;
  freeRects: FreeRect[];
  placements: Placement[];
};
// Результат попытки поставить единицу товара в слой.
type TryPlaceResult = {
  placement: Placement;
  nextFreeRects: FreeRect[];
  wasteArea: number;
  wasteWidth: number;
  wasteLength: number;
};
// Профиль скоринга: balanced -> аккуратная группировка, dense -> приоритет плотности.
type PackingProfile = "balanced" | "dense";
// Текущее состояние контейнера во время межконтейнерной упаковки.
type ContainerState = {
  containerIndex: number;
  layers: Layer[];
  placements: Placement[];
};
// Лучший кандидат размещения в уже существующий слой.
type ExistingLayerBest = {
  kind: "existing";
  containerIndex: number;
  layerIndex: number;
  placed: TryPlaceResult;
  score: number[];
};
// Лучший кандидат размещения с открытием нового слоя.
type NewLayerBest = {
  kind: "new";
  containerIndex: number;
  newLayer: Layer;
  placed: TryPlaceResult;
  score: number[];
};
// Объединенный тип лучшего кандидата.
type BestPlacement = ExistingLayerBest | NewLayerBest;

/** Стабильный порядок прямоугольников при слиянии соседей в mergeAdjacentRects. */
const mergeFreeRectComparators: Comparator<FreeRect>[] = stryMutAct_9fa48("0") ? [] : (stryCov_9fa48("0"), [stryMutAct_9fa48("1") ? () => undefined : (stryCov_9fa48("1"), (left, right) => stryMutAct_9fa48("2") ? left.y + right.y : (stryCov_9fa48("2"), left.y - right.y)), stryMutAct_9fa48("3") ? () => undefined : (stryCov_9fa48("3"), (left, right) => stryMutAct_9fa48("4") ? left.x + right.x : (stryCov_9fa48("4"), left.x - right.x)), stryMutAct_9fa48("5") ? () => undefined : (stryCov_9fa48("5"), (left, right) => stryMutAct_9fa48("6") ? left.width + right.width : (stryCov_9fa48("6"), left.width - right.width)), stryMutAct_9fa48("7") ? () => undefined : (stryCov_9fa48("7"), (left, right) => stryMutAct_9fa48("8") ? left.length + right.length : (stryCov_9fa48("8"), left.length - right.length))]);

// Deterministic order of free rectangles keeps solver reproducible across runs.
const sortFreeRects = stryMutAct_9fa48("9") ? () => undefined : (stryCov_9fa48("9"), (() => {
  const sortFreeRects = (freeRects: readonly FreeRect[]) => deterministicSort(stryMutAct_9fa48("10") ? [] : (stryCov_9fa48("10"), [...freeRects]), stryMutAct_9fa48("11") ? () => undefined : (stryCov_9fa48("11"), (left, right) => stryMutAct_9fa48("12") ? left.y + right.y : (stryCov_9fa48("12"), left.y - right.y)), stryMutAct_9fa48("13") ? () => undefined : (stryCov_9fa48("13"), (left, right) => stryMutAct_9fa48("14") ? left.x + right.x : (stryCov_9fa48("14"), left.x - right.x)), stryMutAct_9fa48("15") ? () => undefined : (stryCov_9fa48("15"), (left, right) => stryMutAct_9fa48("16") ? right.width * right.length + left.width * left.length : (stryCov_9fa48("16"), (stryMutAct_9fa48("17") ? right.width / right.length : (stryCov_9fa48("17"), right.width * right.length)) - (stryMutAct_9fa48("18") ? left.width / left.length : (stryCov_9fa48("18"), left.width * left.length)))));
  return sortFreeRects;
})());

// Guillotine split: после размещения делим прямоугольник на "правый" и "передний" остаток.
const splitFreeRect = (rect: FreeRect, placedSize: {
  width: number;
  length: number;
}): FreeRect[] => {
  if (stryMutAct_9fa48("19")) {
    {}
  } else {
    stryCov_9fa48("19");
    const result: FreeRect[] = stryMutAct_9fa48("20") ? ["Stryker was here"] : (stryCov_9fa48("20"), []);
    const rightWidth = stryMutAct_9fa48("21") ? rect.width + placedSize.width : (stryCov_9fa48("21"), rect.width - placedSize.width);
    const frontLength = stryMutAct_9fa48("22") ? rect.length + placedSize.length : (stryCov_9fa48("22"), rect.length - placedSize.length);
    if (stryMutAct_9fa48("26") ? rightWidth <= 0 : stryMutAct_9fa48("25") ? rightWidth >= 0 : stryMutAct_9fa48("24") ? false : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24", "25", "26"), rightWidth > 0)) {
      if (stryMutAct_9fa48("27")) {
        {}
      } else {
        stryCov_9fa48("27");
        result.push(stryMutAct_9fa48("28") ? {} : (stryCov_9fa48("28"), {
          x: stryMutAct_9fa48("29") ? rect.x - placedSize.width : (stryCov_9fa48("29"), rect.x + placedSize.width),
          y: rect.y,
          width: rightWidth,
          length: placedSize.length
        }));
      }
    }
    if (stryMutAct_9fa48("33") ? frontLength <= 0 : stryMutAct_9fa48("32") ? frontLength >= 0 : stryMutAct_9fa48("31") ? false : stryMutAct_9fa48("30") ? true : (stryCov_9fa48("30", "31", "32", "33"), frontLength > 0)) {
      if (stryMutAct_9fa48("34")) {
        {}
      } else {
        stryCov_9fa48("34");
        result.push(stryMutAct_9fa48("35") ? {} : (stryCov_9fa48("35"), {
          x: rect.x,
          y: stryMutAct_9fa48("36") ? rect.y - placedSize.length : (stryCov_9fa48("36"), rect.y + placedSize.length),
          width: rect.width,
          length: frontLength
        }));
      }
    }
    return result;
  }
};

// Объединяет соседние прямоугольники опоры, чтобы слой видел непрерывные площадки.
const mergeAdjacentRects = (rects: readonly FreeRect[]): FreeRect[] => {
  if (stryMutAct_9fa48("37")) {
    {}
  } else {
    stryCov_9fa48("37");
    if (stryMutAct_9fa48("41") ? rects.length > 1 : stryMutAct_9fa48("40") ? rects.length < 1 : stryMutAct_9fa48("39") ? false : stryMutAct_9fa48("38") ? true : (stryCov_9fa48("38", "39", "40", "41"), rects.length <= 1)) return stryMutAct_9fa48("42") ? [] : (stryCov_9fa48("42"), [...rects]);
    let current = deterministicSort(stryMutAct_9fa48("43") ? [] : (stryCov_9fa48("43"), [...rects]), ...mergeFreeRectComparators);
    let changed = stryMutAct_9fa48("44") ? false : (stryCov_9fa48("44"), true);
    while (stryMutAct_9fa48("45") ? false : (stryCov_9fa48("45"), changed)) {
      if (stryMutAct_9fa48("46")) {
        {}
      } else {
        stryCov_9fa48("46");
        changed = stryMutAct_9fa48("47") ? true : (stryCov_9fa48("47"), false);
        const next: FreeRect[] = stryMutAct_9fa48("48") ? ["Stryker was here"] : (stryCov_9fa48("48"), []);
        const consumed = new Set<number>();
        for (let index = 0; stryMutAct_9fa48("51") ? index >= current.length : stryMutAct_9fa48("50") ? index <= current.length : stryMutAct_9fa48("49") ? false : (stryCov_9fa48("49", "50", "51"), index < current.length); stryMutAct_9fa48("52") ? index -= 1 : (stryCov_9fa48("52"), index += 1)) {
          if (stryMutAct_9fa48("53")) {
            {}
          } else {
            stryCov_9fa48("53");
            if (stryMutAct_9fa48("55") ? false : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55"), consumed.has(index))) continue;
            let merged = current[index];
            for (let candidateIndex = stryMutAct_9fa48("56") ? index - 1 : (stryCov_9fa48("56"), index + 1); stryMutAct_9fa48("59") ? candidateIndex >= current.length : stryMutAct_9fa48("58") ? candidateIndex <= current.length : stryMutAct_9fa48("57") ? false : (stryCov_9fa48("57", "58", "59"), candidateIndex < current.length); stryMutAct_9fa48("60") ? candidateIndex -= 1 : (stryCov_9fa48("60"), candidateIndex += 1)) {
              if (stryMutAct_9fa48("61")) {
                {}
              } else {
                stryCov_9fa48("61");
                if (stryMutAct_9fa48("63") ? false : stryMutAct_9fa48("62") ? true : (stryCov_9fa48("62", "63"), consumed.has(candidateIndex))) continue;
                const candidate = current[candidateIndex];
                const canMergeHorizontally = stryMutAct_9fa48("66") ? merged.y === candidate.y && merged.length === candidate.length || merged.x + merged.width === candidate.x : stryMutAct_9fa48("65") ? false : stryMutAct_9fa48("64") ? true : (stryCov_9fa48("64", "65", "66"), (stryMutAct_9fa48("68") ? merged.y === candidate.y || merged.length === candidate.length : stryMutAct_9fa48("67") ? true : (stryCov_9fa48("67", "68"), (stryMutAct_9fa48("70") ? merged.y !== candidate.y : stryMutAct_9fa48("69") ? true : (stryCov_9fa48("69", "70"), merged.y === candidate.y)) && (stryMutAct_9fa48("72") ? merged.length !== candidate.length : stryMutAct_9fa48("71") ? true : (stryCov_9fa48("71", "72"), merged.length === candidate.length)))) && (stryMutAct_9fa48("74") ? merged.x + merged.width !== candidate.x : stryMutAct_9fa48("73") ? true : (stryCov_9fa48("73", "74"), (stryMutAct_9fa48("75") ? merged.x - merged.width : (stryCov_9fa48("75"), merged.x + merged.width)) === candidate.x)));
                if (stryMutAct_9fa48("77") ? false : stryMutAct_9fa48("76") ? true : (stryCov_9fa48("76", "77"), canMergeHorizontally)) {
                  if (stryMutAct_9fa48("78")) {
                    {}
                  } else {
                    stryCov_9fa48("78");
                    merged = stryMutAct_9fa48("79") ? {} : (stryCov_9fa48("79"), {
                      x: merged.x,
                      y: merged.y,
                      width: stryMutAct_9fa48("80") ? merged.width - candidate.width : (stryCov_9fa48("80"), merged.width + candidate.width),
                      length: merged.length
                    });
                    consumed.add(candidateIndex);
                    changed = stryMutAct_9fa48("81") ? false : (stryCov_9fa48("81"), true);
                    continue;
                  }
                }
                const canMergeVertically = stryMutAct_9fa48("84") ? merged.x === candidate.x && merged.width === candidate.width || merged.y + merged.length === candidate.y : stryMutAct_9fa48("83") ? false : stryMutAct_9fa48("82") ? true : (stryCov_9fa48("82", "83", "84"), (stryMutAct_9fa48("86") ? merged.x === candidate.x || merged.width === candidate.width : stryMutAct_9fa48("85") ? true : (stryCov_9fa48("85", "86"), (stryMutAct_9fa48("88") ? merged.x !== candidate.x : stryMutAct_9fa48("87") ? true : (stryCov_9fa48("87", "88"), merged.x === candidate.x)) && (stryMutAct_9fa48("90") ? merged.width !== candidate.width : stryMutAct_9fa48("89") ? true : (stryCov_9fa48("89", "90"), merged.width === candidate.width)))) && (stryMutAct_9fa48("92") ? merged.y + merged.length !== candidate.y : stryMutAct_9fa48("91") ? true : (stryCov_9fa48("91", "92"), (stryMutAct_9fa48("93") ? merged.y - merged.length : (stryCov_9fa48("93"), merged.y + merged.length)) === candidate.y)));
                if (stryMutAct_9fa48("95") ? false : stryMutAct_9fa48("94") ? true : (stryCov_9fa48("94", "95"), canMergeVertically)) {
                  if (stryMutAct_9fa48("96")) {
                    {}
                  } else {
                    stryCov_9fa48("96");
                    merged = stryMutAct_9fa48("97") ? {} : (stryCov_9fa48("97"), {
                      x: merged.x,
                      y: merged.y,
                      width: merged.width,
                      length: stryMutAct_9fa48("98") ? merged.length - candidate.length : (stryCov_9fa48("98"), merged.length + candidate.length)
                    });
                    consumed.add(candidateIndex);
                    changed = stryMutAct_9fa48("99") ? false : (stryCov_9fa48("99"), true);
                  }
                }
              }
            }
            next.push(merged);
          }
        }
        current = deterministicSort(next, ...mergeFreeRectComparators);
      }
    }
    return current;
  }
};

// Builds support surface for the next layer from all items whose top is close to target Z.
// Small tolerance allows near-equal heights to act as a common support plane.
const supportRectsAtZ = (layers: readonly Layer[], targetZ: number): FreeRect[] => {
  if (stryMutAct_9fa48("100")) {
    {}
  } else {
    stryCov_9fa48("100");
    const supportRects = stryMutAct_9fa48("101") ? layers.flatMap(layer => layer.placements).map(placement => ({
      x: placement.position.x,
      y: placement.position.y,
      width: placement.size.width,
      length: placement.size.length
    })) : (stryCov_9fa48("101"), layers.flatMap(stryMutAct_9fa48("102") ? () => undefined : (stryCov_9fa48("102"), layer => layer.placements)).filter(placement => {
      if (stryMutAct_9fa48("103")) {
        {}
      } else {
        stryCov_9fa48("103");
        const topZ = stryMutAct_9fa48("104") ? placement.position.z - placement.size.height : (stryCov_9fa48("104"), placement.position.z + placement.size.height);
        return stryMutAct_9fa48("107") ? topZ <= targetZ || targetZ - topZ <= HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("106") ? false : stryMutAct_9fa48("105") ? true : (stryCov_9fa48("105", "106", "107"), (stryMutAct_9fa48("110") ? topZ > targetZ : stryMutAct_9fa48("109") ? topZ < targetZ : stryMutAct_9fa48("108") ? true : (stryCov_9fa48("108", "109", "110"), topZ <= targetZ)) && (stryMutAct_9fa48("113") ? targetZ - topZ > HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("112") ? targetZ - topZ < HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111", "112", "113"), (stryMutAct_9fa48("114") ? targetZ + topZ : (stryCov_9fa48("114"), targetZ - topZ)) <= HEIGHT_TOLERANCE_MM)));
      }
    }).map(stryMutAct_9fa48("115") ? () => undefined : (stryCov_9fa48("115"), placement => stryMutAct_9fa48("116") ? {} : (stryCov_9fa48("116"), {
      x: placement.position.x,
      y: placement.position.y,
      width: placement.size.width,
      length: placement.size.length
    }))));
    return mergeAdjacentRects(supportRects);
  }
};

// Chooses next layer height by maximizing footprint coverage, with normalization for close heights.
const pickNextLayerHeight = (remaining: readonly OrderItemUnit[], availableHeight: number): number | null => {
  if (stryMutAct_9fa48("117")) {
    {}
  } else {
    stryCov_9fa48("117");
    const candidateHeights = deterministicSort(stryMutAct_9fa48("118") ? [] : (stryCov_9fa48("118"), [...new Set(stryMutAct_9fa48("119") ? remaining.map(unit => unit.dimensions.height) : (stryCov_9fa48("119"), remaining.map(stryMutAct_9fa48("120") ? () => undefined : (stryCov_9fa48("120"), unit => unit.dimensions.height)).filter(stryMutAct_9fa48("121") ? () => undefined : (stryCov_9fa48("121"), height => stryMutAct_9fa48("125") ? height > availableHeight : stryMutAct_9fa48("124") ? height < availableHeight : stryMutAct_9fa48("123") ? false : stryMutAct_9fa48("122") ? true : (stryCov_9fa48("122", "123", "124", "125"), height <= availableHeight)))))]), stryMutAct_9fa48("126") ? () => undefined : (stryCov_9fa48("126"), (left, right) => stryMutAct_9fa48("127") ? left + right : (stryCov_9fa48("127"), left - right)));
    if (stryMutAct_9fa48("130") ? candidateHeights.length !== 0 : stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129", "130"), candidateHeights.length === 0)) return null;
    const scoreByNormalizedHeight = new Map<number, number>();
    for (const unit of remaining) {
      if (stryMutAct_9fa48("131")) {
        {}
      } else {
        stryCov_9fa48("131");
        const unitHeight = unit.dimensions.height;
        if (stryMutAct_9fa48("135") ? unitHeight <= availableHeight : stryMutAct_9fa48("134") ? unitHeight >= availableHeight : stryMutAct_9fa48("133") ? false : stryMutAct_9fa48("132") ? true : (stryCov_9fa48("132", "133", "134", "135"), unitHeight > availableHeight)) continue;
        const normalizedHeight = stryMutAct_9fa48("136") ? candidateHeights.find(candidateHeight => candidateHeight >= unitHeight && candidateHeight - unitHeight <= HEIGHT_TOLERANCE_MM) && unitHeight : (stryCov_9fa48("136"), candidateHeights.find(stryMutAct_9fa48("137") ? () => undefined : (stryCov_9fa48("137"), candidateHeight => stryMutAct_9fa48("140") ? candidateHeight >= unitHeight || candidateHeight - unitHeight <= HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("139") ? false : stryMutAct_9fa48("138") ? true : (stryCov_9fa48("138", "139", "140"), (stryMutAct_9fa48("143") ? candidateHeight < unitHeight : stryMutAct_9fa48("142") ? candidateHeight > unitHeight : stryMutAct_9fa48("141") ? true : (stryCov_9fa48("141", "142", "143"), candidateHeight >= unitHeight)) && (stryMutAct_9fa48("146") ? candidateHeight - unitHeight > HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("145") ? candidateHeight - unitHeight < HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("144") ? true : (stryCov_9fa48("144", "145", "146"), (stryMutAct_9fa48("147") ? candidateHeight + unitHeight : (stryCov_9fa48("147"), candidateHeight - unitHeight)) <= HEIGHT_TOLERANCE_MM))))) ?? unitHeight);
        const area = stryMutAct_9fa48("148") ? unit.dimensions.width / unit.dimensions.length : (stryCov_9fa48("148"), unit.dimensions.width * unit.dimensions.length);
        scoreByNormalizedHeight.set(normalizedHeight, stryMutAct_9fa48("149") ? (scoreByNormalizedHeight.get(normalizedHeight) ?? 0) - area : (stryCov_9fa48("149"), (stryMutAct_9fa48("150") ? scoreByNormalizedHeight.get(normalizedHeight) && 0 : (stryCov_9fa48("150"), scoreByNormalizedHeight.get(normalizedHeight) ?? 0)) + area));
      }
    }
    if (stryMutAct_9fa48("153") ? scoreByNormalizedHeight.size !== 0 : stryMutAct_9fa48("152") ? false : stryMutAct_9fa48("151") ? true : (stryCov_9fa48("151", "152", "153"), scoreByNormalizedHeight.size === 0)) return null;
    const normalizedHeights = stryMutAct_9fa48("154") ? [] : (stryCov_9fa48("154"), [...scoreByNormalizedHeight.keys()]);
    stryMutAct_9fa48("155") ? normalizedHeights : (stryCov_9fa48("155"), normalizedHeights.sort((left, right) => {
      if (stryMutAct_9fa48("156")) {
        {}
      } else {
        stryCov_9fa48("156");
        const scoreDiff = stryMutAct_9fa48("157") ? (scoreByNormalizedHeight.get(right) ?? 0) + (scoreByNormalizedHeight.get(left) ?? 0) : (stryCov_9fa48("157"), (stryMutAct_9fa48("158") ? scoreByNormalizedHeight.get(right) && 0 : (stryCov_9fa48("158"), scoreByNormalizedHeight.get(right) ?? 0)) - (stryMutAct_9fa48("159") ? scoreByNormalizedHeight.get(left) && 0 : (stryCov_9fa48("159"), scoreByNormalizedHeight.get(left) ?? 0)));
        if (stryMutAct_9fa48("162") ? scoreDiff === 0 : stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : (stryCov_9fa48("160", "161", "162"), scoreDiff !== 0)) return scoreDiff;
        return stryMutAct_9fa48("163") ? right + left : (stryCov_9fa48("163"), right - left);
      }
    }));
    return stryMutAct_9fa48("164") ? normalizedHeights[0] && null : (stryCov_9fa48("164"), normalizedHeights[0] ?? null);
  }
};

// Promotes item height to a nearby layer height to reduce tiny height fragmentation.
const normalizeLayerHeight = (unitHeight: number, allUnits: readonly OrderItemUnit[], availableHeight: number): number => {
  if (stryMutAct_9fa48("165")) {
    {}
  } else {
    stryCov_9fa48("165");
    const candidate = deterministicSort(stryMutAct_9fa48("166") ? [] : (stryCov_9fa48("166"), [...new Set(allUnits.map(stryMutAct_9fa48("167") ? () => undefined : (stryCov_9fa48("167"), unit => unit.dimensions.height)))]), stryMutAct_9fa48("168") ? () => undefined : (stryCov_9fa48("168"), (left, right) => stryMutAct_9fa48("169") ? left + right : (stryCov_9fa48("169"), left - right))).find(stryMutAct_9fa48("170") ? () => undefined : (stryCov_9fa48("170"), height => stryMutAct_9fa48("173") ? height >= unitHeight && height <= availableHeight || height - unitHeight <= HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("172") ? false : stryMutAct_9fa48("171") ? true : (stryCov_9fa48("171", "172", "173"), (stryMutAct_9fa48("175") ? height >= unitHeight || height <= availableHeight : stryMutAct_9fa48("174") ? true : (stryCov_9fa48("174", "175"), (stryMutAct_9fa48("178") ? height < unitHeight : stryMutAct_9fa48("177") ? height > unitHeight : stryMutAct_9fa48("176") ? true : (stryCov_9fa48("176", "177", "178"), height >= unitHeight)) && (stryMutAct_9fa48("181") ? height > availableHeight : stryMutAct_9fa48("180") ? height < availableHeight : stryMutAct_9fa48("179") ? true : (stryCov_9fa48("179", "180", "181"), height <= availableHeight)))) && (stryMutAct_9fa48("184") ? height - unitHeight > HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("183") ? height - unitHeight < HEIGHT_TOLERANCE_MM : stryMutAct_9fa48("182") ? true : (stryCov_9fa48("182", "183", "184"), (stryMutAct_9fa48("185") ? height + unitHeight : (stryCov_9fa48("185"), height - unitHeight)) <= HEIGHT_TOLERANCE_MM)))));
    return stryMutAct_9fa48("186") ? candidate && unitHeight : (stryCov_9fa48("186"), candidate ?? unitHeight);
  }
};

// Стабильная сортировка размещений для детерминированного вывода/сравнения.
const sortPlacements = stryMutAct_9fa48("187") ? () => undefined : (stryCov_9fa48("187"), (() => {
  const sortPlacements = (placements: readonly Placement[]): Placement[] => deterministicSort(stryMutAct_9fa48("188") ? [] : (stryCov_9fa48("188"), [...placements]), stryMutAct_9fa48("189") ? () => undefined : (stryCov_9fa48("189"), (left, right) => stryMutAct_9fa48("190") ? left.position.z + right.position.z : (stryCov_9fa48("190"), left.position.z - right.position.z)), stryMutAct_9fa48("191") ? () => undefined : (stryCov_9fa48("191"), (left, right) => stryMutAct_9fa48("192") ? left.position.y + right.position.y : (stryCov_9fa48("192"), left.position.y - right.position.y)), stryMutAct_9fa48("193") ? () => undefined : (stryCov_9fa48("193"), (left, right) => stryMutAct_9fa48("194") ? left.position.x + right.position.x : (stryCov_9fa48("194"), left.position.x - right.position.x)));
  return sortPlacements;
})());

// Список уникальных высот верхних граней, где потенциально можно открыть новый слой.
const getSupportZLevels = stryMutAct_9fa48("195") ? () => undefined : (stryCov_9fa48("195"), (() => {
  const getSupportZLevels = (placements: readonly Placement[]): number[] => stryMutAct_9fa48("196") ? deterministicSort([0, ...placements.map(placement => placement.position.z + placement.size.height)], (left, right) => left - right) : (stryCov_9fa48("196"), deterministicSort(stryMutAct_9fa48("197") ? [] : (stryCov_9fa48("197"), [0, ...placements.map(stryMutAct_9fa48("198") ? () => undefined : (stryCov_9fa48("198"), placement => stryMutAct_9fa48("199") ? placement.position.z - placement.size.height : (stryCov_9fa48("199"), placement.position.z + placement.size.height)))]), stryMutAct_9fa48("200") ? () => undefined : (stryCov_9fa48("200"), (left, right) => stryMutAct_9fa48("201") ? left + right : (stryCov_9fa48("201"), left - right))).filter(stryMutAct_9fa48("202") ? () => undefined : (stryCov_9fa48("202"), (value, index, source) => stryMutAct_9fa48("205") ? source.indexOf(value) !== index : stryMutAct_9fa48("204") ? false : stryMutAct_9fa48("203") ? true : (stryCov_9fa48("203", "204", "205"), source.indexOf(value) === index))));
  return getSupportZLevels;
})());

// Базовые прямоугольники для нового слоя: пол контейнера либо вычисленная опора.
const getBaseRectsForLayer = (layerZ: number, layers: readonly Layer[], container: ContainerType): FreeRect[] => {
  if (stryMutAct_9fa48("206")) {
    {}
  } else {
    stryCov_9fa48("206");
    if (stryMutAct_9fa48("209") ? layerZ !== 0 : stryMutAct_9fa48("208") ? false : stryMutAct_9fa48("207") ? true : (stryCov_9fa48("207", "208", "209"), layerZ === 0)) {
      if (stryMutAct_9fa48("210")) {
        {}
      } else {
        stryCov_9fa48("210");
        return stryMutAct_9fa48("211") ? [] : (stryCov_9fa48("211"), [stryMutAct_9fa48("212") ? {} : (stryCov_9fa48("212"), {
          x: 0,
          y: 0,
          width: container.width,
          length: container.length
        })]);
      }
    }
    return supportRectsAtZ(layers, layerZ);
  }
};

// Количество размещенных единиц в результате.
const countPlacements = stryMutAct_9fa48("213") ? () => undefined : (stryCov_9fa48("213"), (() => {
  const countPlacements = (containers: readonly ContainerInstance[]): number => containers.reduce(stryMutAct_9fa48("214") ? () => undefined : (stryCov_9fa48("214"), (sum, containerInstance) => stryMutAct_9fa48("215") ? sum - containerInstance.placements.length : (stryCov_9fa48("215"), sum + containerInstance.placements.length)), 0);
  return countPlacements;
})());

// Лексикографическое сравнение score-векторов (меньше = лучше).
const isScoreVectorBetter = (candidate: readonly number[], currentBest: readonly number[]): boolean => {
  if (stryMutAct_9fa48("216")) {
    {}
  } else {
    stryCov_9fa48("216");
    const length = stryMutAct_9fa48("217") ? Math.max(candidate.length, currentBest.length) : (stryCov_9fa48("217"), Math.min(candidate.length, currentBest.length));
    for (let index = 0; stryMutAct_9fa48("220") ? index >= length : stryMutAct_9fa48("219") ? index <= length : stryMutAct_9fa48("218") ? false : (stryCov_9fa48("218", "219", "220"), index < length); stryMutAct_9fa48("221") ? index -= 1 : (stryCov_9fa48("221"), index += 1)) {
      if (stryMutAct_9fa48("222")) {
        {}
      } else {
        stryCov_9fa48("222");
        if (stryMutAct_9fa48("226") ? candidate[index] >= currentBest[index] : stryMutAct_9fa48("225") ? candidate[index] <= currentBest[index] : stryMutAct_9fa48("224") ? false : stryMutAct_9fa48("223") ? true : (stryCov_9fa48("223", "224", "225", "226"), candidate[index] < currentBest[index])) return stryMutAct_9fa48("227") ? false : (stryCov_9fa48("227"), true);
        if (stryMutAct_9fa48("231") ? candidate[index] <= currentBest[index] : stryMutAct_9fa48("230") ? candidate[index] >= currentBest[index] : stryMutAct_9fa48("229") ? false : stryMutAct_9fa48("228") ? true : (stryCov_9fa48("228", "229", "230", "231"), candidate[index] > currentBest[index])) return stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232"), false);
      }
    }
    return stryMutAct_9fa48("236") ? candidate.length >= currentBest.length : stryMutAct_9fa48("235") ? candidate.length <= currentBest.length : stryMutAct_9fa48("234") ? false : stryMutAct_9fa48("233") ? true : (stryCov_9fa48("233", "234", "235", "236"), candidate.length < currentBest.length);
  }
};
const tryPlaceInLayer = (layer: Layer, unit: OrderItemUnit, containerIndex: number): TryPlaceResult | null => {
  if (stryMutAct_9fa48("237")) {
    {}
  } else {
    stryCov_9fa48("237");
    // Item can be shorter than layer, but never taller.
    if (stryMutAct_9fa48("241") ? unit.dimensions.height <= layer.height : stryMutAct_9fa48("240") ? unit.dimensions.height >= layer.height : stryMutAct_9fa48("239") ? false : stryMutAct_9fa48("238") ? true : (stryCov_9fa48("238", "239", "240", "241"), unit.dimensions.height > layer.height)) return null;
    const orientations: ReadonlyArray<{
      width: number;
      length: number;
      yaw: 0 | 90;
    }> = stryMutAct_9fa48("242") ? [] : (stryCov_9fa48("242"), [stryMutAct_9fa48("243") ? {} : (stryCov_9fa48("243"), {
      width: unit.dimensions.width,
      length: unit.dimensions.length,
      yaw: 0
    }), stryMutAct_9fa48("244") ? {} : (stryCov_9fa48("244"), {
      width: unit.dimensions.length,
      length: unit.dimensions.width,
      yaw: 90
    })]);
    let best: TryPlaceResult | null = null;
    for (const freeRect of sortFreeRects(layer.freeRects)) {
      if (stryMutAct_9fa48("245")) {
        {}
      } else {
        stryCov_9fa48("245");
        for (const orientation of orientations) {
          if (stryMutAct_9fa48("246")) {
            {}
          } else {
            stryCov_9fa48("246");
            if (stryMutAct_9fa48("249") ? orientation.width > freeRect.width && orientation.length > freeRect.length : stryMutAct_9fa48("248") ? false : stryMutAct_9fa48("247") ? true : (stryCov_9fa48("247", "248", "249"), (stryMutAct_9fa48("252") ? orientation.width <= freeRect.width : stryMutAct_9fa48("251") ? orientation.width >= freeRect.width : stryMutAct_9fa48("250") ? false : (stryCov_9fa48("250", "251", "252"), orientation.width > freeRect.width)) || (stryMutAct_9fa48("255") ? orientation.length <= freeRect.length : stryMutAct_9fa48("254") ? orientation.length >= freeRect.length : stryMutAct_9fa48("253") ? false : (stryCov_9fa48("253", "254", "255"), orientation.length > freeRect.length)))) continue;
            const placement: Placement = stryMutAct_9fa48("256") ? {} : (stryCov_9fa48("256"), {
              containerIndex,
              itemUnitId: unit.unitId,
              itemTypeId: unit.itemTypeId,
              position: stryMutAct_9fa48("257") ? {} : (stryCov_9fa48("257"), {
                x: freeRect.x,
                y: freeRect.y,
                z: layer.z
              }),
              rotationYaw: orientation.yaw,
              size: stryMutAct_9fa48("258") ? {} : (stryCov_9fa48("258"), {
                width: orientation.width,
                length: orientation.length,
                height: unit.dimensions.height
              })
            });
            const nextFreeRects = sortFreeRects(stryMutAct_9fa48("259") ? [] : (stryCov_9fa48("259"), [...(stryMutAct_9fa48("260") ? layer.freeRects : (stryCov_9fa48("260"), layer.freeRects.filter(stryMutAct_9fa48("261") ? () => undefined : (stryCov_9fa48("261"), entry => stryMutAct_9fa48("264") ? entry === freeRect : stryMutAct_9fa48("263") ? false : stryMutAct_9fa48("262") ? true : (stryCov_9fa48("262", "263", "264"), entry !== freeRect))))), ...splitFreeRect(freeRect, orientation)]));
            const wasteArea = stryMutAct_9fa48("265") ? freeRect.width * freeRect.length + orientation.width * orientation.length : (stryCov_9fa48("265"), (stryMutAct_9fa48("266") ? freeRect.width / freeRect.length : (stryCov_9fa48("266"), freeRect.width * freeRect.length)) - (stryMutAct_9fa48("267") ? orientation.width / orientation.length : (stryCov_9fa48("267"), orientation.width * orientation.length)));
            const wasteWidth = stryMutAct_9fa48("268") ? freeRect.width + orientation.width : (stryCov_9fa48("268"), freeRect.width - orientation.width);
            const wasteLength = stryMutAct_9fa48("269") ? freeRect.length + orientation.length : (stryCov_9fa48("269"), freeRect.length - orientation.length);
            if (stryMutAct_9fa48("272") ? false : stryMutAct_9fa48("271") ? true : stryMutAct_9fa48("270") ? best : (stryCov_9fa48("270", "271", "272"), !best)) {
              if (stryMutAct_9fa48("273")) {
                {}
              } else {
                stryCov_9fa48("273");
                best = stryMutAct_9fa48("274") ? {} : (stryCov_9fa48("274"), {
                  placement,
                  nextFreeRects,
                  wasteArea,
                  wasteWidth,
                  wasteLength
                });
                continue;
              }
            }
            if (stryMutAct_9fa48("278") ? wasteArea >= best.wasteArea : stryMutAct_9fa48("277") ? wasteArea <= best.wasteArea : stryMutAct_9fa48("276") ? false : stryMutAct_9fa48("275") ? true : (stryCov_9fa48("275", "276", "277", "278"), wasteArea < best.wasteArea)) {
              if (stryMutAct_9fa48("279")) {
                {}
              } else {
                stryCov_9fa48("279");
                best = stryMutAct_9fa48("280") ? {} : (stryCov_9fa48("280"), {
                  placement,
                  nextFreeRects,
                  wasteArea,
                  wasteWidth,
                  wasteLength
                });
                continue;
              }
            }
            if (stryMutAct_9fa48("283") ? wasteArea === best.wasteArea || wasteWidth + wasteLength < best.wasteWidth + best.wasteLength : stryMutAct_9fa48("282") ? false : stryMutAct_9fa48("281") ? true : (stryCov_9fa48("281", "282", "283"), (stryMutAct_9fa48("285") ? wasteArea !== best.wasteArea : stryMutAct_9fa48("284") ? true : (stryCov_9fa48("284", "285"), wasteArea === best.wasteArea)) && (stryMutAct_9fa48("288") ? wasteWidth + wasteLength >= best.wasteWidth + best.wasteLength : stryMutAct_9fa48("287") ? wasteWidth + wasteLength <= best.wasteWidth + best.wasteLength : stryMutAct_9fa48("286") ? true : (stryCov_9fa48("286", "287", "288"), (stryMutAct_9fa48("289") ? wasteWidth - wasteLength : (stryCov_9fa48("289"), wasteWidth + wasteLength)) < (stryMutAct_9fa48("290") ? best.wasteWidth - best.wasteLength : (stryCov_9fa48("290"), best.wasteWidth + best.wasteLength)))))) {
              if (stryMutAct_9fa48("291")) {
                {}
              } else {
                stryCov_9fa48("291");
                best = stryMutAct_9fa48("292") ? {} : (stryCov_9fa48("292"), {
                  placement,
                  nextFreeRects,
                  wasteArea,
                  wasteWidth,
                  wasteLength
                });
              }
            }
          }
        }
      }
    }
    if (stryMutAct_9fa48("295") ? false : stryMutAct_9fa48("294") ? true : stryMutAct_9fa48("293") ? best : (stryCov_9fa48("293", "294", "295"), !best)) return null;
    return stryMutAct_9fa48("296") ? {} : (stryCov_9fa48("296"), {
      placement: best.placement,
      nextFreeRects: best.nextFreeRects,
      wasteArea: best.wasteArea,
      wasteWidth: best.wasteWidth,
      wasteLength: best.wasteLength
    });
  }
};

// Вспомогательная метрика площади основания.
const footprintOf = stryMutAct_9fa48("297") ? () => undefined : (stryCov_9fa48("297"), (() => {
  const footprintOf = (unit: OrderItemUnit): number => stryMutAct_9fa48("298") ? unit.dimensions.width / unit.dimensions.length : (stryCov_9fa48("298"), unit.dimensions.width * unit.dimensions.length);
  return footprintOf;
})());
const placementFootprint = stryMutAct_9fa48("299") ? () => undefined : (stryCov_9fa48("299"), (() => {
  const placementFootprint = (placement: Placement): number => stryMutAct_9fa48("300") ? placement.size.width / placement.size.length : (stryCov_9fa48("300"), placement.size.width * placement.size.length);
  return placementFootprint;
})());
type PlacementExtentAxis = "x" | "y" | "z";
const maxPlacementExtent = stryMutAct_9fa48("301") ? () => undefined : (stryCov_9fa48("301"), (() => {
  const maxPlacementExtent = (placements: readonly Placement[], axis: PlacementExtentAxis): number => placements.reduce((maxValue, placement) => {
    if (stryMutAct_9fa48("302")) {
      {}
    } else {
      stryCov_9fa48("302");
      const extent = (stryMutAct_9fa48("305") ? axis !== "x" : stryMutAct_9fa48("304") ? false : stryMutAct_9fa48("303") ? true : (stryCov_9fa48("303", "304", "305"), axis === (stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), "x")))) ? stryMutAct_9fa48("307") ? placement.position.x - placement.size.width : (stryCov_9fa48("307"), placement.position.x + placement.size.width) : (stryMutAct_9fa48("310") ? axis !== "y" : stryMutAct_9fa48("309") ? false : stryMutAct_9fa48("308") ? true : (stryCov_9fa48("308", "309", "310"), axis === (stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), "y")))) ? stryMutAct_9fa48("312") ? placement.position.y - placement.size.length : (stryCov_9fa48("312"), placement.position.y + placement.size.length) : stryMutAct_9fa48("313") ? placement.position.z - placement.size.height : (stryCov_9fa48("313"), placement.position.z + placement.size.height);
      return stryMutAct_9fa48("314") ? Math.min(maxValue, extent) : (stryCov_9fa48("314"), Math.max(maxValue, extent));
    }
  }, 0);
  return maxPlacementExtent;
})());

// Геометрический центр размещения, нужен для кластеризации по типу.
const placementCenter = stryMutAct_9fa48("315") ? () => undefined : (stryCov_9fa48("315"), (() => {
  const placementCenter = (placement: Placement): {
    x: number;
    y: number;
    z: number;
  } => stryMutAct_9fa48("316") ? {} : (stryCov_9fa48("316"), {
    x: stryMutAct_9fa48("317") ? placement.position.x - placement.size.width / 2 : (stryCov_9fa48("317"), placement.position.x + (stryMutAct_9fa48("318") ? placement.size.width * 2 : (stryCov_9fa48("318"), placement.size.width / 2))),
    y: stryMutAct_9fa48("319") ? placement.position.y - placement.size.length / 2 : (stryCov_9fa48("319"), placement.position.y + (stryMutAct_9fa48("320") ? placement.size.length * 2 : (stryCov_9fa48("320"), placement.size.length / 2))),
    z: stryMutAct_9fa48("321") ? placement.position.z - placement.size.height / 2 : (stryCov_9fa48("321"), placement.position.z + (stryMutAct_9fa48("322") ? placement.size.height * 2 : (stryCov_9fa48("322"), placement.size.height / 2)))
  });
  return placementCenter;
})());

// Штраф за удаление от уже размещенных товаров того же типа (группировка SKU).
const clusteringPenalty = (placements: readonly Placement[], itemTypeId: number, candidatePlacement: Placement): number => {
  if (stryMutAct_9fa48("323")) {
    {}
  } else {
    stryCov_9fa48("323");
    const sameTypePlacements = stryMutAct_9fa48("324") ? placements : (stryCov_9fa48("324"), placements.filter(stryMutAct_9fa48("325") ? () => undefined : (stryCov_9fa48("325"), entry => stryMutAct_9fa48("328") ? entry.itemTypeId !== itemTypeId : stryMutAct_9fa48("327") ? false : stryMutAct_9fa48("326") ? true : (stryCov_9fa48("326", "327", "328"), entry.itemTypeId === itemTypeId))));
    if (stryMutAct_9fa48("331") ? sameTypePlacements.length !== 0 : stryMutAct_9fa48("330") ? false : stryMutAct_9fa48("329") ? true : (stryCov_9fa48("329", "330", "331"), sameTypePlacements.length === 0)) return 0;
    const candidateCenter = placementCenter(candidatePlacement);
    return sameTypePlacements.reduce((sum, placedEntry) => {
      if (stryMutAct_9fa48("332")) {
        {}
      } else {
        stryCov_9fa48("332");
        const center = placementCenter(placedEntry);
        return stryMutAct_9fa48("333") ? sum + Math.abs(candidateCenter.x - center.x) + Math.abs(candidateCenter.y - center.y) - Math.abs(candidateCenter.z - center.z) : (stryCov_9fa48("333"), (stryMutAct_9fa48("334") ? sum + Math.abs(candidateCenter.x - center.x) - Math.abs(candidateCenter.y - center.y) : (stryCov_9fa48("334"), (stryMutAct_9fa48("335") ? sum - Math.abs(candidateCenter.x - center.x) : (stryCov_9fa48("335"), sum + Math.abs(stryMutAct_9fa48("336") ? candidateCenter.x + center.x : (stryCov_9fa48("336"), candidateCenter.x - center.x)))) + Math.abs(stryMutAct_9fa48("337") ? candidateCenter.y + center.y : (stryCov_9fa48("337"), candidateCenter.y - center.y)))) + Math.abs(stryMutAct_9fa48("338") ? candidateCenter.z + center.z : (stryCov_9fa48("338"), candidateCenter.z - center.z)));
      }
    }, 0);
  }
};

// Штраф за открытие нового типа товара в контейнере (уменьшает перемешивание типов).
const newTypeInContainerPenalty = (placements: readonly Placement[], itemTypeId: number): number => {
  if (stryMutAct_9fa48("339")) {
    {}
  } else {
    stryCov_9fa48("339");
    if (stryMutAct_9fa48("342") ? placements.length !== 0 : stryMutAct_9fa48("341") ? false : stryMutAct_9fa48("340") ? true : (stryCov_9fa48("340", "341", "342"), placements.length === 0)) return 0;
    return (stryMutAct_9fa48("343") ? placements.every(entry => entry.itemTypeId === itemTypeId) : (stryCov_9fa48("343"), placements.some(stryMutAct_9fa48("344") ? () => undefined : (stryCov_9fa48("344"), entry => stryMutAct_9fa48("347") ? entry.itemTypeId !== itemTypeId : stryMutAct_9fa48("346") ? false : stryMutAct_9fa48("345") ? true : (stryCov_9fa48("345", "346", "347"), entry.itemTypeId === itemTypeId))))) ? 0 : 1;
  }
};
const containerEnvelopePenalty = (placements: readonly Placement[], candidatePlacement: Placement): number => {
  if (stryMutAct_9fa48("348")) {
    {}
  } else {
    stryCov_9fa48("348");
    // Penalize expansion of occupied bounding box (compact packing preference).
    const allPlacements = stryMutAct_9fa48("349") ? [] : (stryCov_9fa48("349"), [...placements, candidatePlacement]);
    const maxX = maxPlacementExtent(allPlacements, stryMutAct_9fa48("350") ? "" : (stryCov_9fa48("350"), "x"));
    const maxY = maxPlacementExtent(allPlacements, stryMutAct_9fa48("351") ? "" : (stryCov_9fa48("351"), "y"));
    const maxZ = maxPlacementExtent(allPlacements, stryMutAct_9fa48("352") ? "" : (stryCov_9fa48("352"), "z"));
    return stryMutAct_9fa48("353") ? maxX * maxY / maxZ : (stryCov_9fa48("353"), (stryMutAct_9fa48("354") ? maxX / maxY : (stryCov_9fa48("354"), maxX * maxY)) * maxZ);
  }
};
const yFrontGapPenalty = (placements: readonly Placement[], candidatePlacement: Placement): number => {
  if (stryMutAct_9fa48("355")) {
    {}
  } else {
    stryCov_9fa48("355");
    // Prefer advancing a continuous front along Y (fewer visual/physical "islands").
    if (stryMutAct_9fa48("358") ? placements.length !== 0 : stryMutAct_9fa48("357") ? false : stryMutAct_9fa48("356") ? true : (stryCov_9fa48("356", "357", "358"), placements.length === 0)) return 0;
    const currentFrontY = maxPlacementExtent(placements, stryMutAct_9fa48("359") ? "" : (stryCov_9fa48("359"), "y"));
    const candidateStartY = candidatePlacement.position.y;
    if (stryMutAct_9fa48("363") ? candidateStartY > currentFrontY : stryMutAct_9fa48("362") ? candidateStartY < currentFrontY : stryMutAct_9fa48("361") ? false : stryMutAct_9fa48("360") ? true : (stryCov_9fa48("360", "361", "362", "363"), candidateStartY <= currentFrontY)) return 0;
    return stryMutAct_9fa48("364") ? candidateStartY + currentFrontY : (stryCov_9fa48("364"), candidateStartY - currentFrontY);
  }
};

// Reorders result so container 0 is the most utilized one (UI and business expectation).
const normalizeContainerOrder = (containers: readonly ContainerInstance[]): ContainerInstance[] => {
  if (stryMutAct_9fa48("365")) {
    {}
  } else {
    stryCov_9fa48("365");
    const sorted = deterministicSort(stryMutAct_9fa48("366") ? [] : (stryCov_9fa48("366"), [...containers]), stryMutAct_9fa48("367") ? () => undefined : (stryCov_9fa48("367"), (left, right) => stryMutAct_9fa48("368") ? right.placements.length + left.placements.length : (stryCov_9fa48("368"), right.placements.length - left.placements.length)), stryMutAct_9fa48("369") ? () => undefined : (stryCov_9fa48("369"), (left, right) => stryMutAct_9fa48("370") ? right.placements.reduce((sum, placement) => sum + placement.position.y + placement.size.length, 0) + left.placements.reduce((sum, placement) => sum + placement.position.y + placement.size.length, 0) : (stryCov_9fa48("370"), right.placements.reduce(stryMutAct_9fa48("371") ? () => undefined : (stryCov_9fa48("371"), (sum, placement) => stryMutAct_9fa48("372") ? sum + placement.position.y - placement.size.length : (stryCov_9fa48("372"), (stryMutAct_9fa48("373") ? sum - placement.position.y : (stryCov_9fa48("373"), sum + placement.position.y)) + placement.size.length)), 0) - left.placements.reduce(stryMutAct_9fa48("374") ? () => undefined : (stryCov_9fa48("374"), (sum, placement) => stryMutAct_9fa48("375") ? sum + placement.position.y - placement.size.length : (stryCov_9fa48("375"), (stryMutAct_9fa48("376") ? sum - placement.position.y : (stryCov_9fa48("376"), sum + placement.position.y)) + placement.size.length)), 0))), stryMutAct_9fa48("377") ? () => undefined : (stryCov_9fa48("377"), (left, right) => stryMutAct_9fa48("378") ? left.containerIndex + right.containerIndex : (stryCov_9fa48("378"), left.containerIndex - right.containerIndex)));
    return sorted.map(stryMutAct_9fa48("379") ? () => undefined : (stryCov_9fa48("379"), (containerInstance, normalizedIndex) => stryMutAct_9fa48("380") ? {} : (stryCov_9fa48("380"), {
      containerIndex: normalizedIndex,
      placements: sortPlacements(containerInstance.placements.map(stryMutAct_9fa48("381") ? () => undefined : (stryCov_9fa48("381"), placement => stryMutAct_9fa48("382") ? {} : (stryCov_9fa48("382"), {
        ...placement,
        containerIndex: normalizedIndex
      }))))
    })));
  }
};
const hasPlacementOverlap = (candidatePlacement: Placement, placedInContainer: readonly Placement[]): boolean => {
  if (stryMutAct_9fa48("383")) {
    {}
  } else {
    stryCov_9fa48("383");
    // Extra collision guard for cross-layer/cross-heuristic candidates.
    return stryMutAct_9fa48("384") ? placedInContainer.every(placedEntry => {
      if (placedEntry.itemUnitId === candidatePlacement.itemUnitId) return false;
      return placementsOverlap(placedEntry, candidatePlacement);
    }) : (stryCov_9fa48("384"), placedInContainer.some(placedEntry => {
      if (stryMutAct_9fa48("385")) {
        {}
      } else {
        stryCov_9fa48("385");
        if (stryMutAct_9fa48("388") ? placedEntry.itemUnitId !== candidatePlacement.itemUnitId : stryMutAct_9fa48("387") ? false : stryMutAct_9fa48("386") ? true : (stryCov_9fa48("386", "387", "388"), placedEntry.itemUnitId === candidatePlacement.itemUnitId)) return stryMutAct_9fa48("389") ? true : (stryCov_9fa48("389"), false);
        return placementsOverlap(placedEntry, candidatePlacement);
      }
    }));
  }
};
const applyBestPlacementToState = (states: ContainerState[], best: BestPlacement): void => {
  if (stryMutAct_9fa48("390")) {
    {}
  } else {
    stryCov_9fa48("390");
    const targetState = states[best.containerIndex];
    if (stryMutAct_9fa48("393") ? best.kind !== "new" : stryMutAct_9fa48("392") ? false : stryMutAct_9fa48("391") ? true : (stryCov_9fa48("391", "392", "393"), best.kind === (stryMutAct_9fa48("394") ? "" : (stryCov_9fa48("394"), "new")))) {
      if (stryMutAct_9fa48("395")) {
        {}
      } else {
        stryCov_9fa48("395");
        targetState.layers.push(stryMutAct_9fa48("396") ? {} : (stryCov_9fa48("396"), {
          ...best.newLayer,
          freeRects: best.placed.nextFreeRects,
          placements: stryMutAct_9fa48("397") ? [] : (stryCov_9fa48("397"), [best.placed.placement])
        }));
      }
    } else {
      if (stryMutAct_9fa48("398")) {
        {}
      } else {
        stryCov_9fa48("398");
        const layer = targetState.layers[best.layerIndex];
        targetState.layers[best.layerIndex] = stryMutAct_9fa48("399") ? {} : (stryCov_9fa48("399"), {
          ...layer,
          freeRects: best.placed.nextFreeRects,
          placements: stryMutAct_9fa48("400") ? [] : (stryCov_9fa48("400"), [...layer.placements, best.placed.placement])
        });
      }
    }
    targetState.placements.push(best.placed.placement);
  }
};
const sortUnitsForPacking = stryMutAct_9fa48("401") ? () => undefined : (stryCov_9fa48("401"), (() => {
  const sortUnitsForPacking = (unitsToSort: readonly OrderItemUnit[]): OrderItemUnit[] => deterministicSort(stryMutAct_9fa48("402") ? [] : (stryCov_9fa48("402"), [...unitsToSort]), stryMutAct_9fa48("403") ? () => undefined : (stryCov_9fa48("403"), (left, right) => stryMutAct_9fa48("404") ? footprintOf(right) + footprintOf(left) : (stryCov_9fa48("404"), footprintOf(right) - footprintOf(left))), stryMutAct_9fa48("405") ? () => undefined : (stryCov_9fa48("405"), (left, right) => stryMutAct_9fa48("406") ? right.dimensions.height + left.dimensions.height : (stryCov_9fa48("406"), right.dimensions.height - left.dimensions.height)), stryMutAct_9fa48("407") ? () => undefined : (stryCov_9fa48("407"), (left, right) => stryMutAct_9fa48("408") ? left.itemTypeId + right.itemTypeId : (stryCov_9fa48("408"), left.itemTypeId - right.itemTypeId)), stryMutAct_9fa48("409") ? () => undefined : (stryCov_9fa48("409"), (left, right) => left.unitId.localeCompare(right.unitId)));
  return sortUnitsForPacking;
})());

// Сравнение двух результатов: сначала полнота, затем меньше контейнеров, затем больше размещений.
const compareResults = (left: PackingEngineOutput, right: PackingEngineOutput): number => {
  if (stryMutAct_9fa48("410")) {
    {}
  } else {
    stryCov_9fa48("410");
    if (stryMutAct_9fa48("413") ? left.unplacedItemUnitIds.length === right.unplacedItemUnitIds.length : stryMutAct_9fa48("412") ? false : stryMutAct_9fa48("411") ? true : (stryCov_9fa48("411", "412", "413"), left.unplacedItemUnitIds.length !== right.unplacedItemUnitIds.length)) {
      if (stryMutAct_9fa48("414")) {
        {}
      } else {
        stryCov_9fa48("414");
        return stryMutAct_9fa48("415") ? left.unplacedItemUnitIds.length + right.unplacedItemUnitIds.length : (stryCov_9fa48("415"), left.unplacedItemUnitIds.length - right.unplacedItemUnitIds.length);
      }
    }
    if (stryMutAct_9fa48("418") ? left.containers.length === right.containers.length : stryMutAct_9fa48("417") ? false : stryMutAct_9fa48("416") ? true : (stryCov_9fa48("416", "417", "418"), left.containers.length !== right.containers.length)) {
      if (stryMutAct_9fa48("419")) {
        {}
      } else {
        stryCov_9fa48("419");
        return stryMutAct_9fa48("420") ? left.containers.length + right.containers.length : (stryCov_9fa48("420"), left.containers.length - right.containers.length);
      }
    }
    const leftPlacementCount = countPlacements(left.containers);
    const rightPlacementCount = countPlacements(right.containers);
    if (stryMutAct_9fa48("423") ? leftPlacementCount === rightPlacementCount : stryMutAct_9fa48("422") ? false : stryMutAct_9fa48("421") ? true : (stryCov_9fa48("421", "422", "423"), leftPlacementCount !== rightPlacementCount)) {
      if (stryMutAct_9fa48("424")) {
        {}
      } else {
        stryCov_9fa48("424");
        return stryMutAct_9fa48("425") ? rightPlacementCount + leftPlacementCount : (stryCov_9fa48("425"), rightPlacementCount - leftPlacementCount);
      }
    }
    return 0;
  }
};

// Базовый greedy-проход с лимитом контейнеров.
// Заполняет текущий контейнер максимально, затем переходит к следующему.
const packWithLimit = (baseUnits: readonly OrderItemUnit[], containerLimit: number, container: ContainerType): PackingEngineOutput => {
  if (stryMutAct_9fa48("426")) {
    {}
  } else {
    stryCov_9fa48("426");
    // Baseline greedy strategy: fill current container, then move to next.
    type ExistingPlacementCandidate = {
      unitIndex: number;
      layerIndex: number;
      placed: TryPlaceResult;
      area: number;
    };
    type NewLayerPlacementCandidate = {
      unitIndex: number;
      placed: TryPlaceResult;
      area: number;
    };

    // Ищет лучший candidate в уже открытых слоях.
    const pickBestForExistingLayers = (remaining: readonly OrderItemUnit[], layers: readonly Layer[], containerIndex: number): ExistingPlacementCandidate | null => {
      if (stryMutAct_9fa48("427")) {
        {}
      } else {
        stryCov_9fa48("427");
        let bestExisting: ExistingPlacementCandidate | null = null;
        for (let unitIndex = 0; stryMutAct_9fa48("430") ? unitIndex >= remaining.length : stryMutAct_9fa48("429") ? unitIndex <= remaining.length : stryMutAct_9fa48("428") ? false : (stryCov_9fa48("428", "429", "430"), unitIndex < remaining.length); stryMutAct_9fa48("431") ? unitIndex -= 1 : (stryCov_9fa48("431"), unitIndex += 1)) {
          if (stryMutAct_9fa48("432")) {
            {}
          } else {
            stryCov_9fa48("432");
            const unit = remaining[unitIndex];
            for (let layerIndex = 0; stryMutAct_9fa48("435") ? layerIndex >= layers.length : stryMutAct_9fa48("434") ? layerIndex <= layers.length : stryMutAct_9fa48("433") ? false : (stryCov_9fa48("433", "434", "435"), layerIndex < layers.length); stryMutAct_9fa48("436") ? layerIndex -= 1 : (stryCov_9fa48("436"), layerIndex += 1)) {
              if (stryMutAct_9fa48("437")) {
                {}
              } else {
                stryCov_9fa48("437");
                const placed = tryPlaceInLayer(layers[layerIndex], unit, containerIndex);
                if (stryMutAct_9fa48("440") ? false : stryMutAct_9fa48("439") ? true : stryMutAct_9fa48("438") ? placed : (stryCov_9fa48("438", "439", "440"), !placed)) continue;
                const area = placementFootprint(placed.placement);
                if (stryMutAct_9fa48("443") ? !bestExisting && area > bestExisting.area : stryMutAct_9fa48("442") ? false : stryMutAct_9fa48("441") ? true : (stryCov_9fa48("441", "442", "443"), (stryMutAct_9fa48("444") ? bestExisting : (stryCov_9fa48("444"), !bestExisting)) || (stryMutAct_9fa48("447") ? area <= bestExisting.area : stryMutAct_9fa48("446") ? area >= bestExisting.area : stryMutAct_9fa48("445") ? false : (stryCov_9fa48("445", "446", "447"), area > bestExisting.area)))) {
                  if (stryMutAct_9fa48("448")) {
                    {}
                  } else {
                    stryCov_9fa48("448");
                    bestExisting = stryMutAct_9fa48("449") ? {} : (stryCov_9fa48("449"), {
                      unitIndex,
                      layerIndex,
                      placed,
                      area
                    });
                  }
                }
              }
            }
          }
        }
        return bestExisting;
      }
    };

    // Ищет лучший candidate для только что открытого слоя.
    const pickBestForNewLayer = (remaining: readonly OrderItemUnit[], newLayer: Layer, containerIndex: number): NewLayerPlacementCandidate | null => {
      if (stryMutAct_9fa48("450")) {
        {}
      } else {
        stryCov_9fa48("450");
        let bestNewLayer: NewLayerPlacementCandidate | null = null;
        for (let unitIndex = 0; stryMutAct_9fa48("453") ? unitIndex >= remaining.length : stryMutAct_9fa48("452") ? unitIndex <= remaining.length : stryMutAct_9fa48("451") ? false : (stryCov_9fa48("451", "452", "453"), unitIndex < remaining.length); stryMutAct_9fa48("454") ? unitIndex -= 1 : (stryCov_9fa48("454"), unitIndex += 1)) {
          if (stryMutAct_9fa48("455")) {
            {}
          } else {
            stryCov_9fa48("455");
            const unit = remaining[unitIndex];
            if (stryMutAct_9fa48("459") ? unit.dimensions.height <= newLayer.height : stryMutAct_9fa48("458") ? unit.dimensions.height >= newLayer.height : stryMutAct_9fa48("457") ? false : stryMutAct_9fa48("456") ? true : (stryCov_9fa48("456", "457", "458", "459"), unit.dimensions.height > newLayer.height)) continue;
            const placed = tryPlaceInLayer(newLayer, unit, containerIndex);
            if (stryMutAct_9fa48("462") ? false : stryMutAct_9fa48("461") ? true : stryMutAct_9fa48("460") ? placed : (stryCov_9fa48("460", "461", "462"), !placed)) continue;
            const area = placementFootprint(placed.placement);
            if (stryMutAct_9fa48("465") ? !bestNewLayer && area > bestNewLayer.area : stryMutAct_9fa48("464") ? false : stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463", "464", "465"), (stryMutAct_9fa48("466") ? bestNewLayer : (stryCov_9fa48("466"), !bestNewLayer)) || (stryMutAct_9fa48("469") ? area <= bestNewLayer.area : stryMutAct_9fa48("468") ? area >= bestNewLayer.area : stryMutAct_9fa48("467") ? false : (stryCov_9fa48("467", "468", "469"), area > bestNewLayer.area)))) {
              if (stryMutAct_9fa48("470")) {
                {}
              } else {
                stryCov_9fa48("470");
                bestNewLayer = stryMutAct_9fa48("471") ? {} : (stryCov_9fa48("471"), {
                  unitIndex,
                  placed,
                  area
                });
              }
            }
          }
        }
        return bestNewLayer;
      }
    };
    const remaining = stryMutAct_9fa48("472") ? [] : (stryCov_9fa48("472"), [...baseUnits]);
    const containerInstances: ContainerInstance[] = stryMutAct_9fa48("473") ? ["Stryker was here"] : (stryCov_9fa48("473"), []);
    let containerIndex = 0;
    while (stryMutAct_9fa48("475") ? remaining.length > 0 || containerIndex < containerLimit : stryMutAct_9fa48("474") ? false : (stryCov_9fa48("474", "475"), (stryMutAct_9fa48("478") ? remaining.length <= 0 : stryMutAct_9fa48("477") ? remaining.length >= 0 : stryMutAct_9fa48("476") ? true : (stryCov_9fa48("476", "477", "478"), remaining.length > 0)) && (stryMutAct_9fa48("481") ? containerIndex >= containerLimit : stryMutAct_9fa48("480") ? containerIndex <= containerLimit : stryMutAct_9fa48("479") ? true : (stryCov_9fa48("479", "480", "481"), containerIndex < containerLimit)))) {
      if (stryMutAct_9fa48("482")) {
        {}
      } else {
        stryCov_9fa48("482");
        const layers: Layer[] = stryMutAct_9fa48("483") ? ["Stryker was here"] : (stryCov_9fa48("483"), []);
        const placements: Placement[] = stryMutAct_9fa48("484") ? ["Stryker was here"] : (stryCov_9fa48("484"), []);
        let placedInPass = stryMutAct_9fa48("485") ? false : (stryCov_9fa48("485"), true);
        while (stryMutAct_9fa48("486") ? false : (stryCov_9fa48("486"), placedInPass)) {
          if (stryMutAct_9fa48("487")) {
            {}
          } else {
            stryCov_9fa48("487");
            placedInPass = stryMutAct_9fa48("488") ? true : (stryCov_9fa48("488"), false);
            const bestExisting = pickBestForExistingLayers(remaining, layers, containerIndex);
            if (stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : (stryCov_9fa48("489", "490"), bestExisting)) {
              if (stryMutAct_9fa48("491")) {
                {}
              } else {
                stryCov_9fa48("491");
                const layer = layers[bestExisting.layerIndex];
                layers[bestExisting.layerIndex] = stryMutAct_9fa48("492") ? {} : (stryCov_9fa48("492"), {
                  ...layer,
                  freeRects: bestExisting.placed.nextFreeRects,
                  placements: stryMutAct_9fa48("493") ? [] : (stryCov_9fa48("493"), [...layer.placements, bestExisting.placed.placement])
                });
                placements.push(bestExisting.placed.placement);
                remaining.splice(bestExisting.unitIndex, 1);
                placedInPass = stryMutAct_9fa48("494") ? false : (stryCov_9fa48("494"), true);
                continue;
              }
            }
            const nextLayerZ = layers.reduce(stryMutAct_9fa48("495") ? () => undefined : (stryCov_9fa48("495"), (sum, layer) => stryMutAct_9fa48("496") ? sum - layer.height : (stryCov_9fa48("496"), sum + layer.height)), 0);
            const availableHeight = stryMutAct_9fa48("497") ? container.height + nextLayerZ : (stryCov_9fa48("497"), container.height - nextLayerZ);
            const nextLayerHeight = pickNextLayerHeight(remaining, availableHeight);
            if (stryMutAct_9fa48("500") ? nextLayerHeight != null : stryMutAct_9fa48("499") ? false : stryMutAct_9fa48("498") ? true : (stryCov_9fa48("498", "499", "500"), nextLayerHeight == null)) break;
            const baseRects: FreeRect[] = getBaseRectsForLayer(nextLayerZ, layers, container);
            if (stryMutAct_9fa48("503") ? baseRects.length !== 0 : stryMutAct_9fa48("502") ? false : stryMutAct_9fa48("501") ? true : (stryCov_9fa48("501", "502", "503"), baseRects.length === 0)) break;
            const newLayer: Layer = stryMutAct_9fa48("504") ? {} : (stryCov_9fa48("504"), {
              z: nextLayerZ,
              height: nextLayerHeight,
              freeRects: sortFreeRects(baseRects),
              placements: stryMutAct_9fa48("505") ? ["Stryker was here"] : (stryCov_9fa48("505"), [])
            });
            const bestNewLayer = pickBestForNewLayer(remaining, newLayer, containerIndex);
            if (stryMutAct_9fa48("508") ? false : stryMutAct_9fa48("507") ? true : stryMutAct_9fa48("506") ? bestNewLayer : (stryCov_9fa48("506", "507", "508"), !bestNewLayer)) break;
            layers.push(stryMutAct_9fa48("509") ? {} : (stryCov_9fa48("509"), {
              ...newLayer,
              freeRects: bestNewLayer.placed.nextFreeRects,
              placements: stryMutAct_9fa48("510") ? [] : (stryCov_9fa48("510"), [bestNewLayer.placed.placement])
            }));
            placements.push(bestNewLayer.placed.placement);
            remaining.splice(bestNewLayer.unitIndex, 1);
            placedInPass = stryMutAct_9fa48("511") ? false : (stryCov_9fa48("511"), true);
          }
        }
        if (stryMutAct_9fa48("514") ? placements.length !== 0 : stryMutAct_9fa48("513") ? false : stryMutAct_9fa48("512") ? true : (stryCov_9fa48("512", "513", "514"), placements.length === 0)) break;
        containerInstances.push(stryMutAct_9fa48("515") ? {} : (stryCov_9fa48("515"), {
          containerIndex,
          placements: sortPlacements(placements)
        }));
        stryMutAct_9fa48("516") ? containerIndex -= 1 : (stryCov_9fa48("516"), containerIndex += 1);
      }
    }
    return stryMutAct_9fa48("517") ? {} : (stryCov_9fa48("517"), {
      containers: normalizeContainerOrder(containerInstances),
      unplacedItemUnitIds: deterministicSort(remaining.map(stryMutAct_9fa48("518") ? () => undefined : (stryCov_9fa48("518"), unit => unit.unitId)), stryMutAct_9fa48("519") ? () => undefined : (stryCov_9fa48("519"), (left, right) => left.localeCompare(right)))
    });
  }
};

// Расширенный режим: одновременно оценивает размещение по нескольким контейнерам
// и выбирает глобально лучший ход по score-вектору.
const packAcrossContainers = (baseUnits: readonly OrderItemUnit[], containerLimit: number, container: ContainerType, profile: PackingProfile = stryMutAct_9fa48("520") ? "" : (stryCov_9fa48("520"), "balanced")): PackingEngineOutput => {
  if (stryMutAct_9fa48("521")) {
    {}
  } else {
    stryCov_9fa48("521");
    // Multi-container scorer: chooses best candidate across containers and layers.
    // Единый score для "existing layer" и "new layer" кандидатов.
    // Вектор упорядочен по приоритетам: физика/бизнес/компактность/эстетика.
    const buildScore = (state: ContainerState, placed: TryPlaceResult, itemTypeId: number, states: readonly ContainerState[], isNewLayer: boolean): number[] => {
      if (stryMutAct_9fa48("522")) {
        {}
      } else {
        stryCov_9fa48("522");
        const firstContainerPlacements = stryMutAct_9fa48("523") ? states[0]?.placements.length && 0 : (stryCov_9fa48("523"), (stryMutAct_9fa48("524") ? states[0].placements.length : (stryCov_9fa48("524"), states[0]?.placements.length)) ?? 0);
        const firstContainerSpillPenalty = (stryMutAct_9fa48("527") ? state.containerIndex !== 0 : stryMutAct_9fa48("526") ? false : stryMutAct_9fa48("525") ? true : (stryCov_9fa48("525", "526", "527"), state.containerIndex === 0)) ? 0 : stryMutAct_9fa48("528") ? Math.min(0, firstContainerPlacements - state.placements.length) : (stryCov_9fa48("528"), Math.max(0, stryMutAct_9fa48("529") ? firstContainerPlacements + state.placements.length : (stryCov_9fa48("529"), firstContainerPlacements - state.placements.length)));
        const farWallGap = stryMutAct_9fa48("530") ? container.length + (placed.placement.position.y + placed.placement.size.length) : (stryCov_9fa48("530"), container.length - (stryMutAct_9fa48("531") ? placed.placement.position.y - placed.placement.size.length : (stryCov_9fa48("531"), placed.placement.position.y + placed.placement.size.length)));
        return stryMutAct_9fa48("532") ? [] : (stryCov_9fa48("532"), [isNewLayer ? 1 : 0, firstContainerSpillPenalty, (stryMutAct_9fa48("535") ? profile !== "balanced" : stryMutAct_9fa48("534") ? false : stryMutAct_9fa48("533") ? true : (stryCov_9fa48("533", "534", "535"), profile === (stryMutAct_9fa48("536") ? "" : (stryCov_9fa48("536"), "balanced")))) ? newTypeInContainerPenalty(state.placements, itemTypeId) : 0, yFrontGapPenalty(state.placements, placed.placement), containerEnvelopePenalty(state.placements, placed.placement), farWallGap, placed.wasteArea, stryMutAct_9fa48("537") ? placed.wasteWidth - placed.wasteLength : (stryCov_9fa48("537"), placed.wasteWidth + placed.wasteLength), (stryMutAct_9fa48("540") ? profile !== "balanced" : stryMutAct_9fa48("539") ? false : stryMutAct_9fa48("538") ? true : (stryCov_9fa48("538", "539", "540"), profile === (stryMutAct_9fa48("541") ? "" : (stryCov_9fa48("541"), "balanced")))) ? clusteringPenalty(state.placements, itemTypeId, placed.placement) : 0, placed.placement.position.z, stryMutAct_9fa48("542") ? +state.placements.length : (stryCov_9fa48("542"), -state.placements.length), state.containerIndex, stryMutAct_9fa48("543") ? +(placed.placement.position.y + placed.placement.size.length) : (stryCov_9fa48("543"), -(stryMutAct_9fa48("544") ? placed.placement.position.y - placed.placement.size.length : (stryCov_9fa48("544"), placed.placement.position.y + placed.placement.size.length)))]);
      }
    };
    const canPlaceUnitInState = (state: ContainerState, unit: OrderItemUnit): boolean => {
      if (stryMutAct_9fa48("545")) {
        {}
      } else {
        stryCov_9fa48("545");
        // Fast feasibility probe: if unit fits container 0, keep pushing container 0 first.
        for (let layerIndex = 0; stryMutAct_9fa48("548") ? layerIndex >= state.layers.length : stryMutAct_9fa48("547") ? layerIndex <= state.layers.length : stryMutAct_9fa48("546") ? false : (stryCov_9fa48("546", "547", "548"), layerIndex < state.layers.length); stryMutAct_9fa48("549") ? layerIndex -= 1 : (stryCov_9fa48("549"), layerIndex += 1)) {
          if (stryMutAct_9fa48("550")) {
            {}
          } else {
            stryCov_9fa48("550");
            const placed = tryPlaceInLayer(state.layers[layerIndex], unit, state.containerIndex);
            if (stryMutAct_9fa48("553") ? false : stryMutAct_9fa48("552") ? true : stryMutAct_9fa48("551") ? placed : (stryCov_9fa48("551", "552", "553"), !placed)) continue;
            if (stryMutAct_9fa48("556") ? false : stryMutAct_9fa48("555") ? true : stryMutAct_9fa48("554") ? hasPlacementOverlap(placed.placement, state.placements) : (stryCov_9fa48("554", "555", "556"), !hasPlacementOverlap(placed.placement, state.placements))) return stryMutAct_9fa48("557") ? false : (stryCov_9fa48("557"), true);
          }
        }
        const supportZLevels = getSupportZLevels(state.placements);
        for (const layerZ of supportZLevels) {
          if (stryMutAct_9fa48("558")) {
            {}
          } else {
            stryCov_9fa48("558");
            if (stryMutAct_9fa48("561") ? state.layers.every(layer => layer.z === layerZ) : stryMutAct_9fa48("560") ? false : stryMutAct_9fa48("559") ? true : (stryCov_9fa48("559", "560", "561"), state.layers.some(stryMutAct_9fa48("562") ? () => undefined : (stryCov_9fa48("562"), layer => stryMutAct_9fa48("565") ? layer.z !== layerZ : stryMutAct_9fa48("564") ? false : stryMutAct_9fa48("563") ? true : (stryCov_9fa48("563", "564", "565"), layer.z === layerZ))))) continue;
            if (stryMutAct_9fa48("569") ? layerZ + unit.dimensions.height <= container.height : stryMutAct_9fa48("568") ? layerZ + unit.dimensions.height >= container.height : stryMutAct_9fa48("567") ? false : stryMutAct_9fa48("566") ? true : (stryCov_9fa48("566", "567", "568", "569"), (stryMutAct_9fa48("570") ? layerZ - unit.dimensions.height : (stryCov_9fa48("570"), layerZ + unit.dimensions.height)) > container.height)) continue;
            const baseRects: FreeRect[] = getBaseRectsForLayer(layerZ, state.layers, container);
            if (stryMutAct_9fa48("573") ? baseRects.length !== 0 : stryMutAct_9fa48("572") ? false : stryMutAct_9fa48("571") ? true : (stryCov_9fa48("571", "572", "573"), baseRects.length === 0)) continue;
            const newLayer: Layer = stryMutAct_9fa48("574") ? {} : (stryCov_9fa48("574"), {
              z: layerZ,
              height: normalizeLayerHeight(unit.dimensions.height, baseUnits, stryMutAct_9fa48("575") ? container.height + layerZ : (stryCov_9fa48("575"), container.height - layerZ)),
              freeRects: sortFreeRects(baseRects),
              placements: stryMutAct_9fa48("576") ? ["Stryker was here"] : (stryCov_9fa48("576"), [])
            });
            const placedInNewLayer = tryPlaceInLayer(newLayer, unit, state.containerIndex);
            if (stryMutAct_9fa48("579") ? false : stryMutAct_9fa48("578") ? true : stryMutAct_9fa48("577") ? placedInNewLayer : (stryCov_9fa48("577", "578", "579"), !placedInNewLayer)) continue;
            if (stryMutAct_9fa48("582") ? false : stryMutAct_9fa48("581") ? true : stryMutAct_9fa48("580") ? hasPlacementOverlap(placedInNewLayer.placement, state.placements) : (stryCov_9fa48("580", "581", "582"), !hasPlacementOverlap(placedInNewLayer.placement, state.placements))) return stryMutAct_9fa48("583") ? false : (stryCov_9fa48("583"), true);
          }
        }
        return stryMutAct_9fa48("584") ? true : (stryCov_9fa48("584"), false);
      }
    };
    const states: ContainerState[] = Array.from(stryMutAct_9fa48("585") ? {} : (stryCov_9fa48("585"), {
      length: containerLimit
    }), stryMutAct_9fa48("586") ? () => undefined : (stryCov_9fa48("586"), (_, index) => stryMutAct_9fa48("587") ? {} : (stryCov_9fa48("587"), {
      containerIndex: index,
      layers: stryMutAct_9fa48("588") ? ["Stryker was here"] : (stryCov_9fa48("588"), []),
      placements: stryMutAct_9fa48("589") ? ["Stryker was here"] : (stryCov_9fa48("589"), [])
    })));
    const unplacedItemUnitIds: string[] = stryMutAct_9fa48("590") ? ["Stryker was here"] : (stryCov_9fa48("590"), []);
    for (const unit of baseUnits) {
      if (stryMutAct_9fa48("591")) {
        {}
      } else {
        stryCov_9fa48("591");
        const firstContainerOnly = stryMutAct_9fa48("594") ? containerLimit > 1 && states[0] != null || canPlaceUnitInState(states[0], unit) : stryMutAct_9fa48("593") ? false : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593", "594"), (stryMutAct_9fa48("596") ? containerLimit > 1 || states[0] != null : stryMutAct_9fa48("595") ? true : (stryCov_9fa48("595", "596"), (stryMutAct_9fa48("599") ? containerLimit <= 1 : stryMutAct_9fa48("598") ? containerLimit >= 1 : stryMutAct_9fa48("597") ? true : (stryCov_9fa48("597", "598", "599"), containerLimit > 1)) && (stryMutAct_9fa48("601") ? states[0] == null : stryMutAct_9fa48("600") ? true : (stryCov_9fa48("600", "601"), states[0] != null)))) && canPlaceUnitInState(states[0], unit));
        let best: BestPlacement | null = null;
        for (let stateIndex = 0; stryMutAct_9fa48("604") ? stateIndex >= states.length : stryMutAct_9fa48("603") ? stateIndex <= states.length : stryMutAct_9fa48("602") ? false : (stryCov_9fa48("602", "603", "604"), stateIndex < states.length); stryMutAct_9fa48("605") ? stateIndex -= 1 : (stryCov_9fa48("605"), stateIndex += 1)) {
          if (stryMutAct_9fa48("606")) {
            {}
          } else {
            stryCov_9fa48("606");
            if (stryMutAct_9fa48("609") ? firstContainerOnly || stateIndex > 0 : stryMutAct_9fa48("608") ? false : stryMutAct_9fa48("607") ? true : (stryCov_9fa48("607", "608", "609"), firstContainerOnly && (stryMutAct_9fa48("612") ? stateIndex <= 0 : stryMutAct_9fa48("611") ? stateIndex >= 0 : stryMutAct_9fa48("610") ? true : (stryCov_9fa48("610", "611", "612"), stateIndex > 0)))) continue;
            const state = states[stateIndex];
            for (let layerIndex = 0; stryMutAct_9fa48("615") ? layerIndex >= state.layers.length : stryMutAct_9fa48("614") ? layerIndex <= state.layers.length : stryMutAct_9fa48("613") ? false : (stryCov_9fa48("613", "614", "615"), layerIndex < state.layers.length); stryMutAct_9fa48("616") ? layerIndex -= 1 : (stryCov_9fa48("616"), layerIndex += 1)) {
              if (stryMutAct_9fa48("617")) {
                {}
              } else {
                stryCov_9fa48("617");
                const layer = state.layers[layerIndex];
                const placed = tryPlaceInLayer(layer, unit, state.containerIndex);
                if (stryMutAct_9fa48("620") ? false : stryMutAct_9fa48("619") ? true : stryMutAct_9fa48("618") ? placed : (stryCov_9fa48("618", "619", "620"), !placed)) continue;
                if (stryMutAct_9fa48("622") ? false : stryMutAct_9fa48("621") ? true : (stryCov_9fa48("621", "622"), hasPlacementOverlap(placed.placement, state.placements))) continue;
                const score = buildScore(state, placed, unit.itemTypeId, states, stryMutAct_9fa48("623") ? true : (stryCov_9fa48("623"), false));
                const candidate: BestPlacement = stryMutAct_9fa48("624") ? {} : (stryCov_9fa48("624"), {
                  kind: stryMutAct_9fa48("625") ? "" : (stryCov_9fa48("625"), "existing"),
                  containerIndex: stateIndex,
                  layerIndex,
                  placed,
                  score
                });
                if (stryMutAct_9fa48("628") ? !best && isScoreVectorBetter(candidate.score, best.score) : stryMutAct_9fa48("627") ? false : stryMutAct_9fa48("626") ? true : (stryCov_9fa48("626", "627", "628"), (stryMutAct_9fa48("629") ? best : (stryCov_9fa48("629"), !best)) || isScoreVectorBetter(candidate.score, best.score))) {
                  if (stryMutAct_9fa48("630")) {
                    {}
                  } else {
                    stryCov_9fa48("630");
                    best = candidate;
                  }
                }
              }
            }
            const supportZLevels = getSupportZLevels(state.placements);
            for (const layerZ of supportZLevels) {
              if (stryMutAct_9fa48("631")) {
                {}
              } else {
                stryCov_9fa48("631");
                if (stryMutAct_9fa48("634") ? state.layers.every(layer => layer.z === layerZ) : stryMutAct_9fa48("633") ? false : stryMutAct_9fa48("632") ? true : (stryCov_9fa48("632", "633", "634"), state.layers.some(stryMutAct_9fa48("635") ? () => undefined : (stryCov_9fa48("635"), layer => stryMutAct_9fa48("638") ? layer.z !== layerZ : stryMutAct_9fa48("637") ? false : stryMutAct_9fa48("636") ? true : (stryCov_9fa48("636", "637", "638"), layer.z === layerZ))))) continue;
                if (stryMutAct_9fa48("642") ? layerZ + unit.dimensions.height <= container.height : stryMutAct_9fa48("641") ? layerZ + unit.dimensions.height >= container.height : stryMutAct_9fa48("640") ? false : stryMutAct_9fa48("639") ? true : (stryCov_9fa48("639", "640", "641", "642"), (stryMutAct_9fa48("643") ? layerZ - unit.dimensions.height : (stryCov_9fa48("643"), layerZ + unit.dimensions.height)) > container.height)) continue;
                const baseRects: FreeRect[] = getBaseRectsForLayer(layerZ, state.layers, container);
                if (stryMutAct_9fa48("646") ? baseRects.length !== 0 : stryMutAct_9fa48("645") ? false : stryMutAct_9fa48("644") ? true : (stryCov_9fa48("644", "645", "646"), baseRects.length === 0)) continue;
                const newLayer: Layer = stryMutAct_9fa48("647") ? {} : (stryCov_9fa48("647"), {
                  z: layerZ,
                  height: normalizeLayerHeight(unit.dimensions.height, baseUnits, stryMutAct_9fa48("648") ? container.height + layerZ : (stryCov_9fa48("648"), container.height - layerZ)),
                  freeRects: sortFreeRects(baseRects),
                  placements: stryMutAct_9fa48("649") ? ["Stryker was here"] : (stryCov_9fa48("649"), [])
                });
                const placedInNewLayer = tryPlaceInLayer(newLayer, unit, state.containerIndex);
                if (stryMutAct_9fa48("652") ? false : stryMutAct_9fa48("651") ? true : stryMutAct_9fa48("650") ? placedInNewLayer : (stryCov_9fa48("650", "651", "652"), !placedInNewLayer)) continue;
                if (stryMutAct_9fa48("654") ? false : stryMutAct_9fa48("653") ? true : (stryCov_9fa48("653", "654"), hasPlacementOverlap(placedInNewLayer.placement, state.placements))) continue;
                const newLayerScore = buildScore(state, placedInNewLayer, unit.itemTypeId, states, stryMutAct_9fa48("655") ? false : (stryCov_9fa48("655"), true));
                const candidate: BestPlacement = stryMutAct_9fa48("656") ? {} : (stryCov_9fa48("656"), {
                  kind: stryMutAct_9fa48("657") ? "" : (stryCov_9fa48("657"), "new"),
                  containerIndex: stateIndex,
                  newLayer,
                  placed: placedInNewLayer,
                  score: newLayerScore
                });
                if (stryMutAct_9fa48("660") ? !best && isScoreVectorBetter(candidate.score, best.score) : stryMutAct_9fa48("659") ? false : stryMutAct_9fa48("658") ? true : (stryCov_9fa48("658", "659", "660"), (stryMutAct_9fa48("661") ? best : (stryCov_9fa48("661"), !best)) || isScoreVectorBetter(candidate.score, best.score))) {
                  if (stryMutAct_9fa48("662")) {
                    {}
                  } else {
                    stryCov_9fa48("662");
                    best = candidate;
                  }
                }
              }
            }
          }
        }
        if (stryMutAct_9fa48("665") ? false : stryMutAct_9fa48("664") ? true : stryMutAct_9fa48("663") ? best : (stryCov_9fa48("663", "664", "665"), !best)) {
          if (stryMutAct_9fa48("666")) {
            {}
          } else {
            stryCov_9fa48("666");
            unplacedItemUnitIds.push(unit.unitId);
            continue;
          }
        }
        applyBestPlacementToState(states, best);
      }
    }
    const containers = stryMutAct_9fa48("667") ? states.map(state => ({
      containerIndex: state.containerIndex,
      placements: sortPlacements(state.placements)
    })) : (stryCov_9fa48("667"), states.filter(stryMutAct_9fa48("668") ? () => undefined : (stryCov_9fa48("668"), state => stryMutAct_9fa48("672") ? state.placements.length <= 0 : stryMutAct_9fa48("671") ? state.placements.length >= 0 : stryMutAct_9fa48("670") ? false : stryMutAct_9fa48("669") ? true : (stryCov_9fa48("669", "670", "671", "672"), state.placements.length > 0))).map(stryMutAct_9fa48("673") ? () => undefined : (stryCov_9fa48("673"), state => stryMutAct_9fa48("674") ? {} : (stryCov_9fa48("674"), {
      containerIndex: state.containerIndex,
      placements: sortPlacements(state.placements)
    }))));
    return stryMutAct_9fa48("675") ? {} : (stryCov_9fa48("675"), {
      containers: normalizeContainerOrder(containers),
      unplacedItemUnitIds: deterministicSort(unplacedItemUnitIds, stryMutAct_9fa48("676") ? () => undefined : (stryCov_9fa48("676"), (left, right) => left.localeCompare(right)))
    });
  }
};

// Пытается уменьшить число контейнеров от greedy-решения без потери полноты размещения.
const pickBestResultByLimit = (baseUnits: readonly OrderItemUnit[], greedyResult: PackingEngineOutput, container: ContainerType): PackingEngineOutput => {
  if (stryMutAct_9fa48("677")) {
    {}
  } else {
    stryCov_9fa48("677");
    // Tries to reduce container count while preserving full placement.
    if (stryMutAct_9fa48("680") ? greedyResult.unplacedItemUnitIds.length !== 0 && greedyResult.containers.length <= 1 : stryMutAct_9fa48("679") ? false : stryMutAct_9fa48("678") ? true : (stryCov_9fa48("678", "679", "680"), (stryMutAct_9fa48("682") ? greedyResult.unplacedItemUnitIds.length === 0 : stryMutAct_9fa48("681") ? false : (stryCov_9fa48("681", "682"), greedyResult.unplacedItemUnitIds.length !== 0)) || (stryMutAct_9fa48("685") ? greedyResult.containers.length > 1 : stryMutAct_9fa48("684") ? greedyResult.containers.length < 1 : stryMutAct_9fa48("683") ? false : (stryCov_9fa48("683", "684", "685"), greedyResult.containers.length <= 1)))) {
      if (stryMutAct_9fa48("686")) {
        {}
      } else {
        stryCov_9fa48("686");
        return greedyResult;
      }
    }
    for (let limit = 1; stryMutAct_9fa48("689") ? limit >= greedyResult.containers.length : stryMutAct_9fa48("688") ? limit <= greedyResult.containers.length : stryMutAct_9fa48("687") ? false : (stryCov_9fa48("687", "688", "689"), limit < greedyResult.containers.length); stryMutAct_9fa48("690") ? limit -= 1 : (stryCov_9fa48("690"), limit += 1)) {
      if (stryMutAct_9fa48("691")) {
        {}
      } else {
        stryCov_9fa48("691");
        const candidatesForLimit = stryMutAct_9fa48("692") ? [] : (stryCov_9fa48("692"), [packAcrossContainers(baseUnits, limit, container, stryMutAct_9fa48("693") ? "" : (stryCov_9fa48("693"), "balanced")), packAcrossContainers(baseUnits, limit, container, stryMutAct_9fa48("694") ? "" : (stryCov_9fa48("694"), "dense")), packWithLimit(baseUnits, limit, container)]);
        const fullyPlacedCandidates = stryMutAct_9fa48("695") ? candidatesForLimit : (stryCov_9fa48("695"), candidatesForLimit.filter(stryMutAct_9fa48("696") ? () => undefined : (stryCov_9fa48("696"), candidate => stryMutAct_9fa48("699") ? candidate.unplacedItemUnitIds.length !== 0 : stryMutAct_9fa48("698") ? false : stryMutAct_9fa48("697") ? true : (stryCov_9fa48("697", "698", "699"), candidate.unplacedItemUnitIds.length === 0))));
        if (stryMutAct_9fa48("702") ? fullyPlacedCandidates.length !== 0 : stryMutAct_9fa48("701") ? false : stryMutAct_9fa48("700") ? true : (stryCov_9fa48("700", "701", "702"), fullyPlacedCandidates.length === 0)) continue;
        return fullyPlacedCandidates.reduce(stryMutAct_9fa48("703") ? () => undefined : (stryCov_9fa48("703"), (bestCandidate, currentCandidate) => (stryMutAct_9fa48("707") ? compareResults(currentCandidate, bestCandidate) >= 0 : stryMutAct_9fa48("706") ? compareResults(currentCandidate, bestCandidate) <= 0 : stryMutAct_9fa48("705") ? false : stryMutAct_9fa48("704") ? true : (stryCov_9fa48("704", "705", "706", "707"), compareResults(currentCandidate, bestCandidate) < 0)) ? currentCandidate : bestCandidate));
      }
    }
    return greedyResult;
  }
};
export const runPackingEngine = (units: readonly OrderItemUnit[], container: ContainerType): PackingEngineOutput => {
  if (stryMutAct_9fa48("708")) {
    {}
  } else {
    stryCov_9fa48("708");
    const baseUnits = sortUnitsForPacking(units);
    const greedyResult = packWithLimit(baseUnits, units.length, container);
    const bestResult = pickBestResultByLimit(baseUnits, greedyResult, container);
    return bestResult;
  }
};