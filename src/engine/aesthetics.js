import { canFillLayer } from "../data/layers.js";
import { COLOR_METADATA } from "../data/styling.js";
export const clamp = (n) => Math.max(0, Math.min(1, n));
const mean = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
export function proportionScore(items) {
  const top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom");
  if (!top || !bottom) return 0.5;
  if (top.length === "cropped")
    return { high: 0.96, mid: 0.83, low: 0.62 }[bottom.rise] ?? 0.78;
  if (top.length === "waist") return bottom.rise === "high" ? 0.92 : 0.85;
  if (top.length === "long") return bottom.volume >= 4 ? 0.62 : 0.8;
  return bottom.rise === "high" && bottom.volume >= 4 ? 0.75 : 0.84;
}
export function visualWeightScore(items) {
  const uppers = items.filter((i) =>
    ["top", "midlayer", "outerwear"].includes(i.category),
  );
  const bottom = items.find((i) => i.category === "bottom"),
    shoes = items.find((i) => i.category === "shoes");
  if (!uppers.length || !bottom || !shoes) return 0.5;
  const weight = (i) => (i.visualWeight + i.volume + i.bulk) / 3;
  const upper = Math.max(...uppers.map(weight));
  const ground = weight(bottom) * 0.7 + weight(shoes) * 0.3;
  return clamp(
    0.92 -
      Math.max(0, upper - ground - 0.7) * 0.22 -
      Math.max(0, ground - upper - 2) * 0.06,
  );
}
// Related style families allow deliberate bridges (e.g. tailoring + minimal),
// instead of requiring every piece to share exactly the same tag.
const families = [
  ["minimal", "smart-casual", "preppy"],
  ["casual", "streetwear", "sporty"],
  ["edgy", "streetwear"],
  ["feminine", "preppy", "smart-casual"],
];
export function styleCoherenceScore(items) {
  const body = items.filter((i) => i.category !== "accessory");
  const affinity = (a, b) =>
    a.styleTags.some((t) => b.styleTags.includes(t))
      ? 1
      : families.some(
            (f) =>
              a.styleTags.some((t) => f.includes(t)) &&
              b.styleTags.some((t) => f.includes(t)),
          )
        ? 0.65
        : 0.15;
  const pairs = [];
  for (let a = 0; a < body.length; a++)
    for (let b = a + 1; b < body.length; b++)
      pairs.push(affinity(body[a], body[b]));
  return clamp(0.3 + mean(pairs) * 0.7);
}
export function thermalCoherenceScore(items, occasion = "Everyday") {
  const top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom"),
    shoes = items.find((i) => i.category === "shoes");
  if (!top || !bottom || !shoes) return 0.5;
  const layers = items.filter((i) =>
    ["outerwear", "midlayer"].includes(i.category),
  );
  const warmest = Math.max(top.warmth, ...layers.map((i) => i.warmth));
  const exposurePenalty =
    warmest >= 3
      ? Math.max(0, top.exposure - 2) * 0.14 +
        Math.max(0, bottom.exposure - 2) * 0.14
      : 0;
  const imbalance =
    Math.max(0, warmest - bottom.warmth - 1.5) * 0.1 +
    Math.max(0, shoes.warmth - top.warmth - 2) * 0.12;
  const summerBase = warmest >= 3 && top.warmth === 0 ? 0.12 : 0;
  const tolerance =
    { "Going out": 0.5, Date: 0.7, Work: 1, Everyday: 1, Comfy: 0.95 }[
      occasion
    ] ?? 1;
  return clamp(0.95 - (exposurePenalty + imbalance + summerBase) * tolerance);
}
export function focalHierarchyScore(items) {
  const salience = items
    .map((i) => {
      const small = i.category === "accessory" || i.category === "shoes";
      return Math.min(
        1,
        Math.max(
          0,
          (i.colorSpec ?? COLOR_METADATA[i.color]).saturation - 0.25,
        ) *
          (small ? 0.95 : 1.4) +
          (i.volume >= 4 ? (i.category === "bottom" ? 0.18 : 0.32) : 0) +
          (i.texture !== "smooth" ? 0.18 : 0) +
          (i.visualWeight >= 4 ? 0.18 : 0) +
          (i.length === "long" && canFillLayer(i, "outerLayer") ? 0.12 : 0),
      );
    })
    .sort((a, b) => b - a);
  const heroes = salience.filter((v) => v >= 0.6).length;
  if (heroes > 1) return clamp(0.75 - (heroes - 1) * 0.2);
  if (heroes === 1)
    return clamp(
      0.84 + Math.min(0.14, (salience[0] - (salience[1] ?? 0)) * 0.3),
    );
  // Quiet outfits can still be intentional through proportion or texture.
  return (salience[0] ?? 0) >= 0.25 ? 0.83 : 0.7;
}
export function aestheticScores(items, occasion) {
  return {
    proportion: proportionScore(items),
    visualWeight: visualWeightScore(items),
    styleCoherence: styleCoherenceScore(items),
    thermalCoherence: thermalCoherenceScore(items, occasion),
    focalHierarchy: focalHierarchyScore(items),
  };
}
