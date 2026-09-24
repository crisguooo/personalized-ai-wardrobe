import { assignLayers, isLayer, canFillLayer } from "../data/layers.js";
import { BY_ID } from "../data/catalog.js";
import { generate, rank, validity } from "./wardrobe.js";

import { annotateLook, composition } from "./directions.js";

export const today = () => new Date().toLocaleDateString("en-CA");
export const toC = (value, unit) =>
  Math.round((unit === "F" ? ((value - 32) * 5) / 9 : value) * 1e6) / 1e6;
export const fromC = (value, unit) =>
  unit === "F" ? (value * 9) / 5 + 32 : value;
export const temperature = (value, unit = "C") =>
  `${Math.round(fromC(value, unit))}°${unit}`;
export const freshWeather = () => ({
  lowC: null,
  highC: null,
  unit: "C",
  date: "",
  comfort: "default",
  coatBelowC: 10,
  confirmed: false,
});
export function validRange(low, high) {
  return (
    Number.isFinite(low) &&
    Number.isFinite(high) &&
    low >= -40 &&
    high <= 50 &&
    low <= high
  );
}
export function normalizeWeather(raw) {
  const clean = freshWeather();
  if (!raw || typeof raw !== "object") return clean;
  clean.unit = raw.unit === "F" ? "F" : "C";
  clean.confirmed = raw.confirmed === true;
  if (validRange(raw.lowC, raw.highC)) {
    clean.lowC = raw.lowC;
    clean.highC = raw.highC;
    clean.date = typeof raw.date === "string" ? raw.date : "";
  }
  clean.comfort = ["default", "cold", "warm", "custom"].includes(raw.comfort)
    ? raw.comfort
    : "default";
  clean.coatBelowC = Number.isFinite(raw.coatBelowC)
    ? Math.max(-10, Math.min(30, raw.coatBelowC))
    : 10;
  return clean;
}
export function normalizeThermalOverrides(raw) {
  return Object.fromEntries(
    Object.entries(raw ?? {})
      .filter(([id, r]) => BY_ID[id] && r && validRange(r.minC, r.maxC))
      .map(([id, r]) => [id, { minC: r.minC, maxC: r.maxC }]),
  );
}
export const comfortOffset = (weather) =>
  ({ default: 0, cold: 4, warm: -4, custom: weather.coatBelowC - 10 })[
    weather.comfort
  ] ?? 0;
export const guideFor = (item, overrides = {}) => {
  const guide = { ...item.thermal, ...overrides[item.id] };
  if (item.category !== "top" && guide.active)
    guide.insulationC = Math.max(
      0,
      item.thermal.insulationC + item.thermal.minC - guide.minC,
    );
  return guide;
};

// Choose a seasonal base/pool before silhouette formulas assemble outfits.
// Cold exposure cannot be cancelled out by a coat's additive warmth score.
export function wearableForWeather(item, weather, overrides = {}) {
  if (!item) return false;
  if (!validRange(weather?.lowC, weather?.highC)) return true;
  const low = weather.lowC - comfortOffset(weather);
  const coldLow = Math.min(low, weather.lowC);
  const guide = guideFor(item, overrides);
  if (item.category === "top") {
    if (coldLow < -10) return item.archetype === "thermal-top";
    if (coldLow < 12)
      return item.thermal.coverage === 3 && item.archetype !== "linen-shirt";
    if (item.archetype === "thermal-top" && low > 16) return false;
    if (low >= 26)
      return (
        guide.minC >= 25 &&
        (item.thermal.coverage <= 1 || item.archetype === "linen-shirt")
      );
    if (low >= 22) return guide.minC >= 24;
    return true;
  }
  const override = overrides[item.id];
  const wearMax = override?.maxC ?? guide.wearMaxC;
  const wearMin = override?.minC ?? guide.wearMinC;
  // Boots cannot be shed like a coat; the default is strictly below 5°C.
  const at = item.archetype === "winter-boots" ? weather.lowC : low;
  if (
    wearMax !== null &&
    wearMax !== undefined &&
    (guide.wearMaxExclusive ? at >= wearMax : at > wearMax)
  )
    return false;
  if (guide.wearMinC !== null && wearMin !== null && at < wearMin) return false;
  if (low >= 24 && ["midlayer", "outerwear"].includes(item.category))
    return false;
  if (low >= 22 && item.category === "bottom" && item.thermal.winterLevel > 0)
    return false;
  return true;
}

