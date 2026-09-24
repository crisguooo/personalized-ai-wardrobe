import { BY_ID } from "../data/catalog.js";
import { generate, score, validity } from "./wardrobe.js";

export const today = () => new Date().toLocaleDateString("en-CA");
export const toC = (value, unit) =>
  unit === "F" ? ((value - 32) * 5) / 9 : value;
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
export const guideFor = (item, overrides = {}) => ({
  ...item.thermal,
  ...overrides[item.id],
});

// Compare both ends of the day. Removable layers can be left off at the high.
export function weatherFit(outfit, weather, overrides = {}) {
  const items = outfit.itemIds.map((id) => BY_ID[id]);
  const offset = comfortOffset(weather);
  const low = weather.lowC - offset,
    high = weather.highC - offset;
  const top = items.find((i) => i.category === "top");
  if (!top || !validRange(weather.lowC, weather.highC))
    return { penalty: Infinity, remove: [], coldGap: 0, hotGap: 0 };
  const removable = items.filter((i) => i.thermal.removable);
  const assess = (kept, temp) => {
    const layers = kept.filter((i) => i.thermal.removable);
    const guide = guideFor(top, overrides);
    const insulation = layers.reduce(
      (sum, i) => sum + guideFor(i, overrides).insulationC,
      0,
    );
    let coldGap = Math.max(0, guide.minC - insulation - temp);
    let hotGap = Math.max(0, temp - (guide.maxC - insulation));
    let penalty = coldGap * 4 + hotGap * 3;
    if (
      weather.comfort === "custom" &&
      temp + offset <= weather.coatBelowC &&
      !kept.some((i) => i.category === "outerwear" && i.warmth >= 3)
    )
      penalty += 8;
    for (const item of kept.filter(
      (i) => i !== top && guideFor(i, overrides).active,
    )) {
      const range = guideFor(item, overrides);
      const cold = Math.max(0, range.minC - temp),
        hot = Math.max(0, temp - range.maxC);
      penalty += (cold * 2 + hot * 1.5) * (item.thermal.removable ? 0.45 : 1);
      if (!item.thermal.removable) {
        coldGap = Math.max(coldGap, cold);
        hotGap = Math.max(hotGap, hot);
      }
    }
    return { penalty, coldGap, hotGap };
  };
  const morning = assess(items, low);
  // A small neck-coverage preference on chilly mornings, without inferring wind.
  if (!items.some((i) => i.archetype === "scarf"))
    morning.penalty += Math.min(3, Math.max(0, 10 - low) * 0.75);
  for (const item of removable) {
    const range = guideFor(item, overrides);
    morning.penalty += Math.abs(low - (range.minC + range.maxC) / 2) * 0.04;
  }
  let best = { ...assess(items, high), remove: [] };
  for (let mask = 1; mask < 2 ** removable.length; mask++) {
    const remove = removable.filter((_, i) => mask & (1 << i)).map((i) => i.id);
    const next = assess(
      items.filter((i) => !remove.includes(i.id)),
      high,
    );
    // Mild preference for fewer changes when both options are equally comfortable.
    next.penalty += remove.length * 0.15;
    if (next.penalty < best.penalty) best = { ...next, remove };
  }
  // A layer is useful when the low is close to the base's lower comfort edge.
  const reserve = Math.max(
    0,
    guideFor(top, overrides).minC +
      2 -
      low -
      removable.reduce((n, i) => n + guideFor(i, overrides).insulationC, 0),
  );
  return {
    penalty:
      morning.penalty + best.penalty + reserve * 0.5 + removable.length * 0.25,
    remove: best.remove,
    coldGap: Math.max(morning.coldGap, best.coldGap),
    hotGap: Math.max(morning.hotGap, best.hotGap),
  };
}
export function weatherCandidates(ids) {
  const candidates = generate(ids);
  const scarves = ids.filter((id) => BY_ID[id]?.archetype === "scarf");
  const all = new Map(candidates.map((o) => [o.id, o]));
  for (const outfit of candidates) {
    for (const scarf of scarves) {
      const itemIds = [
        ...outfit.itemIds.filter((id) => BY_ID[id].category !== "accessory"),
        scarf,
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
  const layers = outfit.itemIds.filter((id) => BY_ID[id].thermal.removable);
  const base = outfit.itemIds.find((id) => BY_ID[id].category === "top");
  const personal =
    weather.comfort === "cold"
      ? "you tend to feel cold, so "
      : weather.comfort === "warm"
        ? "you tend to run warm, so "
        : weather.comfort === "custom"
          ? `you prefer a big coat at or below ${temperature(weather.coatBelowC, weather.unit)}, so `
          : "";
  const morning = layers.length
    ? `wear the ${names(layers)} for warmth at ${temperature(weather.lowC, weather.unit)}`
    : `the ${names([base])} keeps the outfit simple for ${temperature(weather.lowC, weather.unit)}`;
  const afternoon = fit.remove.length
    ? `remove the ${names(fit.remove)} at ${temperature(weather.highC, weather.unit)} and keep the ${names([base, ...layers.filter((id) => !fit.remove.includes(id))])}`
    : `keep this combination through the ${temperature(weather.highC, weather.unit)} high`;
  if (fit.coldGap > 3)
    return `From your current closet, this is a closest match for ${temperature(weather.lowC, weather.unit)}–${temperature(weather.highC, weather.unit)}, but it may still feel too cold; add warmer coverage or adjust your piece guides.`;
  if (fit.hotGap > 3)
    return `This is a closest match from your closet, but even with removable layers off it may feel too warm at ${temperature(weather.highC, weather.unit)}; try a lighter base or adjust your piece guides.`;
  return `${personal ? personal[0].toUpperCase() + personal.slice(1) : "For today, "}${morning}; ${afternoon}.`;
}
