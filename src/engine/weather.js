import { BY_ID } from "../data/catalog.js";
import { generate, score, validity } from "./wardrobe.js";

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

export function weatherRequirements(temp, weather, overrides = {}) {
  const rules = [];
  const add = (key, label, examples, check) =>
    rules.push({ key, label, examples, check });
  const has = (items, category, predicate = () => true) =>
    items.some((i) => i.category === category && predicate(i));
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
        has(
          items,
          "midlayer",
          (i) => guideFor(i, overrides).insulationC >= 3,
        ) ||
        has(
          items,
          "outerwear",
          (i) => guideFor(i, overrides).insulationC >= 10,
        ),
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
  if (temp < 0)
    add("coat", "Insulated winter coat", ["long-puffer", "parka"], (items) =>
      has(items, "outerwear", (i) => i.thermal.winterLevel >= 2),
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
  const items = ids.map((id) => BY_ID[id]).filter(Boolean);
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
    const coldGap = Math.max(0, minC - temp),
      hotGap = Math.max(0, temp - maxC);
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
export function weatherCandidates(ids) {
  const candidates = generate(ids);
  const all = new Map(candidates.map((o) => [o.id, o]));
  const extras = ["scarf", "beanie", "gloves"]
    .map((key) => ids.find((id) => BY_ID[id]?.archetype === key))
    .filter(Boolean);
  for (const outfit of candidates) {
    for (let count = 0; count <= extras.length; count++) {
      const bundle = extras.slice(0, count);
      const itemIds = [
        ...outfit.itemIds.filter((id) => BY_ID[id].category !== "accessory"),
        ...bundle,
      ];
      const next = { id: [...itemIds].sort().join("|"), itemIds };
      if (!validity(next, ids).length) all.set(next.id, next);
    }
  }
  return [...all.values()];
}
export function rankForWeather(
  candidates,
  profile,
  weather,
  overrides = {},
  occasion = "Everyday",
) {
  if (!validRange(weather?.lowC, weather?.highC)) return candidates;
  return candidates
    .map((o) => ({ ...o, weatherFit: weatherFit(o, weather, overrides) }))
    .sort(
      (a, b) =>
        a.weatherFit.penalty -
          score(a, profile, occasion) * 2 -
          (b.weatherFit.penalty - score(b, profile, occasion) * 2) ||
        a.id.localeCompare(b.id),
    );
}
export function weatherReason(outfit, weather, overrides = {}) {
  if (!outfit) return "";
  const fit = weatherFit(outfit, weather, overrides);
  const names = (ids) =>
    ids.map((id) => BY_ID[id].name.toLowerCase()).join(" + ");
  if (fit.missing.length)
    return `This look is incomplete for the ${temperature(weather.lowC, weather.unit)} low: it still needs ${fit.missing.map((r) => r.label.toLowerCase()).join(", ")}.`;
  if (fit.coldGap > 2)
    return `These are your warmest available layers for ${temperature(weather.lowC, weather.unit)}, but their estimated coverage is still too light; add a thermal base, warmer midlayer or insulated coat.`;
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