export function weatherPool(ids, weather, overrides = {}) {
  return [...new Set(ids)].filter((id) =>
    wearableForWeather(BY_ID[id], weather, overrides),
  );
}

export function weatherRequirements(temp, weather, overrides = {}) {
  const rules = [];
  const add = (key, label, examples, check) =>
    rules.push({ key, label, examples, check });
  const has = (items, category, predicate = () => true) => {
    if (["midlayer", "outerwear"].includes(category)) {
      const role = category === "midlayer" ? "midLayer" : "outerLayer";
      return items.some((i) => canFillLayer(i, role) && predicate(i));
    }
    return items.some((i) => i.category === category && predicate(i));
  };
  if (temp < 26)
    add("sleeves", "Long sleeves", ["long-sleeve", "button-shirt"], (items) =>
      items.some(
        (i) =>
          ["top", "midlayer", "outerwear"].includes(i.category) &&
          i.thermal.coverage === 3,
      ),
    );
  if (temp < 28)
    add(
      "bottoms",
      temp < 24 ? "Full-length bottoms" : "Longer bottoms",
      temp < 24
        ? ["straight-jeans", "trousers"]
        : ["cropped-trousers", "linen-trousers"],
      (items) =>
        has(items, "bottom", (i) => i.thermal.coverage >= (temp < 24 ? 3 : 2)),
    );
  if (temp < 12 || temp + comfortOffset(weather) < 8)
    add(
      "winter-base",
      "Warm long-sleeve base",
      ["thermal-top", "turtleneck", "knit"],
      (items) =>
        has(items, "top", (i) => i.thermal.winterBase) ||
        (has(
          items,
          "top",
          (i) => i.thermal.coverage === 3 && i.archetype !== "linen-shirt",
        ) &&
          has(
            items,
            "midlayer",
            (i) =>
              !i.thermal.shell &&
              i.thermal.coverage === 3 &&
              i.thermal.insulationC >= 3,
          )),
    );
  if (temp < 22)
    add(
      "warm-base",
      temp < 20
        ? "Warm knit or insulating midlayer"
        : "Light knit or long-sleeve base",
      ["knit", "fleece-jacket"],
      (items) =>
        has(
          items,
          "top",
          (i) => guideFor(i, overrides).minC <= (temp < 20 ? 23 : 25),
        ) ||
        has(items, "midlayer", (i) => guideFor(i, overrides).insulationC >= 3),
    );
  if (temp < 22)
    add(
      "covered-shoes",
      "Covered shoes",
      ["sneakers", "ankle-boots"],
      (items) => has(items, "shoes", (i) => i.thermal.coverage >= 3),
    );
  const personalCoat =
    weather.comfort === "custom" &&
    temp + comfortOffset(weather) <= weather.coatBelowC;
  if (temp < -5)
    add("coat", "Insulated winter coat", ["long-puffer", "parka"], (items) =>
      has(items, "outerwear", (i) => i.thermal.winterLevel >= 2),
    );
  else if (temp < 0)
    add(
      "coat",
      "Insulated winter coat",
      ["puffer", "long-puffer", "parka"],
      (items) =>
        has(
          items,
          "outerwear",
          (i) => i.archetype === "puffer" || i.thermal.winterLevel >= 2,
        ),
    );
  else if (temp < 8 || personalCoat)
    add("coat", "Winter coat", ["puffer", "wool-coat"], (items) =>
      has(items, "outerwear", (i) => i.thermal.winterLevel >= 1),
    );
  else if (temp < 12)
    add("coat", "Warm coat", ["wool-coat", "puffer"], (items) =>
      has(items, "outerwear", (i) => guideFor(i, overrides).insulationC >= 8),
    );
  else if (temp < 16)
    add("coat", "Jacket or coat", ["trench", "leather-jacket"], (items) =>
      has(items, "outerwear", (i) => guideFor(i, overrides).insulationC >= 5),
    );
  else if (temp < 18)
    add(
      "layer",
      "Warm knit or light outer layer",
      ["knit", "light-cardigan"],
      (items) =>
        items.some(
          (i) =>
            ["midlayer", "outerwear"].includes(i.category) &&
            i.thermal.coverage === 3,
        ) || has(items, "top", (i) => guideFor(i, overrides).minC <= 23),
    );
  if (temp < 10)
    add("neck", "Warm scarf", ["scarf"], (items) =>
      items.some((i) => i.archetype === "scarf"),
    );
  if (temp < 5)
    add("lined-bottoms", "Fleece-lined pants", ["fleece-pants"], (items) =>
      has(items, "bottom", (i) => i.thermal.winterLevel >= 1),
    );
  if (temp < 0)
    add("boots", "Insulated winter boots", ["winter-boots"], (items) =>
      has(items, "shoes", (i) => i.thermal.winterLevel >= 2),
    );
  else if (temp < 5)
    add("boots", "Boots", ["ankle-boots", "tall-boots"], (items) =>
      has(items, "shoes", (i) => i.subcategory.includes("boots")),
    );
  if (temp < 2) {
    add("head", "Warm beanie", ["beanie"], (items) =>
      items.some((i) => i.archetype === "beanie"),
    );
    add("hands", "Winter gloves", ["gloves"], (items) =>
      items.some((i) => i.archetype === "gloves"),
    );
  }
  if (temp < -10)
    add("thermal-base", "Thermal base top", ["thermal-top"], (items) =>
      items.some((i) => i.archetype === "thermal-top"),
    );
  return rules;
}
export function weatherNeeds(ids, weather, overrides = {}) {
  if (!validRange(weather?.lowC, weather?.highC))
    return { missing: [], requirements: [] };
  const items = weatherPool(ids, weather, overrides).map((id) => BY_ID[id]);
  const requirements = weatherRequirements(
    weather.lowC - comfortOffset(weather),
    weather,
    overrides,
  );
  // More specific requirements replace generic ones in the shopping-free checklist.
  let missing = requirements.filter((r) => !r.check(items));
  if (missing.some((r) => r.key === "lined-bottoms"))
    missing = missing.filter((r) => r.key !== "bottoms");
  if (missing.some((r) => r.key === "boots"))
    missing = missing.filter((r) => r.key !== "covered-shoes");
  if (missing.some((r) => r.key === "warm-base"))
    missing = missing.filter((r) => r.key !== "sleeves");
  if (missing.some((r) => r.key === "winter-base"))
    missing = missing.filter((r) => !["warm-base", "sleeves"].includes(r.key));
  // A closet can have all three categories yet no seasonally usable base/shoes.
  // Explain that shortage instead of sneaking winter items into a summer look.
  const warm = weather.lowC - comfortOffset(weather) >= 22;
  for (const [category, key, label, examples, existing] of [
    [
      "top",
      "seasonal-base",
      warm ? "Light, breathable top" : "A suitable base layer",
      warm ? ["crew-tee", "linen-shirt"] : ["long-sleeve", "knit"],
      ["winter-base", "thermal-base", "warm-base", "sleeves"],
    ],
    [
      "bottom",
      "seasonal-bottoms",
      "Lighter bottoms",
      ["linen-trousers", "cotton-shorts"],
      ["bottoms", "lined-bottoms"],
    ],
    [
      "shoes",
      "seasonal-shoes",
      warm ? "Lighter shoes" : "Everyday shoes",
      ["sneakers", "loafers"],
      ["boots", "covered-shoes"],
    ],
  ]) {
    if (
      !items.some((i) => i.category === category) &&
      !missing.some((r) => existing.includes(r.key))
    )
      missing.push({ key, label, examples, styling: false, seasonal: true });
  }
  return { missing, requirements };
}

