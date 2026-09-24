import { BY_ID } from "../data/catalog.js";
import { features, visualInterest } from "./features.js";
import { preferenceScore, learn } from "./profile.js";
import { validity } from "./compatibility.js";
import { palette } from "./palette.js";
import { objective } from "./occasions.js";
export const clamp = (n) => Math.max(0, Math.min(1, n));
const mean = (xs) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const near = (value, target) => clamp(1 - Math.abs(value - target));
export function silhouetteScore(items, profile = {}) {
  const top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom");
  if (!top || !bottom) return 0;
  let prior = 0.76;
  if (top.volume >= 4 && bottom.volume <= 2) prior = 0.9;
  if ((top.volume <= 1 || top.length === "cropped") && bottom.volume >= 4)
    prior = 0.94;
  if (top.volume <= 1 && bottom.volume === 2) prior = 0.88;
  if (top.volume >= 3 && bottom.volume >= 3) prior = 0.64;
  if (top.volume <= 1 && bottom.volume <= 1) prior = 0.66;
  const preference =
    top.volume >= 3 && bottom.volume >= 3
      ? profile.weights?.volume
      : top.volume <= 1 && bottom.volume <= 1
        ? profile.weights?.fittedPair
        : 0;
  return clamp(prior + Math.max(0, preference ?? 0) * 0.48);
}
export function layeringScore(items) {
  const stack = ["top", "midlayer", "outerwear"]
    .map((c) => items.find((i) => i.category === c))
    .filter(Boolean);
  if (stack.length === 1) return 0.84;
  const lengths = { cropped: 0, waist: 1, hip: 2, long: 3 };
  const scores = stack.slice(1).map((outer, i) => {
    const inner = stack[i],
      room = outer.layerCapacity - inner.bulk;
    const reveal = lengths[inner.length] - lengths[outer.length];
    const weightContrast = Math.abs(outer.visualWeight - inner.visualWeight);
    return clamp(
      0.79 +
        (room >= 1 ? 0.06 : -0.05) +
        (inner.length === "cropped" && outer.volume >= 3 ? 0.08 : 0) +
        (inner.structure !== outer.structure ? 0.04 : 0) +
        (weightContrast >= 1 ? 0.03 : 0) -
        (reveal > 1 ? 0.14 : 0),
    );
  });
  return clamp(mean(scores) - Math.max(0, stack.length - 2) * 0.04);
}
export function clothingQualities(items) {
  const body = items.filter((i) => i.category !== "accessory");
  const top = items.find((i) => i.category === "top"),
    bottom = items.find((i) => i.category === "bottom"),
    shoes = items.find((i) => i.category === "shoes");
  const softness = mean(
    body.map((i) => ({ soft: 1, medium: 0.65, structured: 0.35 })[i.structure]),
  );
  const ease = mean(
    [top, bottom]
      .filter(Boolean)
      .map((i) => (i.volume >= 3 ? 0.95 : i.volume === 2 ? 0.8 : 0.58)),
  );
  // Low formality does not make a heavy insulated boot an easy indoor shoe.
  const easyShoes = shoes
    ? clamp(1 - (shoes.visualWeight - 1) * 0.1 - (shoes.bulk - 1) * 0.08)
    : 0;
  const formality = mean(body.map((i) => (i.formality - 1) / 4));
  const structure = mean(
    body.map((i) => ({ soft: 0.25, medium: 0.6, structured: 1 })[i.structure]),
  );
  const coverage = mean(
    [top, bottom].filter(Boolean).map((i) => 1 - (i.exposure - 1) / 4),
  );
  const gym = mean(
    body.map((i) => +(i.styleTags.includes("sporty") && i.formality <= 1)),
  );
  const comfort = clamp(
    0.38 * softness +
      0.3 * ease +
      0.22 * easyShoes +
      0.1 -
      Math.max(0, body.length - 4) * 0.04,
  );
  const polish = clamp(
    0.55 * formality +
      0.3 * structure +
      0.15 * (shoes ? (shoes.formality - 1) / 4 : 0),
  );
  return {
    softness,
    ease,
    easyShoes,
    formality,
    structure,
    coverage,
    gym,
    comfort,
    polish,
  };
}
export function scoreBreakdown(
  outfit,
  profile = learn([]),
  occasion = "Everyday",
  options = {},
) {
  const errors = validity(outfit);
  if (errors.length)
    return { valid: false, total: 0, rules: errors, scores: {}, weights: {} };
  const items = outfit.itemIds.map((id) => BY_ID[id]);
  const plan = objective(occasion, options.refinement);
  const color = palette(outfit, profile),
    qualities = clothingQualities(items),
    f = features(outfit);
  const intensity = visualInterest(items, color);
  const learnedInterest =
    (profile.weights?.interest ?? 0) - (profile.weights?.lowComplexity ?? 0);
  const targetInterest = clamp(plan.targetInterest + learnedInterest * 0.22);
  const targetFormality = clamp(
    plan.targetFormality +
      ((profile.weights?.dressy ?? 0) - (profile.weights?.casual ?? 0)) * 0.12,
  );
  const silhouette = silhouetteScore(items, profile);
  const layering = clamp(layeringScore(items) + plan.layerBonus * f.layered);
  const formalityFit = near(qualities.formality, targetFormality);
  let occasionScore;
  if (occasion === "Work")
    occasionScore =
      0.28 * qualities.polish +
      0.18 * qualities.structure +
      0.2 * qualities.coverage +
      0.18 * formalityFit +
      0.1 * qualities.comfort +
      0.06 * (1 - qualities.gym);
  else if (occasion === "Date")
    occasionScore =
      0.32 * formalityFit +
      0.26 * qualities.polish +
      0.25 * near(intensity, targetInterest) +
      0.17 * qualities.comfort;
  else if (occasion === "Going out")
    occasionScore =
      0.35 * near(intensity, targetInterest) +
      0.25 * formalityFit +
      0.2 * silhouette +
      0.2 * Math.max(f.contrast, f.layered, f.balanced, f.volume, 0.5);
  else if (occasion === "Comfy")
    occasionScore =
      0.55 * qualities.comfort + 0.25 * qualities.softness + 0.2 * formalityFit;
  else
    occasionScore =
      0.45 * qualities.comfort + 0.3 * formalityFit + 0.25 * color.score;
  if (
    options.refinement === "More casual" ||
    options.refinement === "More dressy"
  )
    occasionScore = 0.25 * occasionScore + 0.75 * formalityFit;
  const scores = {
    silhouette,
    layering,
    color: color.score,
    interest: near(intensity, targetInterest),
    occasion: clamp(occasionScore),
    comfort: qualities.comfort,
    personal: preferenceScore(outfit, profile),
  };
  const total = Object.entries(plan.weights).reduce(
    (sum, [k, w]) => sum + scores[k] * w,
    0,
  );
  const rules = [
    `Silhouette prior ${silhouette.toFixed(2)}; learned preferences can lift defined or roomy pairings`,
    items.filter((i) => ["midlayer", "outerwear"].includes(i.category)).length
      ? "Layer capacity, length and weight checked"
      : "Simple layering; no extra-layer bonus",
    `${color.dominantCount} dominant colors; ${color.label.toLowerCase()}`,
    `${occasion}: interest target ${targetInterest.toFixed(2)}, formality target ${targetFormality.toFixed(2)}`,
  ];
  return {
    valid: true,
    total: clamp(total),
    scores,
    weights: plan.weights,
    metrics: {
      ...qualities,
      interest: intensity,
      targetInterest,
      targetFormality,
      dominantColors: color.dominantCount,
    },
    rules,
  };
}
export const score = (outfit, profile, occasion, options) =>
  scoreBreakdown(outfit, profile, occasion, options).total;