// Start with the top's base range, then account for coverage and insulation.
// Full-length bottoms and covered shoes are worth small 1–2 degree steps;
// outer layers supply larger reductions but cannot replace required winter gear.
export function weatherFit(outfit, weather, overrides = {}) {
  const items = outfit.itemIds.map((id) => BY_ID[id]).filter(Boolean);
  const top = items.find((i) => i.category === "top");
  if (!top || !validRange(weather?.lowC, weather?.highC))
    return {
      penalty: Infinity,
      remove: [],
      coldGap: 0,
      hotGap: 0,
      missing: [],
    };
  const offset = comfortOffset(weather),
    low = weather.lowC - offset,
    high = weather.highC - offset;
  const removable = items.filter((i) => i.thermal.removable);
  const lowRules = weatherRequirements(low, weather, overrides),
    highRules = weatherRequirements(high, weather, overrides);
  const assess = (kept, temp) => {
    const base = guideFor(top, overrides);
    const reduction = kept
      .filter((i) => i !== top)
      .reduce((sum, i) => sum + guideFor(i, overrides).insulationC, 0);
    const ventLayers = kept.filter((i) => i.thermal.ventilationC > 0);
    const rangeFlex = kept
      .filter((i) => i !== top && i.thermal.active)
      .reduce((sum, i) => {
        const guide = guideFor(i, overrides);
        return (
          sum + (guide.maxC - guide.minC) - (i.thermal.maxC - i.thermal.minC)
        );
      }, 0);
    const unventedMax = Math.max(
      base.minC - reduction,
      base.maxC - reduction + rangeFlex,
    );
    const ventilation = Math.min(
      6,
      ventLayers.reduce((sum, i) => sum + i.thermal.ventilationC, 0),
    );
    const minC = base.minC - reduction,
      maxC = unventedMax + ventilation;
    const ambientHeat = kept.map((i) => {
      const guide = guideFor(i, overrides);
      if (guide.wearMaxC === null || guide.wearMaxC === undefined) return 0;
      const at = i.archetype === "winter-boots" ? temp + offset : temp;
      return at - (overrides[i.id]?.maxC ?? guide.wearMaxC);
    });
    const coldGap = Math.max(0, minC - temp),
      hotGap = Math.max(0, temp - maxC, ...ambientHeat);
    const missing = (temp === low ? lowRules : highRules).filter(
      (r) => !r.check(kept),
    );
    return {
      minC,
      maxC,
      coldGap,
      hotGap,
      missing,
      vent: temp > unventedMax ? ventLayers.map((i) => i.id) : [],
      penalty:
        coldGap * 4 +
        hotGap * 2 +
        missing.length * 35 +
        (temp > unventedMax ? 0.3 : 0),
    };
  };
  const morning = assess(items, low);
  let best = { ...assess(items, high), remove: [] };
  for (let mask = 1; mask < 2 ** removable.length; mask++) {
    const remove = removable.filter((_, i) => mask & (1 << i)).map((i) => i.id);
    const next = assess(
      items.filter((i) => !remove.includes(i.id)),
      high,
    );
    next.penalty += remove.length * 0.1;
    if (next.penalty < best.penalty) best = { ...next, remove };
  }
  return {
    penalty: morning.penalty + best.penalty + removable.length * 0.1,
    remove: best.remove,
    vent: best.vent,
    coldGap: Math.max(morning.coldGap, best.coldGap),
    hotGap: Math.max(morning.hotGap, best.hotGap),
    afternoonHotGap: best.hotGap,
    missing: morning.missing,
    baseRange: [morning.minC + offset, morning.maxC + offset],
    afternoonRange: [best.minC + offset, best.maxC + offset],
  };
}
const optionalCategory = (i) =>
  ["midlayer", "outerwear", "accessory"].includes(i.category);
function replacePiece(outfit, item) {
  const assigned = assignLayers(outfit.itemIds.map((id) => BY_ID[id]));
  const occupied = isLayer(item)
    ? canFillLayer(item, "midLayer")
      ? assigned.mid
      : assigned.outer
    : null;
  const itemIds = outfit.itemIds.filter((id) => {
    const old = BY_ID[id];
    if (isLayer(item)) return old.id !== occupied?.id && old.id !== item.id;
    return (
      old.category !== item.category ||
      (item.category === "accessory" &&
        old.accessorySlot !== item.accessorySlot)
    );
  });
  itemIds.push(item.id);
  return annotateLook({
    ...outfit,
    itemIds,
    id: [...itemIds].sort().join("|"),
  });
}
export function weatherEssentialIds(outfit, weather, overrides = {}) {
  const full = weatherFit(outfit, weather, overrides);
  return outfit.itemIds
    .filter((id) => optionalCategory(BY_ID[id]))
    .filter((id) => {
      const without = weatherFit(
        { ...outfit, itemIds: outfit.itemIds.filter((x) => x !== id) },
        weather,
        overrides,
      );
      return (
        without.missing.length > full.missing.length ||
        without.coldGap > Math.max(2, full.coldGap + 1)
      );
    });
}
export function weatherCandidates(
  ids,
  profile,
  weather,
  overrides = {},
  occasion = "Everyday",
) {
  // First design complete looks using occasion and taste, with no weather input.
  const drafts = generate(ids, { profile, occasion });
  if (!validRange(weather?.lowC, weather?.highC)) return drafts;
  const pool = weatherPool(ids, weather, overrides).map((id) => BY_ID[id]);
  if (
    ["top", "bottom", "shoes"].some(
      (category) => !pool.some((i) => i.category === category),
    )
  )
    return [];
  const rules = weatherRequirements(
    weather.lowC - comfortOffset(weather),
    weather,
    overrides,
  );
  const valid = (o) => !validity(o, ids).length;
  const fits = new Map();
  const fit = (o) => {
    if (!fits.has(o.id)) fits.set(o.id, weatherFit(o, weather, overrides));
    return fits.get(o.id);
  };
  const choose = (looks, count = 2) =>
    [...new Map(looks.filter(valid).map((o) => [o.id, o])).values()]
      .map((o) => ({ o, fit: fit(o), quality: composition(o).quality }))
      .sort(
        (a, b) =>
          a.fit.missing.length - b.fit.missing.length ||
          (Math.max(0, a.fit.coldGap - 2) + Math.max(0, a.fit.hotGap - 3)) /
            12 -
            (Math.max(0, b.fit.coldGap - 2) + Math.max(0, b.fit.hotGap - 3)) /
              12 +
            b.quality -
            a.quality ||
          a.o.id.localeCompare(b.o.id),
      )
      .slice(0, count)
      .map(({ o }) => o);
  const lanes = new Map();
  for (const o of drafts) {
    const key = `${o.aestheticDirection}|${o.outfitArchetype}|${o.colorStrategy}`;
    if (!lanes.has(key)) lanes.set(key, []);
    lanes.get(key).push(o);
  }
  const seedLanes = [...lanes.values()].map((lane) =>
    lane
      .sort((a, b) => composition(b).quality - composition(a).quality)
      .slice(0, 2),
  );
  // Preserve alternative color intentions through weather adjustment, with a
  // fixed search budget instead of filling every slot with one neutral palette.
  const seeds = [];
  for (let n = 0; n < 2 && seeds.length < 160; n++)
    for (const lane of seedLanes)
      if (lane[n] && seeds.length < 160) seeds.push(lane[n]);
  const output = new Map();
  for (const seed of seeds) {
    const itemIds = seed.itemIds.filter(
      (id) =>
        !optionalCategory(BY_ID[id]) ||
        wearableForWeather(BY_ID[id], weather, overrides),
    );
    let beam = [
      {
        ...seed,
        styleSeedId: seed.id,
        itemIds,
        id: [...itemIds].sort().join("|"),
      },
    ];
    for (const category of ["top", "bottom", "shoes"]) {
      beam = choose(
        beam.flatMap((o) => {
          const original = o.itemIds
            .map((id) => BY_ID[id])
            .find((i) => i.category === category);
          return wearableForWeather(original, weather, overrides)
            ? [o]
            : pool
                .filter((i) => i.category === category)
                .map((i) => replacePiece(o, i));
        }),
      );
    }
    for (const rule of rules) {
      beam = choose(
        beam.flatMap((o) => {
          const items = o.itemIds.map((id) => BY_ID[id]);
          if (rule.check(items)) return [o];
          const satisfied = rules.filter((r) => r.check(items));
          const alternatives = pool
            .map((i) => replacePiece(o, i))
            .filter((next) => {
              const nextItems = next.itemIds.map((id) => BY_ID[id]);
              return (
                rule.check(nextItems) &&
                satisfied.every((r) => r.check(nextItems)) &&
                valid(next)
              );
            });
          return alternatives.length ? alternatives : [o];
        }),
      );
    }
    // More insulation earns a place only when there is an actual cold deficit.
    beam = choose(
      beam.flatMap((o) =>
        fit(o).coldGap <= 2
          ? [o]
          : [
              o,
              ...pool.filter(optionalCategory).map((i) => replacePiece(o, i)),
            ],
      ),
    );
    for (let o of beam) {
      let reduced = true;
      while (reduced) {
        reduced = false;
        for (const id of [...o.itemIds].reverse()) {
          if (!optionalCategory(BY_ID[id])) continue;
          const itemIds = o.itemIds.filter((x) => x !== id);
          const without = { ...o, itemIds, id: [...itemIds].sort().join("|") };
          const fullFit = fit(o),
            lessFit = fit(without);
          if (
            lessFit.missing.length <= fullFit.missing.length &&
            lessFit.coldGap <= Math.max(2, fullFit.coldGap + 1) &&
            lessFit.hotGap <= Math.max(3, fullFit.hotGap) &&
            composition(o).quality - composition(without).quality < 0.018
          ) {
            o = without;
            reduced = true;
            break;
          }
        }
      }
      o = annotateLook(
        {
          ...o,
          requiredForWeather: weatherEssentialIds(o, weather, overrides),
        },
        occasion,
      );
      if (
        valid(o) &&
        o.itemIds.every((id) =>
          wearableForWeather(BY_ID[id], weather, overrides),
        )
      )
        output.set(o.id, o);
    }
  }
  return [...output.values()];
}
export function rankForWeather(
  candidates,
  profile,
  weather,
  overrides = {},
  occasion = "Everyday",
  options = {},
) {
  if (!validRange(weather?.lowC, weather?.highC))
    return rank(candidates, profile, occasion, options);
  const eligible = candidates
    .filter((o) => !validity(o).length)
    .filter((o) =>
      o.itemIds.every((id) =>
        wearableForWeather(BY_ID[id], weather, overrides),
      ),
    )
    .map((o) => ({
      ...o,
      requiredForWeather: weatherEssentialIds(o, weather, overrides),
      weatherFit: weatherFit(o, weather, overrides),
    }))
    .filter(
      (o) =>
        !o.weatherFit.missing.some((r) =>
          ["winter-base", "thermal-base"].includes(r.key),
        ),
    );
  if (!eligible.length) return [];
  // Protect against cold, but don't let fractional temperature arithmetic
  // decide which of two comfortable outfits is aesthetically better.
  const missing = Math.min(...eligible.map((o) => o.weatherFit.missing.length));
  const covered = eligible.filter(
    (o) => o.weatherFit.missing.length === missing,
  );
  const discomfort = (o) =>
    Math.max(0, o.weatherFit.coldGap - 2) +
    Math.max(0, o.weatherFit.hotGap - 3);
  const best = Math.min(...covered.map(discomfort));
  let suitable = covered.filter((o) => discomfort(o) <= best + 1);
  // On an all-day warm forecast, avoid introducing an unnecessary coat just
  // to satisfy a silhouette recipe. Respect personal temperature offsets.
  if (weather.lowC - comfortOffset(weather) >= 22) {
    const light = suitable.filter(
      (o) => !assignLayers(o.itemIds.map((id) => BY_ID[id])).outer,
    );
    if (light.length) suitable = light;
  }
  // Never trade away temperature suitability just to obtain a nicer palette.
  return rank(suitable, profile, occasion, options);
}
export function weatherReason(outfit, weather, overrides = {}) {
  if (!outfit) return "";
  const fit = weatherFit(outfit, weather, overrides);
  const names = (ids) =>
    ids.map((id) => BY_ID[id].name.toLowerCase()).join(" + ");
  if (fit.missing.length)
    return `You may feel cold at ${temperature(weather.lowC, weather.unit)}. For more warmth, add ${fit.missing.map((r) => r.label.toLowerCase()).join(", ")}.`;
  if (fit.coldGap > 2)
    return `You may still feel cold at ${temperature(weather.lowC, weather.unit)} in these layers. ${assignLayers(outfit.itemIds.map((id) => BY_ID[id])).mid ? "More insulating versions of your coat or base layers would help." : "An insulating midlayer would help retain more warmth."}`;
  if (fit.hotGap > 3)
    return `These pieces cover the required areas, but may feel too warm at ${temperature(fit.afternoonHotGap > 3 ? weather.highC : weather.lowC, weather.unit)}; a lighter base or lighter bottoms would help.`;
  const top = outfit.itemIds.find((id) => BY_ID[id].category === "top");
  const kept = outfit.itemIds.filter(
    (id) =>
      !fit.remove.includes(id) &&
      ["top", "midlayer", "outerwear"].includes(BY_ID[id].category),
  );
  const layers = outfit.itemIds.filter((id) =>
    ["midlayer", "outerwear"].includes(BY_ID[id].category),
  );
  const personal =
    weather.comfort === "custom"
      ? `You prefer a big coat at or below ${temperature(weather.coatBelowC, weather.unit)}, so `
      : weather.comfort === "cold"
        ? "Since you feel cold easily, "
        : weather.comfort === "warm"
          ? "Since you run warm, "
          : "For today, ";
  const bottom = outfit.itemIds.find((id) => BY_ID[id].category === "bottom");
  const afternoon = fit.remove.length
    ? `remove ${names(fit.remove)} at ${temperature(weather.highC, weather.unit)} and keep ${names(kept)}`
    : `keep the same layers through the ${temperature(weather.highC, weather.unit)} high`;
  return `${personal}${names([top, ...layers])} with ${names([bottom])} handles the ${temperature(weather.lowC, weather.unit)} low; ${afternoon}${fit.vent.length ? `, opening the ${names(fit.vent)} for ventilation` : ""}.`;
}
